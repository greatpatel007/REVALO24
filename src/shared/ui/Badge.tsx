import type { ReactNode } from "react";
import { useI18n } from "@/shared/i18n/I18nContext";

type Tone = "neutral" | "action" | "success" | "warning" | "danger" | "info" | "premium";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-200 text-slate-800",
  action: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-warn-50 text-warn-700",
  danger: "bg-err-50 text-err-700",
  info: "bg-info-50 text-info-700",
  premium: "bg-premium text-premium-accent",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  active: "success", sold: "neutral", rented: "info", draft: "warning",
  approved: "success", pending: "warning", rejected: "danger", incomplete: "warning",
  completed: "success", processing: "info", queued: "neutral", failed: "danger",
  sent: "info", replied: "success", grace: "warning", inactive: "danger",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  /* status.* keys cover every workflow status; EN dict is the guaranteed fallback */
  return <Badge tone={statusTone[status] ?? "neutral"}>{t(`status.${status}`)}</Badge>;
}
