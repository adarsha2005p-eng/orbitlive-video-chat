import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket } from '../socket/socket';
import { WebRTCManager } from '../webrtc/webrtc';
import { fetchIceServers } from '../services/api';
import { CallState, PeerInfo, ChatMessage, User, Profile } from '../types';

export function useWebRTC(user: User | null, profile: Profile | null) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to connect');
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const webrtcRef = useRef<WebRTCManager | null>(null);
  const iceServersRef = useRef<any[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Keep sessionIdRef in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Load ICE servers on startup
  useEffect(() => {
    fetchIceServers().then((servers) => {
      iceServersRef.current = servers;
    });
  }, []);

  // Initialize WebRTC Manager
  useEffect(() => {
    const rtc = new WebRTCManager({
      onRemoteStream: (stream) => {
        console.log('[Hook] Setting remote stream', stream.id);
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onConnectionStateChange: (state) => {
        console.log('[Hook] Peer connection state:', state);
        if (state === 'connected') {
          setCallState('connected');
          setStatusMessage('Connected with stranger');
        } else if (state === 'disconnected') {
          setCallState('stranger_disconnected');
          setStatusMessage('Stranger disconnected');
        } else if (state === 'failed') {
          setCallState('error');
          setStatusMessage('Connection failed. Trying to reconnect...');
        }
      },
      onIceCandidate: (candidate) => {
        const s = getSocket();
        if (sessionIdRef.current && s.connected) {
          s.emit('signal_ice_candidate', {
            sessionId: sessionIdRef.current,
            candidate,
          });
        }
      },
      onError: (err) => {
        setErrorMessage(err.message);
        setStatusMessage(err.message);
      },
    });

    webrtcRef.current = rtc;

    return () => {
      rtc.destroy();
    };
  }, []);

  // Connect local video element to local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Connect remote video element to remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Socket event listeners
  useEffect(() => {
    const socket = connectSocket();

    socket.on('online_count', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    socket.on('waiting_in_queue', (data: { message?: string }) => {
      setCallState('searching');
      setStatusMessage(data.message || 'Finding someone from around the world...');
      setPeer(null);
      setRemoteStream(null);
      setChatMessages([]);
    });

    socket.on('match_found', async (data: {
      sessionId: string;
      isInitiator: boolean;
      peer: PeerInfo;
    }) => {
      console.log('🎉 [Hook] Match found! Session:', data.sessionId, 'isInitiator:', data.isInitiator);
      setSessionId(data.sessionId);
      sessionIdRef.current = data.sessionId;
      setPeer(data.peer);
      setCallState('connecting');
      setStatusMessage(`Connecting to ${data.peer.displayName}...`);
      setChatMessages([]);

      const rtc = webrtcRef.current;
      if (!rtc) return;

      try {
        rtc.createPeerConnection(iceServersRef.current);

        if (data.isInitiator) {
          const offer = await rtc.createOffer();
          socket.emit('signal_offer', {
            sessionId: data.sessionId,
            sdp: offer,
          });
        }
      } catch (err: any) {
        console.error('[Hook] Error creating connection:', err);
        setErrorMessage(err.message);
      }
    });

    socket.on('signal_offer', async (data: { sessionId: string; sdp: RTCSessionDescriptionInit }) => {
      console.log('📩 [Hook] Received SDP offer for session:', data.sessionId);
      const rtc = webrtcRef.current;
      if (!rtc) return;

      try {
        const answer = await rtc.handleOffer(data.sdp);
        socket.emit('signal_answer', {
          sessionId: data.sessionId,
          sdp: answer,
        });
      } catch (err: any) {
        console.error('[Hook] Error handling offer:', err);
      }
    });

    socket.on('signal_answer', async (data: { sessionId: string; sdp: RTCSessionDescriptionInit }) => {
      console.log('📩 [Hook] Received SDP answer for session:', data.sessionId);
      const rtc = webrtcRef.current;
      if (!rtc) return;

      try {
        await rtc.handleAnswer(data.sdp);
      } catch (err: any) {
        console.error('[Hook] Error handling answer:', err);
      }
    });

    socket.on('signal_ice_candidate', async (data: { sessionId: string; candidate: RTCIceCandidateInit }) => {
      const rtc = webrtcRef.current;
      if (!rtc) return;
      await rtc.addIceCandidate(data.candidate);
    });

    socket.on('chat_message', (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on('peer_disconnected', (data: { message?: string }) => {
      setCallState('stranger_disconnected');
      setStatusMessage(data.message || 'Your stranger disconnected.');
      webrtcRef.current?.closePeerConnection();
      setRemoteStream(null);
    });

    socket.on('call_ended', (data: { message?: string }) => {
      setCallState('ended');
      setStatusMessage(data.message || 'Call ended.');
      webrtcRef.current?.closePeerConnection();
      setRemoteStream(null);
    });

    socket.on('error_message', (data: { message: string }) => {
      setErrorMessage(data.message);
    });

    return () => {
      socket.off('online_count');
      socket.off('waiting_in_queue');
      socket.off('match_found');
      socket.off('signal_offer');
      socket.off('signal_answer');
      socket.off('signal_ice_candidate');
      socket.off('chat_message');
      socket.off('peer_disconnected');
      socket.off('call_ended');
      socket.off('error_message');
    };
  }, []);

  /**
   * Acquire camera & microphone
   */
  const startMedia = useCallback(async () => {
    if (!webrtcRef.current) return null;
    try {
      const stream = await webrtcRef.current.initLocalStream();
      setLocalStream(stream);
      setErrorMessage(null);
      return stream;
    } catch (err: any) {
      setErrorMessage(err.message);
      return null;
    }
  }, []);

  /**
   * Start searching for a stranger
   */
  const startSearching = useCallback(async () => {
    setErrorMessage(null);
    let stream = localStream;
    if (!stream) {
      stream = await startMedia();
      if (!stream) return; // User denied camera or device error
    }

    const socket = connectSocket();
    setCallState('searching');
    setStatusMessage('Finding someone from around the world...');
    setPeer(null);
    setRemoteStream(null);
    setChatMessages([]);

    socket.emit('join_queue', {
      userId: user?.id,
      username: user?.username,
      displayName: profile?.displayName,
      avatarUrl: profile?.avatarUrl,
      country: profile?.country,
      language: profile?.preferredLanguage,
      interests: profile?.interests,
    });
  }, [user, profile, localStream, startMedia]);

  /**
   * Next stranger
   */
  const nextMatch = useCallback(() => {
    webrtcRef.current?.closePeerConnection();
    setRemoteStream(null);
    setChatMessages([]);
    setCallState('searching');
    setStatusMessage('Finding someone new...');

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('next');
    } else {
      startSearching();
    }
  }, [startSearching]);

  /**
   * End call and return to idle/ready state
   */
  const endCall = useCallback(() => {
    webrtcRef.current?.closePeerConnection();
    setRemoteStream(null);
    setCallState('ended');
    setStatusMessage('Call ended.');

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('end_call');
      socket.emit('leave_queue');
    }
  }, []);

  /**
   * Toggle Audio Mute
   */
  const toggleAudio = useCallback(() => {
    if (!webrtcRef.current) return;
    const isNowEnabled = webrtcRef.current.toggleAudio();
    setIsAudioMuted(!isNowEnabled);
  }, []);

  /**
   * Toggle Video Disable
   */
  const toggleVideo = useCallback(() => {
    if (!webrtcRef.current) return;
    const isNowEnabled = webrtcRef.current.toggleVideo();
    setIsVideoDisabled(!isNowEnabled);
  }, []);

  /**
   * Send in-call chat message
   */
  const sendChatMessage = useCallback(
    (text: string) => {
      if (!sessionIdRef.current || !text.trim()) return;
      const socket = getSocket();
      socket.emit('send_chat_message', {
        sessionId: sessionIdRef.current,
        text,
      });
    },
    []
  );

  /**
   * Block stranger
   */
  const blockStranger = useCallback(async () => {
    if (!peer) return;
    const socket = getSocket();
    socket.emit('block_user', { blockedUserId: peer.userId });
    nextMatch();
  }, [peer, nextMatch]);

  /**
   * Report stranger
   */
  const reportStranger = useCallback(
    async (reason: string, details?: string) => {
      if (!peer) return;
      const socket = getSocket();
      socket.emit('report_user', {
        sessionId: sessionIdRef.current || undefined,
        reportedUserId: peer.userId,
        reason,
        details,
      });
    },
    [peer]
  );

  return {
    callState,
    statusMessage,
    peer,
    sessionId,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoDisabled,
    chatMessages,
    onlineCount,
    errorMessage,
    localVideoRef,
    remoteVideoRef,
    startMedia,
    startSearching,
    nextMatch,
    endCall,
    toggleAudio,
    toggleVideo,
    sendChatMessage,
    blockStranger,
    reportStranger,
  };
}
