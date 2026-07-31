import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AgentProfile, AuthSession, User } from "@/shared/types";
import * as authService from "@/features/auth/api";

interface Auth {
  user: User | AgentProfile | null;
  isAgent: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  socialLogin: (provider: "google" | "apple") => Promise<AuthSession>;
  /** Persist a session obtained outside login (e.g. right after DOI verification) */
  adoptSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AgentProfile>) => void;
}

const AuthContext = createContext<Auth | null>(null);
const LS_SESSION = "r24.session";

function restore(): User | AgentProfile | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | AgentProfile | null>(restore);

  const persist = (u: User | AgentProfile | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(LS_SESSION, JSON.stringify(u));
      else localStorage.removeItem(LS_SESSION);
    } catch { /* ignore */ }
  };

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    persist(session.user);
    return session;
  }, []);

  const socialLogin = useCallback(async (provider: "google" | "apple") => {
    const session = await authService.socialLogin(provider);
    persist(session.user);
    return session;
  }, []);

  const adoptSession = useCallback((session: AuthSession) => {
    persist(session.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    persist(null);
  }, []);

  const updateUser = useCallback((patch: Partial<AgentProfile>) => {
    setUser((prev) => {
      const next = prev ? ({ ...prev, ...patch } as AgentProfile) : prev;
      try { if (next) localStorage.setItem(LS_SESSION, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo<Auth>(
    () => ({ user, isAgent: user?.role === "agent", login, socialLogin, adoptSession, logout, updateUser }),
    [user, login, socialLogin, adoptSession, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
