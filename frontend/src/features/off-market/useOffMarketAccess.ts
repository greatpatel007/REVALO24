import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";

/* Off-Market access (§ Screen 4B) — two paths per spec:
   1. Access code from the listing agent → unlocks that one property
      (persisted locally; backend keeps the grant server-side).
   2. Approved buyer account: verified *private* users unlock directly.
      Agents are intentionally NOT approved — they see the distinct
      "signed in but not approved" messaging with the code fallback. */

const KEY = "rv24.omUnlocked";

function readUnlocked(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function grantOffMarketAccess(propertyId: number): void {
  const ids = readUnlocked();
  if (!ids.includes(propertyId)) {
    try { localStorage.setItem(KEY, JSON.stringify([...ids, propertyId])); } catch { /* ignore */ }
  }
}

export function useOffMarketAccess() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<number[]>(readUnlocked);

  const approvedBuyer = !!user && user.role === "private" && user.verified;

  return {
    /** Whole-account approval (verified private buyer) */
    approvedBuyer,
    hasAccess: (propertyId: number) => approvedBuyer || unlocked.includes(propertyId),
    grant: (propertyId: number) => {
      grantOffMarketAccess(propertyId);
      setUnlocked(readUnlocked());
    },
  };
}
