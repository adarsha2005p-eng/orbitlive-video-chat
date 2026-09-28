export interface UserPayload {
  id: string;
  username: string;
  isGuest: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  country?: string | null;
  preferredLanguage?: string | null;
  interests: string[];
  bio?: string | null;
}

export interface QueueUser {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  country?: string;
  language?: string;
  interests?: string[];
  joinedAt: number;
}

export interface ActiveSession {
  sessionId: string;
  userA: QueueUser;
  userB: QueueUser;
  createdAt: number;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

// Socket event payloads
export interface SignalOfferPayload {
  sessionId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalAnswerPayload {
  sessionId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SignalIceCandidatePayload {
  sessionId: string;
  candidate: RTCIceCandidateInit;
}

export interface MatchFoundPayload {
  sessionId: string;
  isInitiator: boolean;
  peer: {
    userId: string;
    username: string;
    displayName: string;
    country?: string;
    avatarUrl?: string;
  };
}

export interface ChatMessagePayload {
  sessionId: string;
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ReportPayload {
  sessionId?: string;
  reportedUserId: string;
  reason: string;
  details?: string;
}

export interface BlockPayload {
  blockedUserId: string;
}
