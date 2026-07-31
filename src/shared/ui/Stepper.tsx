import { Check } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";

/* Wizard step header with progress bar — used by the agent verification
   wizard; reusable for any future multi-step flow (e.g. B2B registration). */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useI18n();
  const pct = Math.round((current / (steps.length - 1)) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted">
        <span>{t("stepper.step", { a: current + 1, b: steps.length })}</span>
        <span className="tabular">{pct}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("stepper.progress")}>
        <div className="h-full rounded-full bg-action transition-all duration-300" style={{ width: `${Math.max(6, pct)}%` }} />
      </div>
      <ol className="flex flex-wrap gap-x-5 gap-y-1.5">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} aria-current={active ? "step" : undefined}
              className={`flex items-center gap-2 text-sm font-semibold ${active ? "text-blue-700" : done ? "text-emerald-700" : "text-muted"}`}>
              <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                done ? "bg-emerald-600 text-white" : active ? "bg-action text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {done ? <Check weight="bold" className="size-3.5" /> : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
