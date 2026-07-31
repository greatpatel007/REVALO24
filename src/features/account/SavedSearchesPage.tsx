import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRinging, Trash } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { deleteSavedSearch, getSavedSearches, updateSavedSearch } from "@/features/account/api";
import { fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Seg } from "@/shared/ui/Seg";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { AlertFrequency, PropertyFilters } from "@/shared/types";

function filtersToQuery(f: PropertyFilters): string {
  const q = new URLSearchParams();
  if (f.type) q.set("type", f.type);
  if (f.q) q.set("q", f.q);
  if (f.propertyType) q.set("kind", f.propertyType);
  if (f.priceMin) q.set("min", String(f.priceMin));
  if (f.priceMax) q.set("max", String(f.priceMax));
  if (f.bedroomsMin) q.set("beds", String(f.bedroomsMin));
  if (f.radiusKm) q.set("radius", String(f.radiusKm));
  if (f.energyClass) q.set("energy", f.energyClass);
  if (f.amenities?.length) q.set("amen", f.amenities.join(","));
  return q.toString();
}

const FREQ_OPTIONS: { value: AlertFrequency; labelKey: string }[] = [
  { value: "instant", labelKey: "freq.instant" },
  { value: "daily", labelKey: "freq.daily" },
  { value: "weekly", labelKey: "freq.weekly" },
  { value: "off", labelKey: "freq.off" },
];

export function SavedSearchesPage() {
  const { t, to, locale } = useI18n();
  const toast = useToast();
  const { data, loading, reload } = useApi(getSavedSearches);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; label: string } | null>(null);

  const onDelete = (id: number) =>
    void deleteSavedSearch(id).then(() => {
      toast(t("account.ss.removed"), "info");
      setPendingDelete(null);
      reload();
    });

  const onFrequency = (id: number, alertFrequency: AlertFrequency) =>
    void updateSavedSearch(id, { alertFrequency }).then(() => {
      toast(alertFrequency === "off" ? t("account.ss.alertsPaused") : t("account.ss.alertsSet", { freq: t(`freq.${alertFrequency}`) }));
      reload();
    });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("account.searches")}</h1>
      <p className="mb-6 text-sm text-muted">{t("account.ss.sub")}</p>
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : data && data.length > 0 ? (
        <ul className="space-y-3">
          {data.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-300 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{s.label}</p>
                  <p className="text-xs text-muted">
                    {t("account.savedOn", { date: fmtDate(s.createdAt, locale) })}
                    {s.newMatches > 0 && <span className="ml-2 font-bold text-emerald-700">● {t("account.ss.newMatches", { n: s.newMatches })}</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`${to("/properties")}?${filtersToQuery(s.filters)}`}>
                    <Button size="sm" variant="secondary">{t("account.ss.run")}</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete({ id: s.id, label: s.label })} aria-label={t("account.ss.deleteAria", { label: s.label })}>
                    <Trash className="size-4.5" aria-hidden />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <BellRinging weight="duotone" className="size-4 text-blue-600" aria-hidden /> {t("account.ss.alerts")}
                </span>
                <Seg
                  ariaLabel={t("account.ss.freqAria", { label: s.label })}
                  size="sm"
                  wrap
                  options={FREQ_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                  value={s.alertFrequency}
                  onChange={(v) => onFrequency(s.id, v)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<BellRinging className="size-9" aria-hidden />} title={t("account.ss.emptyTitle")}>
          {t("account.ss.emptyBody")}
        </EmptyState>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("account.ss.deleteTitle")}
        body={t("account.ss.deleteBody", { label: pendingDelete?.label ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => pendingDelete && onDelete(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
