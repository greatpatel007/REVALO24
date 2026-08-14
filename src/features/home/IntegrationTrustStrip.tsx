import { useI18n } from "@/shared/i18n/I18nContext";

/** CRM / MLS / scheduling trust wordmarks — marketing only (no live OAuth). */
const PARTNERS = [
  "OpenImmo",
  "onOffice",
  "FlowFact",
  "Propstack",
  "Kyero",
  "Calendly",
  "Stripe",
] as const;

export function IntegrationTrustStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="trust-strip-title"
      className={compact ? "border-y border-slate-200 bg-white py-10" : "bg-canvas py-16"}
    >
      <div className="mx-auto max-w-shell px-4 sm:px-6">
        <div className="mb-6 text-center sm:mb-8">
          <p className="t-overline mb-2 text-blue-700">{t("home.trust.overline")}</p>
          <h2 id="trust-strip-title" className="font-display text-xl font-extrabold sm:text-2xl">
            {t("home.trust.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-pretty text-sm text-muted">{t("home.trust.sub")}</p>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {PARTNERS.map((name) => (
            <li
              key={name}
              className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-elevation-sm"
            >
              <span className="font-display text-sm font-extrabold tracking-tight text-slate-600">
                {name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
