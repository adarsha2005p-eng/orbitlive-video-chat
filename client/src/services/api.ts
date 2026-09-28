import { User, Profile, IceServerConfig } from '../types';

// Use production backend URL if provided via VITE_API_URL; otherwise fallback to relative /api (for Vite proxy)
const RAW_BACKEND_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_BASE = RAW_BACKEND_URL ? `${RAW_BACKEND_URL}/api` : '/api';

const TOKEN_KEY = 'orbitlive_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage errors in restricted iframe
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMe(): Promise<{ user: User; profile: Profile } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loginUser(data: { username: string; password: string }): Promise<{ user: User; profile: Profile }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to login');
  }
  if (body.token) {
    setStoredToken(body.token);
  }
  return body;
}

export async function registerUser(data: {
  username: string;
  password: string;
  displayName?: string;
  country?: string;
}): Promise<{ user: User; profile: Profile }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to register');
  }
  if (body.token) {
    setStoredToken(body.token);
  }
  return body;
}

export async function guestLogin(): Promise<{ user: User; profile: Profile }> {
  const res = await fetch(`${API_BASE}/auth/guest`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to start guest session');
  }
  if (body.token) {
    setStoredToken(body.token);
  }
  return body;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
  } finally {
    clearStoredToken();
  }
}

export async function updateProfile(data: Partial<Profile>): Promise<{ profile: Profile }> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update profile');
  }
  return body;
}

export async function reportUser(data: {
  reportedUserId: string;
  sessionId?: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/moderation/report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to submit report');
  }
}

export async function blockUser(blockedUserId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/moderation/block`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ blockedUserId }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to block user');
  }
}

export async function fetchIceServers(): Promise<IceServerConfig[]> {
  try {
    const res = await fetch(`${API_BASE}/config/ice-servers`);
    if (res.ok) {
      const data = await res.json();
      if (data.iceServers && data.iceServers.length > 0) {
        return data.iceServers;
      }
    }
  } catch {
    // Fall back to public STUN
  }
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
}
