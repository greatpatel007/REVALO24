import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileArrowDown, Star } from "@phosphor-icons/react";
import { BoostDrawer, placementActionKey } from "@/features/agent/BoostDrawer";
import { getAgentProperties, getPlacementInvoices, getPlacements, purchasePlacement } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { fmtDate, fmtEurExact, fmtPrice, locationLabel } from "@/shared/lib/format";
import type { Property } from "@/shared/types";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Seg } from "@/shared/ui/Seg";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";

type PortfolioFilter = "all" | "boosted" | "organic";

/* Premium / Featured placements (§3.4.3) — listing-first (Idealista-style):
   portfolio of listings → Boost drawer with SERP preview → Stripe purchase. */
export function PlacementsPage() {
  const { t, locale, to } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const placements = useApi(getPlacements);
  const properties = useApi(getAgentProperties);
  const invoices = useApi(getPlacementInvoices);
  const { approved, state: gateState } = useAgentGate();
  const [focusId, setFocusId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<PortfolioFilter>("all");

  const eligible = (properties.data ?? []).filter((p) => p.status === "active" && !p.offMarket);
  const boostedCount = eligible.filter((p) => p.placement).length;
  const organicCount = eligible.length - boostedCount;
  const visible = eligible.filter((p) => {
    if (filter === "boosted") return !!p.placement;
    if (filter === "organic") return !p.placement;
    return true;
  });
  const loading = placements.loading || properties.loading;
  const error = placements.error ?? properties.error;
  const reload = () => { placements.reload(); properties.reload(); invoices.reload(); };
  const noEligible = approved && eligible.length === 0;

  const focusProperty = focusId != null ? eligible.find((p) => p.id === focusId) ?? null : null;

  /* Deep link ?listing= from Agent Listings Boost */
  useEffect(() => {
    const raw = params.get("listing");
    if (!raw || properties.loading || !properties.data) return;
    const id = Number(raw);
    if (!Number.isFinite(id)) return;
    const match = properties.data.find((p) => p.id === id && p.status === "active" && !p.offMarket);
    if (match) setFocusId(match.id);
    const next = new URLSearchParams(params);
    next.delete("listing");
    setParams(next, { replace: true });
  }, [params, properties.loading, properties.data, setParams]);

  const openBoost = (p: Property) => {
    if (!approved) return;
    setFocusId(p.id);
  };

  const confirmBoost = (productId: number) => {
    if (!focusProperty) return;
    setBusy(true);
    void purchasePlacement(productId, focusProperty.id)
      .then(() => {
        toast(t("agent.pl.buyDemo"), "info");
        setFocusId(null);
        properties.reload();
        invoices.reload();
      })
      .catch(() => toast(t("common.actionFail"), "error"))
      .finally(() => setBusy(false));
  };

  const actionLabel = (p: Property) => {
    const key = placementActionKey(p.placement);
    return t(`agent.pl.${key}`);
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.placements")}</h1>
      <p className="mb-6 text-sm text-muted">{t("agent.pl.sub")}</p>

      <GateNotice className="mb-6" />

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}
      {!loading && error && <ErrorState onRetry={reload} />}

      {!loading && !error && noEligible && (
        <EmptyState icon={<Star className="size-9" aria-hidden />} title={t("agent.pl.noEligibleTitle")}>
          <p className="mb-4">{t("agent.pl.noEligibleBody")}</p>
          <Link
            to={to("/agent/listings/new")}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-action px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-action-hover active:scale-[0.96]"
          >
            {t("agent.pl.noEligibleCta")}
          </Link>
        </EmptyState>
      )}

      {!loading && !error && !noEligible && (
      <section className="mb-8" aria-labelledby="portfolio-heading">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 id="portfolio-heading" className="font-display text-base font-bold">{t("agent.pl.portfolio")}</h2>
          <Seg
            ariaLabel={t("agent.pl.portfolio")}
            wrap
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all" as const, label: t("agent.pl.tabAll", { n: eligible.length }) },
              { value: "boosted" as const, label: t("agent.pl.tabBoosted", { n: boostedCount }) },
              { value: "organic" as const, label: t("agent.pl.tabOrganic", { n: organicCount }) },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-muted">
            {filter === "boosted" ? t("agent.pl.emptyBoosted") : t("agent.pl.emptyOrganic")}
          </p>
        ) : (
        <>
        <ul className="space-y-2 lg:hidden">
          {visible.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-300 bg-white p-3">
              <div className="flex gap-3">
                {p.media.images[0] && (
                  <img
                    src={p.media.images[0]}
                    alt=""
                    className="h-16 w-20 shrink-0 rounded-md object-cover outline outline-1 outline-black/10"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold" title={p.title}>{p.title}</p>
                  <p className="truncate text-xs text-muted">{locationLabel(p)}</p>
                  <p className="mt-0.5 text-sm font-bold tabular">{fmtPrice(p, locale)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {p.placement
                      ? <Badge tone={p.placement === "top" ? "action" : "premium"}>{p.placement === "top" ? t("card.top") : t("card.featured")}</Badge>
                      : <span className="text-xs font-semibold text-muted">{t("agent.pl.organic")}</span>}
                    {p.placementEndsAt && (
                      <span className="text-xs text-muted">{t("agent.pl.ends", { date: fmtDate(p.placementEndsAt, locale) })}</span>
                    )}
                    <Button
                      size="sm"
                      className="ml-auto"
                      disabled={!approved}
                      title={!approved ? t(`agent.gate.${gateState}`) : undefined}
                      onClick={() => openBoost(p)}
                    >
                      {actionLabel(p)}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-300 bg-white scrollbar-thin lg:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="px-5 py-3 font-bold">{t("agent.list.thProperty")}</th>
                <th className="px-5 py-3 font-bold">{t("agent.pl.thStatus")}</th>
                <th className="px-5 py-3 font-bold">{t("agent.pl.thEnds")}</th>
                <th className="px-5 py-3 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-canvas">
                  <td className="px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {p.media.images[0] && (
                        <img
                          src={p.media.images[0]}
                          alt=""
                          className="h-11 w-16 shrink-0 rounded-md object-cover outline outline-1 outline-black/10"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold" title={p.title}>{p.title}</p>
                        <p className="truncate text-xs text-muted">{locationLabel(p)}</p>
                        <p className="text-xs font-bold tabular">{fmtPrice(p, locale)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    {p.placement
                      ? <Badge tone={p.placement === "top" ? "action" : "premium"}>{p.placement === "top" ? t("card.top") : t("card.featured")}</Badge>
                      : <span className="text-muted">{t("agent.pl.organic")}</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">
                    {p.placementEndsAt ? fmtDate(p.placementEndsAt, locale) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      size="sm"
                      disabled={!approved}
                      title={!approved ? t(`agent.gate.${gateState}`) : undefined}
                      onClick={() => openBoost(p)}
                    >
                      {actionLabel(p)}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </section>
      )}

      {/* Purchase history — demoted */}
      {!loading && !error && (
      <section className={`rounded-xl border border-slate-200 bg-white ${noEligible ? "mt-6" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-800">{t("agent.pl.history")}</h2>
          <Link to={to("/agent/subscription")} className="text-xs font-semibold text-blue-700 hover:underline">
            {t("agent.pl.allBilling")}
          </Link>
        </div>
        {invoices.error && (
          <div className="p-5"><ErrorState onRetry={invoices.reload} /></div>
        )}
        {!invoices.error && invoices.loading && (
          <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        )}
        {!invoices.error && !invoices.loading && (invoices.data?.length ?? 0) === 0 && (
          <p className="px-5 py-5 text-sm text-muted">{t("agent.pl.historyEmpty")}</p>
        )}
        {!invoices.error && !invoices.loading && (invoices.data?.length ?? 0) > 0 && (
          <>
            <ul className="divide-y divide-slate-200 md:hidden">
              {(invoices.data ?? []).map((inv) => {
                const vatAmt = inv.amountEur * (inv.vatRate / 100);
                return (
                  <li key={inv.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{inv.id}</p>
                        <p className="text-xs text-muted">{fmtDate(inv.date, locale)}</p>
                      </div>
                      <a href={inv.pdfUrl} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                        <FileArrowDown className="size-4" aria-hidden /> PDF
                      </a>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{inv.description}</p>
                    <p className="mt-1 text-sm font-bold tabular">{fmtEurExact(inv.amountEur + vatAmt, locale)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto scrollbar-thin md:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-muted">
                    {[t("agent.sub.thInvoice"), t("agent.sub.thDesc"), t("agent.sub.thAmount"), ""].map((h, i) => (
                      <th key={i} className="px-5 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoices.data ?? []).map((inv) => {
                    const vatAmt = inv.amountEur * (inv.vatRate / 100);
                    return (
                      <tr key={inv.id} className="hover:bg-canvas">
                        <td className="whitespace-nowrap px-5 py-2.5">
                          <p className="font-semibold">{inv.id}</p>
                          <p className="text-xs text-muted">{fmtDate(inv.date, locale)}</p>
                        </td>
                        <td className="px-5 py-2.5 text-slate-800">{inv.description}</td>
                        <td className="whitespace-nowrap px-5 py-2.5 font-semibold tabular">
                          {fmtEurExact(inv.amountEur + vatAmt, locale)}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <a href={inv.pdfUrl} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                            <FileArrowDown className="size-3.5" aria-hidden /> PDF
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      )}

      <BoostDrawer
        property={focusProperty}
        products={placements.data ?? []}
        open={!!focusProperty}
        busy={busy}
        onClose={() => setFocusId(null)}
        onConfirm={confirmBoost}
      />
    </div>
  );
}
