'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, User } from './types';

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  loading: true,
});

const AUTH_STORAGE_KEY = 'smartcard_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuthState({
          user: parsed.user,
          token: parsed.token,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, user: User) => {
    const newState = { user, token, isAuthenticated: true };
    setAuthState(newState);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newState));
  };

  const logout = () => {
    setAuthState({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}