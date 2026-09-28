export interface User {
  id: string;
  username: string;
  isGuest: boolean;
}

export interface Profile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  country?: string | null;
  preferredLanguage?: string | null;
  interests: string[];
  bio?: string | null;
}

export interface PeerInfo {
  userId: string;
  username: string;
  displayName: string;
  country?: string;
  avatarUrl?: string;
}

export interface MatchFoundData {
  sessionId: string;
  isInitiator: boolean;
  peer: PeerInfo;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export type CallState =
  | 'idle'
  | 'searching'
  | 'connecting'
  | 'connected'
  | 'stranger_disconnected'
  | 'ended'
  | 'error';

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}
