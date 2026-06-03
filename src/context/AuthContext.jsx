import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'todo_token';
const USER_KEY = 'todo_user';

function safeStorageRead(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageWrite(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures so the app still renders.
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures so the app still renders.
  }
}

function normalizeUser(payload) {
  const source = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload ?? null;
  if (!source) return null;

  return {
    id: source.id,
    name: source.name ?? source.username ?? source.full_name ?? 'Guest',
    email: source.email ?? '',
    role: source.role ?? source.type ?? (source.is_admin ? 'admin' : 'user'),
    ...source,
  };
}

function normalizeToken(payload) {
  return (
    payload?.token ??
    payload?.access_token ??
    payload?.data?.token ??
    payload?.data?.access_token ??
    null
  );
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => safeStorageRead(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => readStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);

  const persistSession = (nextToken, nextUser) => {
    setToken(nextToken || '');
    setUser(nextUser);

    if (nextToken) {
      safeStorageWrite(TOKEN_KEY, nextToken);
      api.setToken(nextToken);
    } else {
      safeStorageRemove(TOKEN_KEY);
      api.clearToken();
    }

    if (nextUser) {
      safeStorageWrite(USER_KEY, JSON.stringify(nextUser));
    } else {
      safeStorageRemove(USER_KEY);
    }
  };

  const resolveUser = async (token, fallbackUser) => {
    if (fallbackUser?.role) {
      return fallbackUser;
    }

    try {
      api.setToken(token);
      const profile = await api.me();
      return normalizeUser(profile);
    } catch {
      return fallbackUser || null;
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await api.login(credentials);
      const nextToken = normalizeToken(response);
      const nextUser = await resolveUser(nextToken, normalizeUser(response));

      if (!nextToken) {
        throw new Error('Login succeeded, but no token was returned.');
      }

      persistSession(nextToken, nextUser);
      return { token: nextToken, user: nextUser };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await api.register(payload);
      const nextToken = normalizeToken(response);
      const nextUser = await resolveUser(nextToken, normalizeUser(response));

      if (nextToken) {
        persistSession(nextToken, nextUser);
      }

      return { token: nextToken, user: nextUser, response };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout network errors and clear local state either way.
    } finally {
      persistSession('', null);
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      setSession: persistSession,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
