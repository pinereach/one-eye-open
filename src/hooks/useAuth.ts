import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Feature flag: disable auth in development
  const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '8788' ||
    window.location.port === '3000'
  );

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    // In development, set a mock user immediately
    if (isDevelopment) {
      setUser({ id: 1, username: 'dev-user' });
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const { user } = await api.login({ username, password });
    setUser(user);
    return user;
  }

  async function register(username: string, password: string) {
    const { user } = await api.register({ username, password });
    setUser(user);
    return user;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };
}
