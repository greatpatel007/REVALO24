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
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { AgentProfile } from "@/shared/types";

/* Agent dashboard — "what needs my attention today":
   greeting → attention strip → KPI row → chart + inquiries | plan + quick actions. */
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
  const quotaInAttention = Boolean(sub.data && quotaPct >= 0.85);
  const canCreate = approved && !quotaFull;
  const ctaDisabledReason = t(approved ? "agent.list.quotaFull" : `agent.gate.${gateState}`);
  const zeroPortfolio = Boolean(stats.data && stats.data.activeCount === 0);
  const showGuide = !approved || zeroPortfolio;

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

  /* Gate CTA lives in the guided next-step block when !approved — don't duplicate it here */
  const attention: { id: string; tone: "warn" | "info" | "action"; icon: React.ReactNode; text: string; cta: string; href: string }[] = [];
  if (newInq > 0) {
    attention.push({
      id: "inq", tone: "action",
      icon: <EnvelopeSimple weight="duotone" className="size-5" aria-hidden />,
      text: t("agent.dash.attnInq", { n: newInq }),
      cta: t("agent.dash.reply"), href: to("/agent/inquiries"),
    });
  }
  if (quotaInAttention && sub.data) {
    attention.push({
      id: "quota", tone: "warn",
      icon: <Warning weight="duotone" className="size-5" aria-hidden />,
      text: t(quotaFull ? "agent.dash.attnQuotaFull" : "agent.dash.attnQuota", { u: sub.data.listingsUsed, q: sub.data.listingQuota }),
      cta: t("agent.dash.upgrade"), href: to("/agent/subscription"),
    });
  }
  const attnTone = { warn: "border-warn-600/30 bg-warn-50 text-warn-700", info: "border-info-600/30 bg-info-50 text-info-700", action: "border-action/30 bg-blue-50 text-blue-700" };

  /* PDF §3.4.3: Active / Sold / Views; clicks stay on the chart Seg */
  const kpis: {
    id: string; label: string; value: number | undefined; sub?: string;
    pct?: number | null; icon: Icon; href?: string; clicksLine?: string;
  }[] = [
    {
      id: "active", label: t("agent.dash.kpiActive"), value: stats.data?.activeCount,
      sub: stats.data ? t("agent.dash.ofTotal", { n: stats.data.totalProperties }) : undefined,
      icon: HouseLine, href: to("/agent/listings"),
    },
    {
      id: "sold", label: t("agent.dash.kpiSold"), value: stats.data?.soldCount,
      icon: SealCheck, href: to("/agent/listings?status=sold"),
    },
    {
      id: "views", label: t("agent.dash.kpiViews7"), value: stats.data ? dViews.cur : undefined,
      pct: dViews.pct, icon: Eye,
      clicksLine: stats.data ? t("agent.dash.clicks7sub", { n: dClicks.cur.toLocaleString(locale) }) : undefined,
      href: to("/agent/analytics"),
    },
    {
      id: "inq", label: t("agent.dash.kpiNewInq"), value: inq.data ? newInq : undefined,
      sub: inq.data ? t("agent.dash.ofTotal", { n: inq.data.length }) : undefined,
      icon: EnvelopeSimple, href: to("/agent/inquiries"),
    },
  ];

  const quickActions = [
    { label: t("agent.newListing"), icon: Plus, href: to("/agent/listings/new"), needsCreate: true },
    { label: t("agent.nav.ai"), icon: Sparkle, href: to("/agent/ai"), needsCreate: false },
    { label: t("agent.nav.import"), icon: DownloadSimple, href: to("/agent/import"), needsCreate: false },
    { label: t("agent.nav.placements"), icon: Star, href: to("/agent/placements"), needsCreate: false },
  ];

  const aiNearLimit = Boolean(sub.data && sub.data.aiCredits > 0
    && sub.data.aiCreditsUsed / sub.data.aiCredits >= 0.85);
  /* Quota upsell lives in the attention strip — don't repeat Upgrade in Plan usage */
  const showPlanUpgrade = Boolean(
    sub.data && !quotaInAttention && (
      sub.data.listingsUsed / sub.data.listingQuota >= 0.85 || aiNearLimit
    ),
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold">
            {t("agent.dash.hello", { name: (agent.name || agent.email).split(" ")[0] })}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
            {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
            {!approved && <StatusBadge status={gateState} />}
          </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
          {canCreate ? (
            <Link to={to("/agent/listings/new")} className="max-sm:w-full">
              <Button className="max-sm:w-full">{t("agent.newListing")}</Button>
            </Link>
          ) : (
            <Button disabled className="max-sm:w-full" title={ctaDisabledReason}>
              {t("agent.newListing")}
            </Button>
          )}
          {!canCreate && (
            <p className="text-xs text-muted sm:hidden">{ctaDisabledReason}</p>
          )}
        </div>
      </div>

      {/* Guided next step — no stepper chrome */}
      {showGuide && (
        <section className="mb-5 rounded-xl border border-slate-300 bg-white p-4 sm:mb-6 sm:p-5">
          <h2 className="mb-3 font-display text-base font-bold">{t("agent.dash.guideTitle")}</h2>
          <ol className="space-y-2.5">
            {!approved && (
              <li>
                <Link to={to("/agent/profile")}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-shadow hover:shadow-elevation-sm ${
                    gateState === "pending"
                      ? "border-info-600/30 bg-info-50 text-info-700"
                      : "border-warn-600/30 bg-warn-50 text-warn-700"
                  }`}>
                  <ShieldCheck weight="duotone" className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{t("agent.dash.guideVerify")}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 font-bold">
                    {gateState === "pending" ? t("agent.dash.viewStatus") : t("agent.gate.cta")}
                    <CaretRight weight="bold" className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            )}
            <li>
              {canCreate ? (
                <Link to={to("/agent/listings/new")}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-action/30 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition-shadow hover:shadow-elevation-sm">
                  <Plus weight="duotone" className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{t("agent.dash.guideListing")}</span>
                  <span className="ml-auto flex shrink-0 items-center gap-0.5 font-bold">
                    {t("agent.newListing")} <CaretRight weight="bold" className="size-3.5" aria-hidden />
                  </span>
                </Link>
              ) : (
                <div
                  title={ctaDisabledReason}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-canvas/70 px-3 py-2.5 text-sm font-semibold text-slate-400"
                >
                  <Plus weight="duotone" className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">{t("agent.dash.guideListing")}</span>
                </div>
              )}
            </li>
          </ol>
        </section>
      )}

      {attention.length > 0 && (
        <section aria-label={t("agent.dash.attention")} className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 xl:grid-cols-3">
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

      {(stats.error || inq.error) && <ErrorState className="mb-5 sm:mb-6" onRetry={() => { stats.reload(); inq.reload(); }} />}
      {!stats.error && !inq.error && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 xl:grid-cols-4">
          {kpis.map((k) => {
            const body = (
              <>
                <div className="mb-2 flex items-center gap-2 text-muted">
                  <k.icon weight="duotone" className="size-4.5 shrink-0" aria-hidden />
                  <p className="text-xs font-semibold sm:text-sm">{k.label}</p>
                </div>
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
                {k.clicksLine && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted">
                    <CursorClick weight="duotone" className="size-3.5 shrink-0" aria-hidden />
                    {k.clicksLine}
                  </p>
                )}
              </>
            );
            const cls = "rounded-xl border border-slate-200 bg-white/80 p-4 sm:p-5";
            return k.href ? (
              <Link key={k.id} to={k.href} className={`${cls} block transition-colors hover:border-action hover:bg-blue-50/40`}>{body}</Link>
            ) : (
              <div key={k.id} className={cls}>{body}</div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6">
          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold">
                  {t("agent.dash.chart", { metric: t(metric === "views" ? "agent.dash.views" : "agent.dash.clicks"), n: range })}
                </h2>
                {stats.data && !chartEmpty && (
                  <p className="mt-0.5 text-xs tabular text-muted">
                    {t("agent.dash.chartTotal", { total: rangeTotal.toLocaleString(locale), avg: rangeAvg })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Seg
                  ariaLabel={t("agent.dash.metricAria")}
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "views", label: t("agent.dash.views") },
                    { value: "clicks", label: t("agent.dash.clicks") },
                  ]}
                />
                <Seg
                  ariaLabel={t("agent.dash.rangeAria")}
                  size="sm"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: 7, label: t("agent.dash.days7") },
                    { value: 30, label: t("agent.dash.days30") },
                  ]}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  onClick={exportCsv}
                  disabled={!stats.data || chartEmpty}
                  aria-label={t("agent.dash.csvAria")}
                >
                  <DownloadSimple className="size-4.5" aria-hidden />
                  {t("agent.dash.csvExport")}
                </Button>
              </div>
            </div>
            {stats.loading && <Skeleton className="h-40 w-full sm:h-44" />}
            {stats.error && <ErrorState onRetry={stats.reload} />}
            {stats.data && chartEmpty && (
              <EmptyState
                icon={<ChartBar weight="duotone" className="size-9" aria-hidden />}
                title={t("agent.dash.chartEmptyTitle")}
              >
                <p className="mb-3">{approved ? t("agent.dash.chartEmpty") : t("agent.dash.chartEmptyGated")}</p>
                {canCreate ? (
                  <Link to={to("/agent/listings/new")}>
                    <Button size="sm">{t("agent.dash.chartEmptyCta")}</Button>
                  </Link>
                ) : !approved ? (
                  <Link to={to("/agent/profile")}>
                    <Button size="sm" variant="secondary">{t("agent.gate.cta")}</Button>
                  </Link>
                ) : null}
              </EmptyState>
            )}
            {stats.data && !chartEmpty && (
              <BarChart
                data={daily}
                metric={metric}
                locale={locale}
                ariaLabel={t("agent.dash.chart", {
                  metric: t(metric === "views" ? "agent.dash.views" : "agent.dash.clicks"),
                  n: range,
                })}
              />
            )}
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
              <div className="flex flex-col items-start gap-3 py-4">
                <div className="flex items-start gap-3">
                  <EnvelopeSimple weight="duotone" className="size-7 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p className="text-sm font-bold">{t("agent.dash.inqEmptyTitle")}</p>
                    <p className="text-pretty text-sm text-muted">{t("agent.dash.inqEmptyBody")}</p>
                  </div>
                </div>
                <Link to={to("/agent/inquiries")}>
                  <Button size="sm" variant="secondary">{t("agent.dash.openInbox")}</Button>
                </Link>
              </div>
            )}
            <ul className="divide-y divide-slate-200">
              {recentInquiries.map((q) => (
                <li key={q.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
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
                    <ButtonLink size="sm" variant="secondary" href={`mailto:${q.email}?subject=${encodeURIComponent(t("agent.inq.mailSubject", { title: q.propertyTitle }))}`}>
                      {t("agent.dash.reply")}
                    </ButtonLink>
                    <Link to={to("/agent/inquiries")} className="hidden text-xs font-semibold text-blue-700 hover:underline sm:inline">
                      {t("agent.dash.openInbox")}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 sm:gap-6">
          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-display text-base font-bold">{t("agent.dash.planUsage")}</h2>
            {sub.error && <ErrorState onRetry={sub.reload} />}
            {sub.data ? (
              <div className="space-y-5">
                <Usage label={t("agent.dash.activeListings")} used={sub.data.listingsUsed} total={sub.data.listingQuota} />
                <Usage label={t("agent.dash.aiCredits")} used={sub.data.aiCreditsUsed} total={sub.data.aiCredits} />
                {showPlanUpgrade && (
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

          <section className="rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
            <h2 className="mb-3 font-display text-base font-bold">{t("agent.dash.quickActions")}</h2>
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((a) => {
                const enabled = a.needsCreate ? canCreate : approved;
                const title = a.needsCreate
                  ? t(approved ? "agent.list.quotaFull" : `agent.gate.${gateState}`)
                  : t(`agent.gate.${gateState}`);
                if (!enabled) {
                  return (
                    <span key={a.href} aria-disabled
                      title={title}
                      className="flex min-h-11 cursor-not-allowed items-center gap-2.5 rounded-lg border border-slate-200 bg-canvas/60 px-3 py-2 text-sm font-semibold text-slate-400">
                      <a.icon weight="duotone" className="size-4.5 shrink-0 opacity-60" aria-hidden />
                      <span className="min-w-0 text-pretty">{a.label}</span>
                    </span>
                  );
                }
                return (
                  <Link
                    key={a.href}
                    to={a.href}
                    className="flex min-h-11 items-center gap-2.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-action hover:bg-blue-50/40 hover:text-blue-700"
                  >
                    <a.icon weight="duotone" className="size-4.5 shrink-0 text-blue-600" aria-hidden />
                    <span className="min-w-0 text-pretty">{a.label}</span>
                  </Link>
                );
              })}
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
