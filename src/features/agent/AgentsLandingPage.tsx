import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { m } from "motion/react";
import { Check, DownloadSimple, Receipt, Sparkle, Star, X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getPlans } from "@/features/agent/api";
import { fmtEur, fmtLocalEstimate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { IntegrationTrustStrip } from "@/features/home/IntegrationTrustStrip";
import { fadeUp, inViewOnce, revealInView, staggerContainer } from "@/shared/motion/presets";

/** Plan feature row — Phosphor check/x instead of "✓ " text prefixes */
export function PlanFeature({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${ok ? "" : "text-muted"}`}>
      {ok ? (
        <Check weight="bold" className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <X weight="bold" className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
}

export function AgentsLandingPage() {
  const { t, to, locale } = useI18n();
  const { data: plans } = useApi(getPlans);

  return (
    <>
      <section className="bg-navy">
        <m.div
          className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <m.p variants={fadeUp} className="t-overline mb-2 text-blue-300">{t("nav.agents")}</m.p>
          <m.h1 variants={fadeUp} className="mb-4 font-display text-3xl font-extrabold text-white sm:text-4xl">
            {t("agents.title")}
          </m.h1>
          <m.p variants={fadeUp} className="mx-auto mb-8 max-w-2xl text-slate-400">{t("agents.sub")}</m.p>
          <m.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link to={to("/register?role=agent")}>
              <Button size="lg">{t("agents.register")}</Button>
            </Link>
            <a href="#plans">
              <Button size="lg" variant="secondary" className="!border-slate-600 !bg-transparent !text-white hover:!bg-white/10">{t("agents.seePlans")}</Button>
            </a>
          </m.div>
        </m.div>
      </section>

      <m.section
        className="mx-auto grid max-w-shell gap-5 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
      >
        {[
          { icon: <Sparkle weight="duotone" className="size-8 text-blue-600" aria-hidden />, title: t("agents.f1t"), body: t("agents.f1b") },
          { icon: <DownloadSimple weight="duotone" className="size-8 text-emerald-600" aria-hidden />, title: t("agents.f2t"), body: t("agents.f2b") },
          { icon: <Star weight="duotone" className="size-8 text-champagne-700" aria-hidden />, title: t("agents.f3t"), body: t("agents.f3b") },
          { icon: <Receipt weight="duotone" className="size-8 text-info-600" aria-hidden />, title: t("agents.f4t"), body: t("agents.f4b") },
        ].map((v) => (
          <m.div key={v.title} variants={revealInView} className="rounded-xl border border-slate-200 bg-white p-6">
            <span className="mb-3 block">{v.icon}</span>
            <h3 className="mb-1.5 font-display text-base font-bold">{v.title}</h3>
            <p className="text-sm text-muted">{v.body}</p>
          </m.div>
        ))}
      </m.section>

      <IntegrationTrustStrip compact />

      <section id="plans" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-2 text-center font-display text-2xl font-extrabold sm:text-3xl">{t("agents.plansTitle")}</h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-sm text-muted">{t("agents.plansSub")}</p>
          <m.div
            className="grid gap-5 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={inViewOnce}
          >
            {(plans ?? []).map((p) => (
              <m.div
                key={p.id}
                variants={revealInView}
                className={`relative flex flex-col rounded-2xl border p-6 ${p.name === "Professional" ? "border-2 border-action shadow-elevation-md" : "border-slate-200"}`}
              >
                {p.name === "Professional" && <Badge tone="action" className="absolute -top-3 left-6">{t("agents.popular")}</Badge>}
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <p className="mb-4 text-sm text-muted">{p.notes}</p>
                <p className="font-display text-3xl font-extrabold tabular">
                  {fmtEur(p.priceEur, locale)}<span className="text-sm font-semibold text-muted"> / {p.frequency === "monthly" ? t("plan.mo") : t("plan.yr")}</span>
                </p>
                {/* CZ/PL display estimate — Stripe still settles in EUR (§4.1) */}
                <p className={`mb-5 text-xs font-semibold tabular text-muted ${fmtLocalEstimate(p.priceEur, locale) ? "mt-1" : ""}`}>
                  {fmtLocalEstimate(p.priceEur, locale) && <>{fmtLocalEstimate(p.priceEur, locale)} <span className="font-normal">· {t("fx.note")}</span></>}
                </p>
                <ul className="mb-6 space-y-2 text-sm text-slate-800">
                  <PlanFeature ok>{t("agents.quota", { n: p.listingQuota })}</PlanFeature>
                  <PlanFeature ok>{t("agents.credits", { n: p.aiCredits })}</PlanFeature>
                  <PlanFeature ok={p.featuredEligible}>{t("agents.placementsFeat")}</PlanFeature>
                  <PlanFeature ok>{t("agents.importFeat")}</PlanFeature>
                </ul>
                {/* Plan id travels through registration so checkout can preselect it */}
                <Link to={to(`/register?role=agent&plan=${p.id}`)} className="mt-auto">
                  <Button className="w-full" variant={p.name === "Professional" ? "primary" : "secondary"}>{t("agents.choose", { plan: p.name })}</Button>
                </Link>
              </m.div>
            ))}
          </m.div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-3 font-display text-xl font-extrabold">{t("agents.verifyTitle")}</h2>
          <ol className="space-y-3 text-sm text-slate-800">
            <li><strong>{t("agents.v1t")}</strong> — {t("agents.v1b")}</li>
            <li><strong>{t("agents.v2t")}</strong> — {t("agents.v2b")}</li>
            <li><strong>{t("agents.v3t")}</strong> — {t("agents.v3b")}</li>
          </ol>
        </div>
      </section>
    </>
  );
}
