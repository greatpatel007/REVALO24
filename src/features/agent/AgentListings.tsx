import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HouseLine, LockKey, Warning, X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { bulkAction, getAgentProperties, getSubscription } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { fmtPrice, locationLabel } from "@/shared/lib/format";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Seg } from "@/shared/ui/Seg";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { PropertyStatus } from "@/shared/types";

const STATUS_FILTERS = ["all", "active", "draft", "sold", "rented"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function isStatusFilter(v: string | null): v is StatusFilter {
  return !!v && (STATUS_FILTERS as readonly string[]).includes(v);
}

export function AgentListings() {
  const { t, to, locale } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get("status");
  const statusFilter: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";
  const { data, loading, error, reload } = useApi(getAgentProperties);
  const sub = useApi(getSubscription);
  const { approved } = useAgentGate();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allRows = data ?? [];
  const rows = useMemo(
    () => (statusFilter === "all" ? allRows : allRows.filter((p) => p.status === statusFilter)),
    [allRows, statusFilter],
  );
  const allChecked = rows.length > 0 && rows.every((p) => selected.has(p.id));
  /* Quota edge: at/over the plan limit the New-listing CTA locks with an upsell */
  const quotaFull = Boolean(sub.data && sub.data.listingsUsed >= sub.data.listingQuota);
  const canCreate = approved && !quotaFull;

  const setStatusFilter = (v: StatusFilter) => {
    setSelected(new Set());
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("status");
    else next.set("status", v);
    setParams(next, { replace: true });
  };

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const run = (action: "activate" | "pause" | "delete" | "sold") => {
    setBusy(true);
    void bulkAction([...selected], action)
      .then(() => {
        toast(t("agent.list.updated", { n: selected.size }));
        setSelected(new Set());
        setConfirmDelete(false);
        reload();
      })
      .catch(() => toast(t("agent.list.bulkFail"), "error"))
      .finally(() => setBusy(false));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{t("agent.nav.listings")}</h1>
          <p className="text-sm text-muted">{t("agent.list.sub", { n: rows.length })}</p>
        </div>
        {canCreate ? (
          <Link to={to("/agent/listings/new")}><Button>{t("agent.newListing")}</Button></Link>
        ) : (
          <Button disabled title={t(approved ? "agent.list.quotaFull" : "agent.gate.incomplete")}>{t("agent.newListing")}</Button>
        )}
      </div>

      <div className="mb-4">
        <Seg
          ariaLabel={t("agent.list.filterStatus")}
          size="sm"
          wrap
          className="!flex w-full sm:!inline-flex [&>button]:flex-1 sm:[&>button]:flex-none"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={STATUS_FILTERS.map((s) => ({
            value: s,
            label: s === "all" ? t("agent.list.filterAll") : t(`status.${s}` as `status.${PropertyStatus}`),
          }))}
        />
      </div>

      {/* Verification Gate — restricted accounts can't publish */}
      <GateNotice className="mb-4" />

      {approved && quotaFull && sub.data && (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn-700">
          {t("agent.list.quotaBanner", { u: sub.data.listingsUsed, q: sub.data.listingQuota })}
          <Link to={to("/agent/subscription")} className="underline">{t("agent.dash.upgrade")}</Link>
        </p>
      )}

      {selected.size > 0 && (
        <div className="sticky top-2 z-30 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-action bg-blue-50 px-4 py-2.5 shadow-elevation-sm">
          <span className="mr-1 text-sm font-bold text-blue-700">{t("agent.list.selected", { n: selected.size })}</span>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("activate")}>{t("agent.list.activate")}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("pause")}>{t("agent.list.pause")}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => run("sold")}>{t("agent.list.markSold")}</Button>
          <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>{t("agent.list.delete")}</Button>
          {/* Escape hatch: deselect everything without acting */}
          <Button size="sm" variant="ghost" className="ml-auto" disabled={busy} onClick={() => setSelected(new Set())}>
            <X className="size-4" aria-hidden /> {t("common.cancel")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t("agent.list.confirmTitle", { n: selected.size })}
        body={t("agent.list.confirmBody")}
        confirmLabel={t("agent.list.confirmCta")}
        busy={busy}
        onConfirm={() => run("delete")}
        onClose={() => setConfirmDelete(false)}
      />

      {!loading && error && <ErrorState onRetry={reload} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState icon={<HouseLine className="size-9" aria-hidden />} title={t("agent.list.emptyTitle")}>
          {approved ? t("agent.list.emptyBody") : t("agent.list.emptyGated")}
          {approved && (
            <span className="mt-4 flex justify-center gap-2">
              <Link to={to("/agent/listings/new")}><Button size="sm">{t("agent.newListing")}</Button></Link>
              <Link to={to("/agent/import")}><Button size="sm" variant="secondary">{t("agent.nav.import")}</Button></Link>
            </span>
          )}
        </EmptyState>
      )}

      {/* Mobile: stacked cards instead of a horizontally-scrolling table */}
      {!error && (loading || rows.length > 0) && (
      <div className="lg:hidden">
        {rows.length > 0 && (
          <label className="mb-3 flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" checked={allChecked}
              onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((p) => p.id)))}
              className="size-5 cursor-pointer accent-action" />
            {t("agent.list.selectAll")}
          </label>
        )}
        <ul className="grid grid-cols-1 gap-3">
          {loading
            ? Array.from({ length: 4 }, (_, i) => <li key={i}><Skeleton className="h-28 w-full rounded-xl" /></li>)
            : rows.map((p) => (
                <li key={p.id}
                  className={`min-w-0 rounded-xl border bg-white p-3.5 ${selected.has(p.id) ? "border-action bg-blue-50/60" : "border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" aria-label={t("agent.list.selectOne", { title: p.title })} checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action" />
                    {p.offMarket ? (
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-navy">
                        {p.media.images[0] && (
                          <img src={p.media.images[0]} alt="" aria-hidden className="h-full w-full object-cover blur-[3px] brightness-[0.55]" />
                        )}
                        <LockKey weight="duotone" className="absolute inset-0 m-auto size-4.5 text-champagne-100" aria-hidden />
                      </div>
                    ) : (
                      <img src={p.media.images[0]} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" title={p.title}>{p.title}</p>
                      <p className="truncate text-xs text-muted" title={locationLabel(p)}>{locationLabel(p)}</p>
                      {p.masterProjectId && <Badge tone="info" className="mt-1">{t("agent.list.subUnit")}</Badge>}
                    </div>
                  </div>
                  {p.crmLinked && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-warn-700">
                      <Warning weight="fill" className="size-3 shrink-0" aria-hidden />
                      {t("agent.list.crmWarn")}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-3 text-xs">
                    <span className="text-sm font-bold tabular">{fmtPrice(p, locale)}</span>
                    <StatusBadge status={p.status} />
                    <span className="tabular text-muted">{t("agent.list.viewsLine", { n: (p.viewsTotal ?? 0).toLocaleString(locale) })}</span>
                    <span className="tabular text-muted">{t("agent.list.clicksLine", { n: (p.clicksTotal ?? 0).toLocaleString(locale) })}</span>
                    <span className="ml-auto flex items-center gap-3">
                      {p.placement
                        ? <Badge tone={p.placement === "top" ? "action" : "premium"}>{p.placement === "top" ? t("card.top") : t("card.featured")}</Badge>
                        : <Link to={to(`/agent/placements?listing=${p.id}`)} className="font-semibold text-blue-700 hover:underline">{t("agent.list.boost")}</Link>}
                      <Link to={to(`/agent/listings/${p.id}/edit`)} className="font-semibold text-blue-700 hover:underline">{t("agent.list.edit")}</Link>
                    </span>
                  </div>
                </li>
              ))}
        </ul>
      </div>
      )}

      {!error && (loading || rows.length > 0) && (
      <div className="hidden overflow-x-auto rounded-xl border border-slate-300 bg-white scrollbar-thin lg:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="w-12 px-4 py-3">
                <input type="checkbox" aria-label={t("agent.list.selectAll")} checked={allChecked}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((p) => p.id)))}
                  className="size-5 cursor-pointer accent-action" />
              </th>
              <th className="px-3 py-3 font-bold">{t("agent.list.thProperty")}</th>
              <th className="px-3 py-3 font-bold">{t("search.price")}</th>
              <th className="px-3 py-3 font-bold">{t("agent.list.thStatus")}</th>
              <th className="px-3 py-3 font-bold">{t("agent.dash.views")}</th>
              <th className="px-3 py-3 font-bold">{t("agent.dash.clicks")}</th>
              <th className="px-3 py-3 font-bold">{t("agent.nav.placements")}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-12 w-full" /></td></tr>
                ))
              : rows.map((p) => (
                  <tr key={p.id} className={selected.has(p.id) ? "bg-blue-50/60" : "hover:bg-canvas"}>
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={t("agent.list.selectOne", { title: p.title })} checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)} className="size-5 cursor-pointer accent-action" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {p.offMarket ? (
                          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-navy">
                            {p.media.images[0] && (
                              <img src={p.media.images[0]} alt="" aria-hidden className="h-full w-full object-cover blur-[3px] brightness-[0.55]" />
                            )}
                            <LockKey weight="duotone" className="absolute inset-0 m-auto size-4.5 text-champagne-100" aria-hidden />
                          </div>
                        ) : (
                          <img src={p.media.images[0]} alt="" className="h-11 w-16 shrink-0 rounded-md object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold" title={p.title}>
                            {p.title}
                            {p.masterProjectId && <Badge tone="info" className="ml-2">{t("agent.list.subUnit")}</Badge>}
                          </p>
                          <p className="truncate text-xs text-muted" title={locationLabel(p)}>{locationLabel(p)}</p>
                          {p.crmLinked && (
                            <p className="flex items-center gap-1 text-xs font-semibold text-warn-700">
                              <Warning weight="fill" className="size-3 shrink-0" aria-hidden />
                              {t("agent.list.crmWarn")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-bold tabular">{fmtPrice(p, locale)}</td>
                    <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-3 tabular text-muted">{p.viewsTotal?.toLocaleString(locale)}</td>
                    <td className="px-3 py-3 tabular text-muted">{(p.clicksTotal ?? 0).toLocaleString(locale)}</td>
                    <td className="px-3 py-3">
                      {p.placement
                        ? <Badge tone={p.placement === "top" ? "action" : "premium"}>{p.placement === "top" ? t("card.top") : t("card.featured")}</Badge>
                        : <Link to={to(`/agent/placements?listing=${p.id}`)} className="text-xs font-semibold text-blue-700 hover:underline">{t("agent.list.boost")}</Link>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link to={to(`/agent/listings/${p.id}/edit`)} className="font-semibold text-blue-700 hover:underline">{t("agent.list.edit")}</Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
