import { v4 as uuidv4 } from 'uuid';
import { QueueUser, ActiveSession } from '../types';
import { RedisQueue } from '../utils/redis';

export class MatchmakingService {
  private activeSessions: Map<string, ActiveSession> = new Map(); // sessionId -> ActiveSession
  private socketToSession: Map<string, string> = new Map(); // socketId -> sessionId

  /**
   * Adds a user to the matchmaking queue and attempts to find an immediate match.
   */
  async enqueue(
    user: QueueUser,
    isSocketActive?: (socketId: string) => boolean
  ): Promise<{
    peer: QueueUser;
    sessionId: string;
    isInitiator: boolean;
  } | null> {
    // 1. Check if an active session already exists for this socket; if so, close it
    await this.cleanupSocket(user.socketId);

    // 2. Search existing queue for an eligible match
    const candidates = await RedisQueue.getFullQueue();

    let matchedCandidate: QueueUser | null = null;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];

      // Prune dead/disconnected candidate sockets
      if (isSocketActive && !isSocketActive(candidate.socketId)) {
        await RedisQueue.removeFromQueue(candidate.socketId);
        continue;
      }

      // Rule A: Do not match user with themselves
      if (candidate.userId === user.userId || candidate.socketId === user.socketId) {
        continue;
      }

      // Rule B: Check if users are blocked
      const isBlocked = await RedisQueue.isBlocked(user.userId, candidate.userId);
      if (isBlocked) {
        continue;
      }

      // Rule C: Avoid immediately rematching the same two users
      const isRecent = await RedisQueue.isRecentMatch(user.userId, candidate.userId);
      if (isRecent && candidates.length > 2) {
        // If there are other people waiting, skip recent matches
        continue;
      }

      // Rule D: Optional Filter compatibility scoring (extensible for Country / Language / Interests)
      // If either user has specific filters, we can rank candidates.
      // For MVP random matching, first eligible candidate is accepted.
      matchedCandidate = candidate;
      break;
    }

    if (matchedCandidate) {
      // Remove candidate from the queue
      await RedisQueue.removeFromQueue(matchedCandidate.socketId);

      // Create new session
      const sessionId = uuidv4();
      const session: ActiveSession = {
        sessionId,
        userA: user,           // User A will be initiator (sends offer)
        userB: matchedCandidate, // User B will wait for offer and answer
        createdAt: Date.now(),
      };

      this.activeSessions.set(sessionId, session);
      this.socketToSession.set(user.socketId, sessionId);
      this.socketToSession.set(matchedCandidate.socketId, sessionId);

      // Record recent match cooldown (60 seconds)
      await RedisQueue.recordRecentMatch(user.userId, matchedCandidate.userId, 60);

      return {
        peer: matchedCandidate,
        sessionId,
        isInitiator: true,
      };
    }

    // No immediate match found: place user into the queue
    await RedisQueue.addToQueue(user);
    return null;
  }

  /**
   * Removes user from queue (e.g. if cancelled or closed)
   */
  async dequeue(socketId: string): Promise<void> {
    await RedisQueue.removeFromQueue(socketId);
  }

  /**
   * Retrieves active session by its ID
   */
  getSession(sessionId: string): ActiveSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Retrieves active session for a specific socket
   */
  getSessionBySocketId(socketId: string): ActiveSession | undefined {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return undefined;
    return this.activeSessions.get(sessionId);
  }

  /**
   * Ends an active session and cleans up mappings
   */
  endSession(sessionId: string): ActiveSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    this.activeSessions.delete(sessionId);
    this.socketToSession.delete(session.userA.socketId);
    this.socketToSession.delete(session.userB.socketId);

    return session;
  }

  /**
   * Ends an active session for a specific socket ID
   */
  endSessionBySocket(socketId: string): ActiveSession | null {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return null;
    return this.endSession(sessionId);
  }

  /**
   * Cleans up all traces of a disconnected socket (both queue and session)
   */
  async cleanupSocket(socketId: string): Promise<ActiveSession | null> {
    await RedisQueue.removeFromQueue(socketId);

    const sessionId = this.socketToSession.get(socketId);
    if (sessionId) {
      return this.endSession(sessionId);
    }
    return null;
  }
}

export const matchmakingService = new MatchmakingService();
