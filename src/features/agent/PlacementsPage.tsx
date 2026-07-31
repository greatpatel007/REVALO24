import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getAgentProperties, getPlacements, purchasePlacement } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { fmtEur, fmtLocalEstimate } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Select } from "@/shared/ui/Field";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";

/* Premium / Featured placements (§3.4.3): "Featured" = colored frame + badge,
   "Top" = pinned search position. Direct Stripe purchase per placement. */
export function PlacementsPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const placements = useApi(getPlacements);
  const properties = useApi(getAgentProperties);
  const { approved } = useAgentGate();
  const [propertyId, setPropertyId] = useState<number | "">("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const eligible = (properties.data ?? []).filter((p) => p.status === "active" && !p.offMarket);
  const boosted = (properties.data ?? []).filter((p) => p.placement);
  const loading = placements.loading || properties.loading;
  const error = placements.error ?? properties.error;
  const reload = () => { placements.reload(); properties.reload(); };

  const buy = (productId: number) => {
    if (!propertyId) { toast(t("agent.pl.selectFirst"), "error"); return; }
    setBusyId(productId);
    void purchasePlacement(productId, Number(propertyId))
      .then(() => {
        toast(t("agent.pl.buyDemo"), "info");
        properties.reload();
      })
      .catch(() => toast(t("common.actionFail"), "error"))
      .finally(() => setBusyId(null));
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.placements")}</h1>
      <p className="mb-6 text-sm text-muted">{t("agent.pl.sub")}</p>

      {/* Verification Gate — placements promote public listings */}
      <GateNotice className="mb-6" />

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
      )}
      {!loading && error && <ErrorState onRetry={reload} />}

      {!loading && !error && approved && eligible.length === 0 && (
        <EmptyState icon={<Star className="size-9" aria-hidden />} title={t("agent.pl.noEligibleTitle")}>
          {t("agent.pl.noEligibleBody")}
        </EmptyState>
      )}

      {!loading && !error && (
      <>
      <div className="mb-6 max-w-md">
        <Select label={t("agent.pl.select")} value={propertyId} onChange={(e) => setPropertyId(Number(e.target.value) || "")}
          disabled={!approved || eligible.length === 0}>
          <option value="">{t("agent.pl.selectPh")}</option>
          {eligible.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(placements.data ?? []).map((pl) => (
          <div key={pl.id} className={`min-w-0 rounded-xl border bg-white p-5 ${pl.tier === "top" ? "border-2 border-action" : "border-2 border-champagne-600"}`}>
            <div className="mb-2 flex items-center justify-between">
              <Badge tone={pl.tier === "top" ? "action" : "premium"}>{pl.tier === "top" ? t("card.top") : t("card.featured")}</Badge>
              <p className="text-right font-display text-xl font-extrabold tabular">
                {fmtEur(pl.priceEur, locale)}
                {/* CZ/PL display estimate — Stripe settles in EUR (§4.1) */}
                {fmtLocalEstimate(pl.priceEur, locale) && (
                  <span className="block text-xs font-semibold text-muted">{fmtLocalEstimate(pl.priceEur, locale)}</span>
                )}
              </p>
            </div>
            <h2 className="mb-1 font-display font-bold">{pl.label}</h2>
            <p className="mb-4 text-sm text-muted">
              {pl.tier === "top" ? t("agent.pl.topDesc") : t("agent.pl.featDesc")}
            </p>
            <Button className="w-full" loading={busyId === pl.id} disabled={!approved || eligible.length === 0}
              title={!approved ? t("agent.gate.incomplete") : undefined} onClick={() => buy(pl.id)}>
              {t("agent.pl.purchase", { n: pl.durationDays })}
            </Button>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-300 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-display text-base font-bold">{t("agent.pl.boosted")}</h2>
        {boosted.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">{t("agent.pl.none")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {boosted.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  {p.media.images[0] && <img src={p.media.images[0]} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />}
                  <p className="truncate text-sm font-semibold" title={p.title}>{p.title}</p>
                </div>
                <Badge tone={p.placement === "top" ? "action" : "premium"}>{p.placement === "top" ? t("card.top") : t("card.featured")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
      )}
    </div>
  );
}
