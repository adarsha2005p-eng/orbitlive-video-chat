import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../services/api';

let socket: Socket | null = null;

// Determine signaling server URL:
// In local dev with Vite proxy, empty string connects to current origin /socket.io
// In production on Vercel, VITE_SOCKET_URL or VITE_API_URL points to the deployed backend (e.g. https://orbitlive-backend.onrender.com)
const RAW_SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function getSocket(): Socket {
  if (!socket) {
    const token = getStoredToken();

    socket = io(RAW_SOCKET_URL || undefined, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: token || undefined,
      },
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket] Connected to signaling server with ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ [Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ [Socket] Connection error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  const token = getStoredToken();
  if (token && s.auth) {
    s.auth = { token };
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}
