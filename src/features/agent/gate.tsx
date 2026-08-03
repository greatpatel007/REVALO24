import { Link } from "react-router-dom";
import { HourglassMedium, LockKey, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import type { AgentProfile } from "@/shared/types";

/* Verification Gate (client spec, agent journey §5.2):
   a commercial agent must complete the mandatory profile form + licence
   upload and be admin-approved before any publish tool unlocks —
   listing creation, AI exposé, CRM import and placements. */

export function useAgentGate() {
  const { user } = useAuth();
  const agent = user as AgentProfile | null;
  const state = agent?.verificationState ?? "incomplete";
  return {
    agent,
    state,
    /** publish tools unlocked */
    approved: state === "approved",
  };
}

const STYLE: Record<string, { box: string; icon: React.ReactNode }> = {
  incomplete: {
    box: "border-warn-600/30 bg-warn-50 text-warn-700",
    icon: <LockKey weight="duotone" className="size-5 shrink-0" aria-hidden />,
  },
  pending: {
    box: "border-info-600/30 bg-info-50 text-info-700",
    icon: <HourglassMedium weight="duotone" className="size-5 shrink-0" aria-hidden />,
  },
  rejected: {
    box: "border-err-600/30 bg-err-50 text-err-700",
    icon: <WarningCircle weight="duotone" className="size-5 shrink-0" aria-hidden />,
  },
};

/** State-aware restriction banner shown above gated tools. */
export function GateNotice({ className = "" }: { className?: string }) {
  const { t, to } = useI18n();
  const { state, approved } = useAgentGate();
  if (approved) return null;
  const s = STYLE[state] ?? STYLE.incomplete;
  return (
    <div role="status" className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${s.box} ${className}`}>
      {s.icon}
      <p className="min-w-0 flex-1 text-sm font-semibold">{t(`agent.gate.${state}`)}</p>
      {state !== "pending" && (
        <Link
          to={to("/agent/profile")}
          className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-slate-400 bg-white px-3.5 text-sm font-semibold text-navy transition-[color,background-color,border-color,transform] hover:border-border-strong hover:bg-slate-200/60 active:scale-[0.96]"
        >
          {t("agent.gate.cta")}
        </Link>
      )}
    </div>
  );
}
