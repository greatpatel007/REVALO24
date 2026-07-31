import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight, ArrowUpRight, CaretRight, ChartBar, CursorClick, DownloadSimple,
  EnvelopeSimple, Eye, HouseLine, Plus, SealCheck, ShieldCheck, Sparkle, Star, Warning,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getAgentInquiries, getAgentStats, getSubscription } from "@/features/agent/api";
import { useAgentGate } from "@/features/agent/gate";
import { fmtDate } from "@/shared/lib/format";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { BarChart } from "@/shared/ui/BarChart";
import { Seg } from "@/shared/ui/Seg";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { AgentProfile } from "@/shared/types";

/* Agent dashboard, organized around "what needs my attention today":
   greeting header → actionable attention strip → KPI row with deltas →
   chart + recent inquiries | plan usage + quick actions. */
export function AgentDashboard() {
  const { user } = useAuth();
  const { t, to, locale } = useI18n();
  const toast = useToast();
  const agent = user as AgentProfile;
  const { approved, state: gateState } = useAgentGate();
  const stats = useApi(getAgentStats);
  const sub = useApi(getSubscription);
  const inq = useApi(getAgentInquiries);
  const [range, setRange] = useState<7 | 30>(30);
  const [metric, setMetric] = useState<"views" | "clicks">("views");

  const daily = stats.data?.daily.slice(-range) ?? [];
  const rangeTotal = daily.reduce((sum, d) => sum + d[metric], 0);
  const rangeAvg = daily.length ? Math.round(rangeTotal / daily.length) : 0;
  const chartEmpty = Boolean(stats.data) && stats.data!.daily.every((d) => d.views === 0 && d.clicks === 0);

  /* 7-day deltas from the 30-day series so KPI numbers carry a trend */
  const sumLast = (key: "views" | "clicks", from: number, len: number) =>
    (stats.data?.daily ?? []).slice(from, from + len).reduce((s, d) => s + d[key], 0);
  const delta = (key: "views" | "clicks") => {
    const cur = sumLast(key, 23, 7);
    const prev = sumLast(key, 16, 7);
    return { cur, pct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null };
  };
  const dViews = delta("views");
  const dClicks = delta("clicks");

  const newInq = (inq.data ?? []).filter((q) => q.status === "sent").length;
  const recentInquiries = [...(inq.data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  const quotaPct = sub.data ? sub.data.listingsUsed / sub.data.listingQuota : 0;
  const quotaFull = Boolean(sub.data && sub.data.listingsUsed >= sub.data.listingQuota);
  const canCreate = approved && !quotaFull;

  const exportCsv = () => {
    if (!stats.data) return;
    const rows = ["date,views,clicks", ...stats.data.daily.map((d) => `${d.date},${d.views},${d.clicks}`)];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = "revalo24-stats.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast(t("agent.dash.csvDone"));
  };

  /* "Needs attention" strip — renders only when something is actionable */
  const attention: { id: string; tone: "warn" | "info" | "action"; icon: React.ReactNode; text: string; cta: string; href: string }[] = [];
  if (!approved) {
    attention.push({
      id: "gate", tone: gateState === "pending" ? "info" : "warn",
      icon: <ShieldCheck weight="duotone" className="size-5" aria-hidden />,
      text: t(`agent.gate.${gateState}`),
      cta: gateState === "pending" ? t("agent.dash.viewStatus") : t("agent.gate.cta"),
      href: to("/agent/profile"),
    });
  }
  if (newInq > 0) {
    attention.push({
      id: "inq", tone: "action",
      icon: <EnvelopeSimple weight="duotone" className="size-5" aria-hidden />,
      text: t("agent.dash.attnInq", { n: newInq }),
      cta: t("agent.dash.reply"), href: to("/agent/inquiries"),
    });
  }
  if (sub.data && quotaPct >= 0.85) {
    attention.push({
      id: "quota", tone: "warn",
      icon: <Warning weight="duotone" className="size-5" aria-hidden />,
      text: t(quotaFull ? "agent.dash.attnQuotaFull" : "agent.dash.attnQuota", { u: sub.data.listingsUsed, q: sub.data.listingQuota }),
      cta: t("agent.dash.upgrade"), href: to("/agent/subscription"),
    });
  }
  const attnTone = { warn: "border-warn-600/30 bg-warn-50 text-warn-700", info: "border-info-600/30 bg-info-50 text-info-700", action: "border-action/30 bg-blue-50 text-blue-700" };

  const kpis: { id: string; label: string; value: number | undefined; sub?: string; pct?: number | null; icon: Icon; chip: string; href?: string }[] = [
    {
      id: "active", label: t("agent.dash.kpiActive"), value: stats.data?.activeCount,
      sub: stats.data ? t("agent.dash.ofTotal", { n: stats.data.totalProperties }) : undefined,
      icon: HouseLine, chip: "bg-blue-50 text-blue-600", href: to("/agent/listings"),
    },
    {
      id: "views", label: t("agent.dash.kpiViews7"), value: stats.data ? dViews.cur : undefined,
      pct: dViews.pct, icon: Eye, chip: "bg-emerald-50 text-emerald-600",
    },
    {
      id: "clicks", label: t("agent.dash.kpiClicks7"), value: stats.data ? dClicks.cur : undefined,
      pct: dClicks.pct, icon: CursorClick, chip: "bg-champagne-100 text-champagne-700",
    },
    {
      id: "inq", label: t("agent.dash.kpiNewInq"), value: inq.data ? newInq : undefined,
      sub: inq.data ? t("agent.dash.ofTotal", { n: inq.data.length }) : undefined,
      icon: EnvelopeSimple, chip: "bg-info-50 text-info-600", href: to("/agent/inquiries"),
    },
  ];

  const quickActions = [
    { label: t("agent.newListing"), icon: Plus, href: to("/agent/listings/new"), gated: true },
    { label: t("agent.nav.ai"), icon: Sparkle, href: to("/agent/ai"), gated: false },
    { label: t("agent.nav.import"), icon: DownloadSimple, href: to("/agent/import"), gated: false },
    { label: t("agent.nav.placements"), icon: Star, href: to("/agent/placements"), gated: false },
  ];

  return (
    <div>
      {/* Header: greeting + localized date + verification chip + one primary CTA */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold">
            {t("agent.dash.hello", { name: (agent.name || agent.email).split(" ")[0] })}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
            {approved ? (
              <Badge tone="action"><SealCheck weight="fill" className="size-3.5 shrink-0" aria-hidden /> {t("agent.verifiedBadge")}</Badge>
            ) : (
              <StatusBadge status={gateState} />
            )}
          </p>
        </div>
        {canCreate ? (
          <Link to={to("/agent/listings/new")} className="max-sm:w-full">
            <Button className="max-sm:w-full">{t("agent.newListing")}</Button>
          </Link>
        ) : (
          <Button disabled className="max-sm:w-full" title={t(approved ? "agent.list.quotaFull" : "agent.gate.incomplete")}>
            {t("agent.newListing")}
          </Button>
        )}
      </div>

      {/* Needs-attention strip */}
      {/* auto-fit keeps a lone card full-width; flex-wrap lets long localized CTAs drop to their own line */}
      {attention.length > 0 && (
        <section aria-label={t("agent.dash.attention")} className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          {attention.map((a) => (
            <Link key={a.id} to={a.href}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 transition-shadow hover:shadow-elevation-sm ${attnTone[a.tone]}`}>
              {a.icon}
              <span className="min-w-0 flex-1 basis-48 text-sm font-semibold">{a.text}</span>
              <span className="ml-auto flex shrink-0 items-center gap-0.5 text-sm font-bold">
                {a.cta} <CaretRight weight="bold" className="size-3.5" aria-hidden />
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* KPI row — deltas vs the previous 7 days give the numbers meaning */}
      {(stats.error || inq.error) && <ErrorState className="mb-5 sm:mb-6" onRetry={() => { stats.reload(); inq.reload(); }} />}
      {!stats.error && !inq.error && (
      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <>
              <span className={`mb-3 flex size-9 items-center justify-center rounded-lg ${k.chip}`} aria-hidden>
                <k.icon weight="duotone" className="size-5" />
              </span>
              {k.value === undefined
                ? <Skeleton className="h-8 w-16" />
                : (
                  <p className="flex flex-wrap items-baseline gap-x-2 font-display text-2xl font-extrabold tabular sm:text-3xl">
                    {k.value.toLocaleString(locale)}
                    {typeof k.pct === "number" && (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${k.pct >= 0 ? "text-emerald-700" : "text-err-700"}`}
                        title={t("agent.dash.vsPrev")}>
                        {k.pct >= 0 ? <ArrowUpRight weight="bold" className="size-3" aria-hidden /> : <ArrowDownRight weight="bold" className="size-3" aria-hidden />}
                        {Math.abs(k.pct)}%
                      </span>
                    )}
                    {k.sub && <span className="text-xs font-semibold text-muted">{k.sub}</span>}
                  </p>
                )}
              <p className="text-xs font-semibold text-muted sm:text-sm">{k.label}</p>
            </>
          );
          const cls = "rounded-xl border border-slate-300 bg-white p-4 sm:p-5";
          return k.href ? (
            <Link key={k.id} to={k.href} className={`${cls} block transition-colors hover:border-action hover:bg-blue-50/40`}>{body}</Link>
          ) : (
            <div key={k.id} className={cls}>{body}</div>
          );
        })}
      </div>
      )}

      {/* min-w-0 down the grid chain: the nowrap inquiry previews must not set the page's min width */}
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left column: performance chart + latest inquiries */}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6">
          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-base font-bold">
                  {t("agent.dash.chart", { metric: t(metric === "views" ? "agent.dash.views" : "agent.dash.clicks"), n: range })}
                </h2>
                {stats.data && !chartEmpty && (
                  <p className="text-xs tabular text-muted">
                    {t("agent.dash.chartTotal", { total: rangeTotal.toLocaleString(locale), avg: rangeAvg })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Seg ariaLabel={t("agent.dash.metricAria")} size="sm" value={metric} onChange={setMetric}
                  options={[{ value: "views", label: t("agent.dash.views") }, { value: "clicks", label: t("agent.dash.clicks") }]} />
                <Seg ariaLabel={t("agent.dash.rangeAria")} size="sm" value={range} onChange={setRange}
                  options={[{ value: 7, label: t("agent.dash.days7") }, { value: 30, label: t("agent.dash.days30") }]} />
                {/* CSV export demoted to an icon button — secondary action */}
                <Button size="sm" variant="ghost" onClick={exportCsv} title={t("agent.dash.csvAria")} aria-label={t("agent.dash.csvAria")}>
                  <DownloadSimple className="size-4.5" aria-hidden />
                </Button>
              </div>
            </div>
            {stats.loading && <Skeleton className="h-36 w-full sm:h-44" />}
            {stats.error && <ErrorState onRetry={stats.reload} />}
            {stats.data && chartEmpty && (
              <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg bg-canvas text-center sm:h-44">
                <ChartBar weight="duotone" className="size-8 text-slate-500" aria-hidden />
                <p className="max-w-sm px-4 text-sm font-semibold text-muted">{t("agent.dash.chartEmpty")}</p>
              </div>
            )}
            {stats.data && !chartEmpty && <BarChart data={daily} metric={metric} />}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold">{t("agent.dash.recentInq")}</h2>
              <Link to={to("/agent/inquiries")} className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">
                {t("agent.dash.viewAll")} →
              </Link>
            </div>
            {inq.loading && <Skeleton className="h-28 w-full" />}
            {inq.error && <ErrorState onRetry={inq.reload} />}
            {!inq.loading && !inq.error && recentInquiries.length === 0 && (
              <p className="py-4 text-sm text-muted">{t("agent.inq.empty")}</p>
            )}
            <ul className="divide-y divide-slate-200">
              {recentInquiries.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    to={to("/agent/inquiries")}
                    className="-mx-2 min-w-0 flex-1 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100"
                  >
                    <span className="block truncate text-sm font-semibold" title={`${q.name} · ${q.propertyTitle}`}>
                      {q.name} <span className="font-normal text-muted">· {q.propertyTitle}</span>
                    </span>
                    <span className="block truncate text-xs text-muted" title={q.message}>{q.message}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted max-lg:hidden">{fmtDate(q.createdAt, locale)}</span>
                    <Badge tone={q.status === "sent" ? "action" : "success"}>
                      {q.status === "sent" ? t("agent.inq.new") : t("agent.inq.replied")}
                    </Badge>
                    {/* Quick action: answer without leaving the dashboard */}
                    <ButtonLink size="sm" variant="secondary" href={`mailto:${q.email}?subject=${encodeURIComponent(t("agent.inq.mailSubject", { title: q.propertyTitle }))}`}>
                      {t("agent.dash.reply")}
                    </ButtonLink>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right column: plan usage + quick actions */}
        <div className="grid gap-4 sm:gap-6">
          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-display text-base font-bold">{t("agent.dash.planUsage")}</h2>
            {sub.error && <ErrorState onRetry={sub.reload} />}
            {sub.data ? (
              <div className="space-y-5">
                <Usage label={t("agent.dash.activeListings")} used={sub.data.listingsUsed} total={sub.data.listingQuota} />
                <Usage label={t("agent.dash.aiCredits")} used={sub.data.aiCreditsUsed} total={sub.data.aiCredits} />
                {/* Upgrade CTA at the moment of friction, not just a "Manage" link */}
                {(sub.data.listingsUsed / sub.data.listingQuota >= 0.85 ||
                  sub.data.aiCreditsUsed / sub.data.aiCredits >= 0.85) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-warn-700">{t("agent.dash.nearLimit")}</p>
                    <Link to={to("/agent/subscription")} className="block">
                      <Button size="sm" className="w-full">{t("agent.dash.upgrade")}</Button>
                    </Link>
                  </div>
                )}
                <p className="text-xs text-muted">
                  {t("agent.dash.planLine", { plan: sub.data.planName, date: fmtDate(sub.data.renewsAt, locale) })}{" "}
                  <Link to={to("/agent/subscription")} className="font-semibold text-blue-700 underline">{t("agent.dash.manage")}</Link>
                </p>
              </div>
            ) : !sub.error && <Skeleton className="h-28 w-full" />}
          </section>

          {/* Sidebar shortcuts double as reachable entry points on mobile,
              where the nav rail scrolls off-screen */}
          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <h2 className="mb-3 font-display text-base font-bold">{t("agent.dash.quickActions")}</h2>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              {quickActions.map((a) =>
                a.gated && !canCreate ? (
                  <span key={a.href} aria-disabled
                    title={t(approved ? "agent.list.quotaFull" : "agent.gate.incomplete")}
                    className="flex min-h-11 cursor-not-allowed items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400">
                    <a.icon weight="duotone" className="size-4.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{a.label}</span>
                  </span>
                ) : (
                  <Link
                    key={a.href}
                    to={a.href}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-action hover:bg-blue-50/40 hover:text-blue-700"
                  >
                    <a.icon weight="duotone" className="size-4.5 shrink-0 text-blue-600" aria-hidden />
                    <span className="min-w-0 truncate">{a.label}</span>
                  </Link>
                ),
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Usage({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  const over = used > total;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`tabular ${over ? "font-semibold text-warn-700" : "text-muted"}`}>{used} / {total}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${pct > 85 ? "bg-warn-600" : "bg-action"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
