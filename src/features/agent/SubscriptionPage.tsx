import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileArrowDown, Tag } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { applyPromoCode, getInvoices, getPlans, getStripePortalUrl, getSubscription, type PromoResult } from "@/features/agent/api";
import { PlanFeature } from "@/features/agent/AgentsLandingPage";
import { fmtDate, fmtEur, fmtEurExact, fmtLocalEstimate } from "@/shared/lib/format";
import type { SubscriptionPlan } from "@/shared/types";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Modal } from "@/shared/ui/Modal";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";

/* Subscription & billing (§3.4.3 / §4.1). Self-service billing routes to the
   hosted Stripe Customer Portal; plan changes open a checkout step where promo
   codes are entered (not on the main subscription screen). */
export function SubscriptionPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [params] = useSearchParams();
  /* Plan chosen on the agents landing page (carried through registration) */
  const wantedPlan = Number(params.get("plan")) || null;
  const sub = useApi(getSubscription);
  const plans = useApi(getPlans);
  const invoices = useApi(getInvoices);
  const [portalBusy, setPortalBusy] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);

  const openPortal = () => {
    setPortalBusy(true);
    void getStripePortalUrl()
      .then((url) => toast(t("agent.sub.portalDemo", { url }), "info"))
      .finally(() => setPortalBusy(false));
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.subscription")}</h1>
      <p className="mb-6 text-sm text-muted">{t("agent.sub.sub")}</p>

      <section className="mb-6 rounded-xl border border-slate-300 bg-white p-5">
        {sub.data ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">{t("agent.sub.planTitle", { plan: sub.data.planName })}</h2>
                <StatusBadge status={sub.data.status} />
              </div>
              <p className="text-sm text-muted">
                {t("agent.sub.since", {
                  start: fmtDate(sub.data.startedAt, locale), renew: fmtDate(sub.data.renewsAt, locale),
                  lu: sub.data.listingsUsed, lq: sub.data.listingQuota,
                  au: sub.data.aiCreditsUsed, aq: sub.data.aiCredits,
                })}
              </p>
            </div>
            <Button loading={portalBusy} onClick={openPortal}>{t("agent.sub.portalCta")}</Button>
          </div>
        ) : sub.error ? (
          <ErrorState onRetry={sub.reload} />
        ) : <Skeleton className="h-16 w-full" />}
        <p className="mt-3 text-xs text-muted">{t("agent.sub.portalNote")}</p>
      </section>

      {/* Plans */}
      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-bold">{t("agent.sub.available")}</h2>
        {plans.error && <ErrorState onRetry={plans.reload} />}
        {plans.loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {(plans.data ?? []).map((p) => {
            const current = sub.data?.planId === p.id;
            const wanted = !current && p.id === wantedPlan;
            return (
              <div key={p.id} className={`flex flex-col rounded-xl border bg-white p-5 ${
                current ? "border-2 border-action" : wanted ? "border-2 border-action shadow-elevation-md" : "border-slate-300"
              }`}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-display font-bold">{p.name}</h3>
                  {current && <Badge tone="action">{t("agent.sub.current")}</Badge>}
                  {wanted && <Badge tone="info">{t("agent.sub.choice")}</Badge>}
                </div>
                <p className="font-display text-2xl font-extrabold tabular">
                  {fmtEur(p.priceEur, locale)}
                  <span className="text-xs font-semibold text-muted"> {t("agent.sub.perMoNet")}</span>
                </p>
                {/* CZ/PL display estimate — Stripe settles in EUR (§4.1) */}
                <p className={`mb-3 text-xs font-semibold tabular text-muted ${fmtLocalEstimate(p.priceEur, locale) ? "mt-0.5" : ""}`}>
                  {fmtLocalEstimate(p.priceEur, locale) && <>{fmtLocalEstimate(p.priceEur, locale)} <span className="font-normal">· {t("fx.note")}</span></>}
                </p>
                <ul className="mb-4 space-y-1 text-sm text-slate-800">
                  <PlanFeature ok>{t("agent.sub.quota", { n: p.listingQuota })}</PlanFeature>
                  <PlanFeature ok>{t("agent.sub.credits", { n: p.aiCredits })}</PlanFeature>
                  <PlanFeature ok={p.featuredEligible}>{p.featuredEligible ? t("agent.sub.placOk") : t("agent.sub.placNo")}</PlanFeature>
                </ul>
                <Button
                  className="mt-auto"
                  variant={current ? "secondary" : "primary"}
                  disabled={current}
                  onClick={() => setCheckoutPlan(p)}
                >
                  {current ? t("status.active") : sub.data && p.id > sub.data.planId ? t("agent.sub.upgradeBtn") : t("agent.sub.switch")}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoices — net / VAT / gross per line. Promo codes from plan purchase /
          upgrade appear on the invoice line when applied at checkout. */}
      {invoices.error && <ErrorState onRetry={invoices.reload} />}

      {!invoices.error && invoices.data && invoices.data.length === 0 && (
        <section className="rounded-xl border border-slate-300 bg-white p-8 text-center">
          <h2 className="mb-1 font-display text-base font-bold">{t("agent.sub.invoices")}</h2>
          <p className="text-sm text-muted">{t("agent.sub.invEmpty")}</p>
        </section>
      )}

      {!invoices.error && (invoices.loading || (invoices.data && invoices.data.length > 0)) && (
      <>
      <section className="rounded-xl border border-slate-300 bg-white md:hidden">
        <h2 className="border-b border-slate-200 px-4 py-4 font-display text-base font-bold">{t("agent.sub.invoices")}</h2>
        <ul className="divide-y divide-slate-200">
          {invoices.loading && <li className="p-4"><Skeleton className="h-24 w-full" /></li>}
          {(invoices.data ?? []).map((inv) => {
            const vatAmt = inv.amountEur * (inv.vatRate / 100);
            return (
            <li key={inv.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{inv.id}</p>
                  <p className="text-xs text-muted">{fmtDate(inv.date, locale)}</p>
                </div>
                <a href={inv.pdfUrl} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                  <FileArrowDown className="size-4" aria-hidden /> PDF
                </a>
              </div>
              <p className="mt-1.5 text-sm text-slate-800">{inv.description}</p>
              {inv.promoCode && (
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Badge tone="success">{inv.promoCode}</Badge>
                  {inv.discountPercent != null
                    ? t("agent.sub.invoicePromo", { p: inv.discountPercent })
                    : t("agent.sub.invoicePromoApplied")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-sm font-bold tabular">{fmtEurExact(inv.amountEur + vatAmt, locale)}</span>
                {inv.reverseCharge
                  ? <Badge tone="info">{t("agent.sub.reverse")}</Badge>
                  : <span className="text-xs tabular text-muted">{t("agent.sub.netVatLine", { net: fmtEurExact(inv.amountEur, locale), rate: inv.vatRate, vat: fmtEurExact(vatAmt, locale) })}</span>}
              </div>
            </li>
            );
          })}
        </ul>
        <p className="border-t border-slate-200 px-4 py-3 text-xs text-muted">{t("agent.sub.vatNote")}</p>
      </section>

      <section className="hidden overflow-x-auto rounded-xl border border-slate-300 bg-white scrollbar-thin md:block">
        <h2 className="border-b border-slate-200 px-5 py-4 font-display text-base font-bold">{t("agent.sub.invoices")}</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              {[t("agent.sub.thInvoice"), t("agent.sub.thDesc"), t("agent.sub.thAmount"), t("agent.sub.thVat"), ""].map((h, i) => <th key={i} className="px-5 py-2.5 font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoices.loading && (
              <tr><td colSpan={5} className="px-5 py-4"><Skeleton className="h-16 w-full" /></td></tr>
            )}
            {(invoices.data ?? []).map((inv) => {
              const vatAmt = inv.amountEur * (inv.vatRate / 100);
              return (
              <tr key={inv.id} className="hover:bg-canvas">
                <td className="whitespace-nowrap px-5 py-3">
                  <p className="font-bold">{inv.id}</p>
                  <p className="text-xs text-muted">{fmtDate(inv.date, locale)}</p>
                </td>
                <td className="px-5 py-3">
                  <p>{inv.description}</p>
                  {inv.promoCode && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
                      <Badge tone="success">{inv.promoCode}</Badge>
                      {inv.discountPercent != null
                        ? t("agent.sub.invoicePromo", { p: inv.discountPercent })
                        : t("agent.sub.invoicePromoApplied")}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <p className="font-bold tabular">{fmtEurExact(inv.amountEur + vatAmt, locale)}</p>
                  {!inv.reverseCharge && (
                    <p className="text-xs tabular text-muted">{t("agent.sub.netVatLine", { net: fmtEurExact(inv.amountEur, locale), rate: inv.vatRate, vat: fmtEurExact(vatAmt, locale) })}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-xs">
                  {inv.reverseCharge ? <Badge tone="info">{t("agent.sub.reverse")}</Badge> : `${inv.vatRate}%`}
                </td>
                <td className="px-5 py-3 text-right">
                  <a href={inv.pdfUrl} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                    <FileArrowDown className="size-4" aria-hidden /> PDF
                  </a>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-slate-200 px-5 py-3 text-xs text-muted">{t("agent.sub.vatNote")}</p>
      </section>
      </>
      )}

      <PlanCheckoutModal
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        onConfirm={(plan, promo) => {
          setCheckoutPlan(null);
          toast(
            promo
              ? t("agent.sub.checkoutDemoPromo", { plan: plan.name, code: promo.code, p: promo.discountPercent })
              : t("agent.sub.checkoutDemo", { plan: plan.name }),
            "info",
          );
        }}
      />
    </div>
  );
}

function PlanCheckoutModal({
  plan,
  onClose,
  onConfirm,
}: {
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onConfirm: (plan: SubscriptionPlan, promo: PromoResult | null) => void;
}) {
  const { t, locale } = useI18n();
  const [promoInput, setPromoInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promo, setPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  /* Reset promo state whenever a different plan is opened */
  useEffect(() => {
    setPromoInput("");
    setPromo(null);
    setPromoError(null);
    setPromoBusy(false);
    setConfirmBusy(false);
  }, [plan?.id]);

  const payable = plan
    ? promo
      ? Math.round(plan.priceEur * (1 - promo.discountPercent / 100) * 100) / 100
      : plan.priceEur
    : 0;

  const submitPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoError(null);
    void applyPromoCode(promoInput)
      .then((r) => {
        if (r.valid) {
          setPromo(r);
        } else {
          setPromo(null);
          setPromoError(t("agent.sub.promoInvalid"));
        }
      })
      .catch(() => {
        setPromo(null);
        setPromoError(t("agent.sub.promoInvalid"));
      })
      .finally(() => setPromoBusy(false));
  };

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={plan ? t("agent.sub.checkoutTitle", { plan: plan.name }) : ""}
    >
      {plan && (
        <div className="space-y-5">
          <div>
            <p className="font-display text-2xl font-extrabold tabular">
              {promo && (
                <span className="mr-2 text-base font-semibold text-muted line-through">{fmtEur(plan.priceEur, locale)}</span>
              )}
              {fmtEur(payable, locale)}
              <span className="text-xs font-semibold text-muted">
                {" "}{t("agent.sub.perMoNet")}{promo ? ` ${t("agent.sub.firstMonth")}` : ""}
              </span>
            </p>
            {fmtLocalEstimate(payable, locale) && (
              <p className="mt-0.5 text-xs font-semibold tabular text-muted">
                {fmtLocalEstimate(payable, locale)} <span className="font-normal">· {t("fx.note")}</span>
              </p>
            )}
          </div>

          <form onSubmit={submitPromo} className="space-y-2">
            <label htmlFor="checkout-promo" className="flex items-center gap-1.5 text-sm font-semibold">
              <Tag className="size-4" aria-hidden /> {t("agent.sub.promo")}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="checkout-promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder={t("agent.sub.promoPh")}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-border-strong px-3.5 text-base uppercase placeholder:normal-case sm:text-sm"
              />
              <Button type="submit" variant="secondary" loading={promoBusy} disabled={!promoInput.trim()}>
                {t("common.apply")}
              </Button>
            </div>
            {promo && (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Badge tone="success">{promo.code}</Badge> {t("agent.sub.promoAtCheckout", { p: promo.discountPercent })}
              </p>
            )}
            {promoError && <p role="alert" className="text-sm font-semibold text-err-700">{promoError}</p>}
          </form>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button
              loading={confirmBusy}
              onClick={() => {
                setConfirmBusy(true);
                /* Demo: Stripe Checkout would open with the optional promo attached */
                onConfirm(plan, promo);
              }}
            >
              {t("agent.sub.checkoutCta")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
