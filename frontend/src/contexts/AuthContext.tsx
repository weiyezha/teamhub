import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../lib/api';

export interface User {
  id: number; username: string; name: string; avatar: string;
  role: string; department: string; title: string; is_active: boolean;
  allowed_modules?: Record<string, string[]>;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const Ctx = createContext<AuthState>({ user: null, loading: true, login: async () => {}, logout: () => {}, setUser: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Don't cache user in localStorage to avoid stale permission data
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/api/auth/me')
      .then((res: any) => {
        const d = res.data.user || res.data;
        d.allowed_modules = res.data.allowed_modules || {};
        // Ensure allowed_modules always exists as an object
        if (!d.allowed_modules) d.allowed_modules = {};
        setUser(d);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/api/auth/login', { username, password });
    const u = res.data.user;
    localStorage.setItem('token', res.data.token);
    try {
      const me = await api.get('/api/auth/me');
      u.allowed_modules = me.data.allowed_modules || {};
    } catch {}
    if (!u.allowed_modules) u.allowed_modules = {};
    setUser(u);
    setLoading(false);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useAuthCtx() { return useContext(Ctx); }
