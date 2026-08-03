import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentProfile, AuthSession, User } from "@/shared/types";
import * as authService from "@/features/auth/api";
import { DEMO_AGENTS } from "@/shared/mock/db";

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

/** Rehydrate demo agents with seed profile (logo/docs/legal) so stale sessions stay complete. */
function hydrateAgent(user: AgentProfile): AgentProfile {
  const demo = DEMO_AGENTS.find((a) => a.id === user.id);
  if (!demo) return user;
  /* Seeded approved agents must stay approved — old localStorage often still has
     "incomplete" from earlier demos, which wrongly re-opens the onboarding wizard. */
  const verificationState =
    demo.verificationState === "approved"
      ? "approved"
      : (user.verificationState || demo.verificationState);
  return {
    ...demo,
    ...user,
    companyName: user.companyName || demo.companyName,
    contactPerson: user.contactPerson || demo.contactPerson,
    addressStreet: user.addressStreet || demo.addressStreet,
    addressPostalCode: user.addressPostalCode || demo.addressPostalCode,
    addressCity: user.addressCity || demo.addressCity,
    addressCountry: user.addressCountry || demo.addressCountry,
    phone: user.phone || demo.phone,
    vatId: user.vatId || demo.vatId,
    managingDirector: user.managingDirector || demo.managingDirector,
    regulatoryAuthority: user.regulatoryAuthority || demo.regulatoryAuthority,
    commercialRegisterNo: user.commercialRegisterNo || demo.commercialRegisterNo,
    logoUrl: user.logoUrl || demo.logoUrl,
    documents: {
      license: user.documents?.license ?? demo.documents?.license,
      register: user.documents?.register ?? demo.documents?.register,
    },
    vatValidated: user.vatValidated ?? demo.vatValidated,
    verificationState,
  };
}

function restore(): User | AgentProfile | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const user = JSON.parse(raw) as User | AgentProfile;
    if (user.role === "agent") {
      const hydrated = hydrateAgent(user as AgentProfile);
      try { localStorage.setItem(LS_SESSION, JSON.stringify(hydrated)); } catch { /* ignore */ }
      return hydrated;
    }
    return user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | AgentProfile | null>(restore);

  /* Re-apply demo seed after HMR / code updates so approved agents leave the wizard. */
  useEffect(() => {
    setUser((prev) => {
      if (!prev || prev.role !== "agent") return prev;
      const hydrated = hydrateAgent(prev as AgentProfile);
      try { localStorage.setItem(LS_SESSION, JSON.stringify(hydrated)); } catch { /* ignore */ }
      return hydrated;
    });
  }, []);

  const persist = (u: User | AgentProfile | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(LS_SESSION, JSON.stringify(u));
      else localStorage.removeItem(LS_SESSION);
    } catch { /* ignore */ }
  };

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    const user =
      session.user.role === "agent"
        ? hydrateAgent(session.user as AgentProfile)
        : session.user;
    persist(user);
    return { ...session, user };
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
