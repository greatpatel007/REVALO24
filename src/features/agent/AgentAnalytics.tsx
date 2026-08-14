import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChartBar, CursorClick, Eye } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getListingTraffic } from "@/features/agent/api";
import { StatusBadge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Seg } from "@/shared/ui/Seg";
import { Skeleton } from "@/shared/ui/Skeleton";

type SortKey = "views" | "clicks";

/**
 * Views / clicks drill-down from the dashboard KPI — which listing got how much traffic.
 */
export function AgentAnalytics() {
  const { t, to, locale } = useI18n();
  const traffic = useApi(getListingTraffic);
  const [sort, setSort] = useState<SortKey>("views");

  const rows = useMemo(() => {
    const list = [...(traffic.data ?? [])];
    list.sort((a, b) =>
      sort === "views" ? b.viewsTotal - a.viewsTotal : b.clicksTotal - a.clicksTotal,
    );
    return list;
  }, [traffic.data, sort]);

  const totals = useMemo(() => {
    const list = traffic.data ?? [];
    return {
      views: list.reduce((s, r) => s + r.viewsTotal, 0),
      clicks: list.reduce((s, r) => s + r.clicksTotal, 0),
    };
  }, [traffic.data]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <Link
            to={to("/agent")}
            className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> {t("agent.analytics.back")}
          </Link>
          <h1 className="font-display text-2xl font-extrabold">{t("agent.analytics.title")}</h1>
          <p className="mt-0.5 text-sm text-muted">{t("agent.analytics.sub")}</p>
        </div>
        <Seg
          ariaLabel={t("agent.analytics.sortAria")}
          size="sm"
          className="!flex w-full sm:!inline-flex sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          value={sort}
          onChange={setSort}
          options={[
            { value: "views", label: t("agent.dash.views") },
            { value: "clicks", label: t("agent.dash.clicks") },
          ]}
        />
      </div>

      {!traffic.loading && !traffic.error && traffic.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Eye weight="duotone" className="size-4 text-blue-600" aria-hidden />
              {t("agent.analytics.totalViews")}
            </p>
            <p className="font-display text-2xl font-extrabold tabular">{totals.views.toLocaleString(locale)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <CursorClick weight="duotone" className="size-4 text-blue-600" aria-hidden />
              {t("agent.analytics.totalClicks")}
            </p>
            <p className="font-display text-2xl font-extrabold tabular">{totals.clicks.toLocaleString(locale)}</p>
          </div>
        </div>
      )}

      {traffic.loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}
      {traffic.error && <ErrorState onRetry={traffic.reload} />}
      {!traffic.loading && !traffic.error && rows.length === 0 && (
        <EmptyState
          icon={<ChartBar weight="duotone" className="size-9" aria-hidden />}
          title={t("agent.analytics.emptyTitle")}
        >
          <p className="mb-3">{t("agent.analytics.emptyBody")}</p>
          <Link to={to("/agent/listings/new")} className="text-sm font-semibold text-blue-700 hover:underline">
            {t("agent.newListing")}
          </Link>
        </EmptyState>
      )}

      {rows.length > 0 && (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={to(`/agent/listings/${r.id}/edit`)}
                  className="block rounded-xl border border-slate-300 bg-white p-4 transition-colors hover:border-action hover:bg-blue-50/30"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-navy">{r.title}</p>
                      <p className="text-xs text-muted">
                        {r.city}, {r.country}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t("agent.dash.views")}</dt>
                      <dd className="font-bold tabular">{r.viewsTotal.toLocaleString(locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t("agent.dash.clicks")}</dt>
                      <dd className="font-bold tabular">{r.clicksTotal.toLocaleString(locale)}</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-300 bg-white scrollbar-thin lg:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-canvas/80 text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">{t("agent.list.thProperty")}</th>
                  <th className="px-3 py-3">{t("agent.list.thStatus")}</th>
                  <th className="px-3 py-3 text-right">{t("agent.dash.views")}</th>
                  <th className="px-3 py-3 text-right">{t("agent.dash.clicks")}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy">{r.title}</p>
                      <p className="text-xs text-muted">
                        {r.city}, {r.country}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{r.viewsTotal.toLocaleString(locale)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{r.clicksTotal.toLocaleString(locale)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={to(`/agent/listings/${r.id}/edit`)}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {t("agent.analytics.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
