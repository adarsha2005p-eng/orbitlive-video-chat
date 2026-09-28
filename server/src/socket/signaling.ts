import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { matchmakingService } from '../services/matchmaking.service';
import { RedisQueue } from '../utils/redis';
import prisma from '../utils/prisma';
import {
  QueueUser,
  SignalOfferPayload,
  SignalAnswerPayload,
  SignalIceCandidatePayload,
  ChatMessagePayload,
  ReportPayload,
} from '../types';

export function setupSignaling(io: SocketIOServer) {
  // Broadcast live online count to all connected clients
  const broadcastOnlineCount = async () => {
    try {
      const count = await RedisQueue.getOnlineCount();
      io.emit('online_count', { count: Math.max(count, io.engine.clientsCount) });
    } catch {
      io.emit('online_count', { count: io.engine.clientsCount });
    }
  };

  io.on('connection', async (socket: Socket) => {
    const socketId = socket.id;
    let currentUserData: QueueUser | null = null;

    // Track online state
    await RedisQueue.setOnline(socketId);
    broadcastOnlineCount();

    // 1. Join Matchmaking Queue
    socket.on('join_queue', async (data: {
      userId: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      country?: string;
      language?: string;
      interests?: string[];
    }) => {
      try {
        currentUserData = {
          socketId,
          userId: data.userId || `guest_${socketId.slice(0, 6)}`,
          username: data.username || `User_${socketId.slice(0, 5)}`,
          displayName: data.displayName || data.username || `User_${socketId.slice(0, 5)}`,
          avatarUrl: data.avatarUrl,
          country: data.country || 'Worldwide',
          language: data.language || 'English',
          interests: data.interests || [],
          joinedAt: Date.now(),
        };

        const matchResult = await matchmakingService.enqueue(
          currentUserData,
          (sId) => io.sockets.sockets.has(sId)
        );

        if (matchResult) {
          const { peer, sessionId } = matchResult;

          // Notify User A (initiator: starts WebRTC offer)
          socket.emit('match_found', {
            sessionId,
            isInitiator: true,
            peer: {
              userId: peer.userId,
              username: peer.username,
              displayName: peer.displayName,
              country: peer.country,
              avatarUrl: peer.avatarUrl,
            },
          });

          // Notify User B (receiver: waits for WebRTC offer and sends answer)
          io.to(peer.socketId).emit('match_found', {
            sessionId,
            isInitiator: false,
            peer: {
              userId: currentUserData.userId,
              username: currentUserData.username,
              displayName: currentUserData.displayName,
              country: currentUserData.country,
              avatarUrl: currentUserData.avatarUrl,
            },
          });

          // Also record session in database asynchronously if Prisma is connected
          if (prisma) {
            prisma.session.create({
              data: {
                id: sessionId,
                userAId: currentUserData.userId,
                userBId: peer.userId,
                status: 'ACTIVE',
              },
            }).catch(() => {
              // Ignore if users are non-persisted guests
            });
          }
        } else {
          socket.emit('waiting_in_queue', {
            message: 'Finding someone from around the world...',
          });
        }
      } catch (err) {
        console.error('[Signaling] Error joining queue:', err);
        socket.emit('error_message', { message: 'Failed to enter matchmaking queue. Retrying...' });
      }
    });

    // 2. Leave Queue
    socket.on('leave_queue', async () => {
      await matchmakingService.dequeue(socketId);
      socket.emit('left_queue');
    });

    // 3. WebRTC Signal: Offer
    socket.on('signal_offer', (data: SignalOfferPayload) => {
      const session = matchmakingService.getSession(data.sessionId);
      if (!session) {
        socket.emit('session_stale', { message: 'Session no longer active' });
        return;
      }

      const recipientSocketId =
        session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;

      io.to(recipientSocketId).emit('signal_offer', {
        sessionId: data.sessionId,
        sdp: data.sdp,
      });
    });

    // 4. WebRTC Signal: Answer
    socket.on('signal_answer', (data: SignalAnswerPayload) => {
      const session = matchmakingService.getSession(data.sessionId);
      if (!session) {
        socket.emit('session_stale', { message: 'Session no longer active' });
        return;
      }

      const recipientSocketId =
        session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;

      io.to(recipientSocketId).emit('signal_answer', {
        sessionId: data.sessionId,
        sdp: data.sdp,
      });
    });

    // 5. WebRTC Signal: ICE Candidate
    socket.on('signal_ice_candidate', (data: SignalIceCandidatePayload) => {
      const session = matchmakingService.getSession(data.sessionId);
      if (!session) return;

      const recipientSocketId =
        session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;

      io.to(recipientSocketId).emit('signal_ice_candidate', {
        sessionId: data.sessionId,
        candidate: data.candidate,
      });
    });

    // 6. In-Call Chat Message
    socket.on('send_chat_message', (data: { sessionId: string; text: string }) => {
      const session = matchmakingService.getSession(data.sessionId);
      if (!session) return;

      const text = data.text?.trim();
      if (!text || text.length > 500) return;

      const sender = session.userA.socketId === socketId ? session.userA : session.userB;

      const messagePayload: ChatMessagePayload = {
        sessionId: data.sessionId,
        id: uuidv4(),
        senderId: sender.userId,
        senderName: sender.displayName,
        text,
        timestamp: Date.now(),
      };

      // Broadcast to both peers in this session
      io.to(session.userA.socketId).emit('chat_message', messagePayload);
      io.to(session.userB.socketId).emit('chat_message', messagePayload);
    });

    // 7. Next: Disconnect from current peer and immediately re-enter matchmaking queue
    socket.on('next', async () => {
      const session = matchmakingService.endSessionBySocket(socketId);
      if (session) {
        const otherSocketId =
          session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;
        io.to(otherSocketId).emit('peer_disconnected', {
          reason: 'stranger_skipped',
          message: 'Your stranger clicked Next.',
        });
      }

      if (currentUserData) {
        socket.emit('waiting_in_queue', {
          message: 'Finding someone new...',
        });

        const matchResult = await matchmakingService.enqueue(
          currentUserData,
          (sId) => io.sockets.sockets.has(sId)
        );
        if (matchResult) {
          const { peer, sessionId } = matchResult;

          socket.emit('match_found', {
            sessionId,
            isInitiator: true,
            peer: {
              userId: peer.userId,
              username: peer.username,
              displayName: peer.displayName,
              country: peer.country,
              avatarUrl: peer.avatarUrl,
            },
          });

          io.to(peer.socketId).emit('match_found', {
            sessionId,
            isInitiator: false,
            peer: {
              userId: currentUserData.userId,
              username: currentUserData.username,
              displayName: currentUserData.displayName,
              country: currentUserData.country,
              avatarUrl: currentUserData.avatarUrl,
            },
          });
        }
      }
    });

    // 8. End Call
    socket.on('end_call', () => {
      const session = matchmakingService.endSessionBySocket(socketId);
      if (session) {
        const otherSocketId =
          session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;
        io.to(otherSocketId).emit('call_ended', {
          message: 'Your stranger ended the call.',
        });
        socket.emit('call_ended', {
          message: 'Call ended.',
        });
      }
    });

    // 9. Block User
    socket.on('block_user', async (data: { blockedUserId: string; blockerUserId?: string }) => {
      const blockerId = data.blockerUserId || currentUserData?.userId;
      if (!blockerId || !data.blockedUserId) return;

      // Add to Redis block set
      await RedisQueue.addBlock(blockerId, data.blockedUserId);

      // Save to database if available
      if (prisma) {
        prisma.block.upsert({
          where: {
            blockerId_blockedId: {
              blockerId,
              blockedId: data.blockedUserId,
            },
          },
          create: {
            blockerId,
            blockedId: data.blockedUserId,
          },
          update: {},
        }).catch(() => {});
      }

      // End current call
      const session = matchmakingService.endSessionBySocket(socketId);
      if (session) {
        const otherSocketId =
          session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;
        io.to(otherSocketId).emit('call_ended', {
          message: 'Connection closed.',
        });
      }

      socket.emit('user_blocked', { success: true });
    });

    // 10. Report User
    socket.on('report_user', async (data: ReportPayload) => {
      if (!currentUserData || !data.reportedUserId || !data.reason) return;

      if (prisma) {
        prisma.report.create({
          data: {
            reporterId: currentUserData.userId,
            reportedUserId: data.reportedUserId,
            sessionId: data.sessionId,
            reason: data.reason,
            details: data.details || '',
            status: 'PENDING',
          },
        }).catch(() => {});
      }

      socket.emit('report_submitted', {
        message: 'Report received. Thank you for helping keep the community safe.',
      });
    });

    // 11. Disconnect
    socket.on('disconnect', async () => {
      const session = await matchmakingService.cleanupSocket(socketId);
      if (session) {
        const otherSocketId =
          session.userA.socketId === socketId ? session.userB.socketId : session.userA.socketId;
        io.to(otherSocketId).emit('peer_disconnected', {
          reason: 'disconnected',
          message: 'Your stranger disconnected.',
        });
      }

      await RedisQueue.removeOnline(socketId, currentUserData?.userId);
      broadcastOnlineCount();
    });
  });
}
