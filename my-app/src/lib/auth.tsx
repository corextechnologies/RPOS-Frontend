"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokens } from "@/lib/api";
import { canPerform, postAuthPath, type AuthAction } from "@/lib/auth/actions";
import type { MeResponse } from "@/lib/types/super-admin";

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (action: AuthAction) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      tokens.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!tokens.access) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        tokens.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = window.setTimeout(() => {
      void bootstrap();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password);
    const me = await api.me();
    setUser(me);
    setLoading(false);
    return postAuthPath(me);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const can = useCallback(
    (action: AuthAction) => canPerform(user?.role, action),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh: loadMe, can }),
    [user, loading, login, logout, loadMe, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
