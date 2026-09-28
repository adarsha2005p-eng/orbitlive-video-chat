import { useState, useEffect, useCallback } from 'react';
import { User, Profile } from '../types';
import * as api from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchMe();
      if (data) {
        setUser(data.user);
        setProfile(data.profile);
      } else {
        // Automatically provide a guest session for zero friction!
        const guestData = await api.guestLogin();
        setUser(guestData.user);
        setProfile(guestData.profile);
      }
    } catch (err: any) {
      console.warn('[useAuth] Could not load user session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (username: string, password: string) => {
    setAuthError(null);
    try {
      const data = await api.loginUser({ username, password });
      setUser(data.user);
      setProfile(data.profile);
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    }
  };

  const register = async (username: string, password: string, displayName?: string, country?: string) => {
    setAuthError(null);
    try {
      const data = await api.registerUser({ username, password, displayName, country });
      setUser(data.user);
      setProfile(data.profile);
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    }
  };

  const continueAsGuest = async () => {
    setAuthError(null);
    try {
      const data = await api.guestLogin();
      setUser(data.user);
      setProfile(data.profile);
      return data;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    }
  };

  const updateUserProfile = async (data: Partial<Profile>) => {
    try {
      const res = await api.updateProfile(data);
      setProfile(res.profile);
      return res.profile;
    } catch (err: any) {
      throw err;
    }
  };

  const logout = async () => {
    await api.logoutUser();
    setUser(null);
    setProfile(null);
    // Restart guest session
    await continueAsGuest();
  };

  return {
    user,
    profile,
    loading,
    authError,
    setAuthError,
    login,
    register,
    continueAsGuest,
    updateUserProfile,
    logout,
  };
}
