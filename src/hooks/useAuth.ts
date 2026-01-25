import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { user } = await api.login({ email, password });
    setUser(user);
    return user;
  }

  async function register(email: string, password: string, displayName: string) {
    const { user } = await api.register({ email, password, displayName });
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
