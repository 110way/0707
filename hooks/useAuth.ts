'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { AuthUser, Role } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setUser(json.data);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      console.error('Failed to fetch auth session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'Password123!' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setUser(json.data);
          // Trigger a custom event to notify usePoints or other hooks of change
          window.dispatchEvent(new Event('auth-login'));
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Login request failed:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const setRole = async (role: Role) => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setUser(json.data);
          // Reload the page to reset all routing / states for the new role layout
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, logout, setRole, refreshUser } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
