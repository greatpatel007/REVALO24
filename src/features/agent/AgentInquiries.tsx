import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowSquareOut, CaretDown, EnvelopeSimple, MapPin, Phone } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getAgentInquiries, markInquiryReplied } from "@/features/agent/api";
import { getProperty } from "@/features/property/api";
import { PropertyFacts } from "@/features/property/PropertyCard";
import { fmtDate, fmtPrice, locationLabel } from "@/shared/lib/format";
import type { Inquiry, Property } from "@/shared/types";
import { Badge } from "@/shared/ui/Badge";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Pagination } from "@/shared/ui/Pagination";
import { Seg } from "@/shared/ui/Seg";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";

type StatusFilter = "all" | "sent" | "replied";

/** Rows per page in the inquiry list — fills the tall viewport; paginate past this. */
const PAGE_SIZE = 8;

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function sortRows(list: Inquiry[]) {
  return [...list].sort((a, b) =>
    a.status === b.status
      ? +new Date(b.createdAt) - +new Date(a.createdAt)
      : a.status === "sent" ? -1 : 1,
  );
}

/* Contact tracking for inquiries (§3.4.3) — desktop is a master–detail inbox
   (list left, message + property right); mobile collapses to expandable cards. */
export function AgentInquiries() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(getAgentInquiries);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const rows = sortRows((data ?? []).filter((q) => filter === "all" || q.status === filter));
  const lastPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, lastPage);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const newCount = (data ?? []).filter((q) => q.status === "sent").length;
  const repliedCount = (data ?? []).length - newCount;
  const selected = pageRows.find((q) => q.id === selectedId) ?? pageRows[0] ?? null;

  /* Filter change → first page */
  useEffect(() => { setPage(1); setExpandedId(null); }, [filter]);

  /* Keep selection on the current page */
  useEffect(() => {
    if (!pageRows.length) { setSelectedId(null); return; }
    if (!selectedId || !pageRows.some((q) => q.id === selectedId)) setSelectedId(pageRows[0].id);
  }, [pageRows, selectedId]);

  const property = useApi(
    () => (selected ? getProperty(selected.propertyId) : Promise.resolve(undefined)),
    [selected?.propertyId],
  );

  const markReplied = (id: number) => {
    setBusyId(id);
    void markInquiryReplied(id)
      .then(() => { toast(t("agent.inq.marked")); reload(); })
      .catch(() => toast(t("common.actionFail"), "error"))
      .finally(() => setBusyId(null));
  };

  const filterEmpty = !loading && !error && rows.length === 0 && (data?.length ?? 0) > 0;
  const trulyEmpty = !loading && !error && (data?.length ?? 0) === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 lg:mb-5">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{t("agent.inq.title")}</h1>
          <p className="text-sm text-muted">{t("agent.inq.sub", { n: newCount })}</p>
        </div>
        <Seg
          ariaLabel={t("agent.inq.filterAria")}
          size="sm"
          value={filter}
          onChange={(v) => setFilter(v)}
          options={[
            { value: "all", label: `${t("agent.inq.all")} · ${(data ?? []).length}` },
            { value: "sent", label: `${t("agent.inq.new")} · ${newCount}` },
            { value: "replied", label: `${t("agent.inq.replied")} · ${repliedCount}` },
          ]}
        />
      </div>

      {loading && <InquiriesSkeleton />}
      {!loading && error && <ErrorState onRetry={reload} />}

      {trulyEmpty && (
        <EmptyState icon={<EnvelopeSimple className="size-9" aria-hidden />} title={t("agent.inq.empty")}>
          {t("agent.inq.emptyBody")}
        </EmptyState>
      )}

      {filterEmpty && (
        <EmptyState icon={<EnvelopeSimple className="size-9" aria-hidden />} title={t("agent.inq.emptyFilter")}>
          <Button size="sm" variant="secondary" onClick={() => setFilter("all")}>{t("agent.inq.showAll")}</Button>
        </EmptyState>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* Desktop: panel fills remaining viewport — list rows share the height,
              pagination pinned to the bottom of the left column (no nested scroll). */}
          <div className="hidden min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-slate-300 bg-white lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
            <nav aria-label={t("agent.inq.listAria")} className="flex min-h-0 min-w-0 flex-col border-r border-slate-200">
              {/* Natural row height — leftover viewport space sits below the list
                  (above the pager), so a short last page doesn't stretch 3–4 rows. */}
              <ul className="divide-y divide-slate-200">
                {pageRows.map((q) => {
                  const active = selected?.id === q.id;
                  const isNew = q.status === "sent";
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(q.id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full cursor-pointer items-start gap-3.5 px-4 py-4 text-left transition-colors ${
                          active ? "bg-blue-50" : "hover:bg-canvas"
                        }`}
                      >
                        <span aria-hidden className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                          isNew ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}>
                          {initialsOf(q.name)}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1.5">
                          <span className="flex items-center justify-between gap-2">
                            <span className={`truncate text-sm ${isNew ? "font-bold text-navy" : "font-semibold text-slate-800"}`}>
                              {q.name}
                            </span>
                            <Badge tone={isNew ? "action" : "success"}>
                              {isNew ? t("agent.inq.new") : t("agent.inq.replied")}
                            </Badge>
                          </span>
                          <span className="flex items-center gap-1.5 truncate text-xs text-muted">
                            <span className="truncate" title={q.propertyTitle}>{q.propertyTitle}</span>
                            <span aria-hidden>·</span>
                            <span className="shrink-0 tabular">{fmtDate(q.createdAt, locale)}</span>
                          </span>
                          <span className="line-clamp-1 text-xs text-slate-600">{q.message}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {lastPage > 1 && (
                <div className="relative z-10 mt-auto shrink-0 border-t border-slate-200 bg-white px-3 py-3">
                  <Pagination page={safePage} lastPage={lastPage} onChange={setPage} />
                </div>
              )}
            </nav>

            <section aria-label={t("agent.inq.detailAria")} className="min-h-0 min-w-0 overflow-y-auto p-5 xl:p-6">
              {selected ? (
                <InquiryDetail
                  q={selected}
                  property={property.data ?? null}
                  propertyLoading={property.loading}
                  busy={busyId === selected.id}
                  onMarkReplied={() => markReplied(selected.id)}
                />
              ) : (
                <p className="text-sm text-muted">{t("agent.inq.selectHint")}</p>
              )}
            </section>
          </div>

          {/* Mobile: expandable cards (page scrolls naturally) */}
          <div className="lg:hidden">
            <ul className="grid grid-cols-1 gap-4">
              {pageRows.map((q) => {
                const isNew = q.status === "sent";
                const open = expandedId === q.id;
                return (
                  <li
                    key={q.id}
                    className={`overflow-hidden rounded-xl border border-slate-300 ${isNew ? "bg-white" : "bg-canvas/70"}`}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpandedId(open ? null : q.id)}
                      className="flex w-full cursor-pointer items-start gap-3.5 px-4 py-5 text-left"
                    >
                      <span aria-hidden className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                        isNew ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                      }`}>
                        {initialsOf(q.name)}
                      </span>
                      <span className="min-w-0 flex-1 space-y-1.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${isNew ? "font-bold" : "font-semibold"}`}>{q.name}</span>
                          <Badge tone={isNew ? "action" : "success"}>
                            {isNew ? t("agent.inq.new") : t("agent.inq.replied")}
                          </Badge>
                        </span>
                        <span className="block truncate text-xs text-muted">{q.propertyTitle}</span>
                        {!open && <span className="line-clamp-2 text-sm text-slate-700">{q.message}</span>}
                      </span>
                      <CaretDown
                        weight="bold"
                        className={`mt-1 size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {open && (
                      <div className="border-t border-slate-200 px-4 pb-4 pt-3">
                        <InquiryDetail
                          q={q}
                          property={null}
                          propertyLoading={false}
                          busy={busyId === q.id}
                          onMarkReplied={() => markReplied(q.id)}
                          mobile
                        />
                        <MobileProperty q={q} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {lastPage > 1 && (
              <div className="mt-5">
                <Pagination page={safePage} lastPage={lastPage} onChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-4 max-w-3xl shrink-0 text-xs leading-relaxed text-muted lg:mt-3">{t("agent.inq.gdpr")}</p>
    </div>
  );
}

/* ---- Detail pane (shared desktop / mobile expanded) ---- */

function InquiryDetail({
  q, property, propertyLoading, busy, onMarkReplied, mobile,
}: {
  q: Inquiry;
  property: Property | null;
  propertyLoading: boolean;
  busy: boolean;
  onMarkReplied: () => void;
  mobile?: boolean;
}) {
  const { t, to, locale } = useI18n();
  const isNew = q.status === "sent";

  return (
    <div className="flex flex-col gap-5">
      {!mobile && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
              isNew ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
            }`}>
              {initialsOf(q.name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold" title={q.name}>{q.name}</h2>
              <p className="text-xs text-muted">{fmtDate(q.createdAt, locale)}</p>
            </div>
          </div>
          <Badge tone={isNew ? "action" : "success"}>
            {isNew ? t("agent.inq.new") : t("agent.inq.replied")}
          </Badge>
        </header>
      )}

      <div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{t("agent.inq.message")}</p>
        <blockquote className="break-words rounded-lg bg-canvas px-4 py-3 text-sm leading-relaxed text-slate-800">
          {q.message}
        </blockquote>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <a href={`mailto:${q.email}`} className="flex min-w-0 items-center gap-1.5 text-blue-700 hover:underline">
          <EnvelopeSimple className="size-4 shrink-0" aria-hidden />
          <span className="truncate" title={q.email}>{q.email}</span>
        </a>
        {q.phone && (
          <a href={`tel:${q.phone}`} className="flex items-center gap-1.5 text-blue-700 hover:underline">
            <Phone className="size-4 shrink-0" aria-hidden /> {q.phone}
          </a>
        )}
      </p>

      <div className="flex flex-wrap gap-2">
        <ButtonLink
          size="sm"
          variant={isNew ? "primary" : "secondary"}
          href={`mailto:${q.email}?subject=${encodeURIComponent(t("agent.inq.mailSubject", { title: q.propertyTitle }))}`}
        >
          {t("agent.inq.reply")}
        </ButtonLink>
        {isNew && (
          <Button size="sm" variant="secondary" loading={busy} onClick={onMarkReplied}>
            {t("agent.inq.markReplied")}
          </Button>
        )}
      </div>

      {!mobile && (
        <div className="border-t border-slate-200 pt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{t("agent.inq.aboutProperty")}</p>
          {propertyLoading && <Skeleton className="h-28 w-full" />}
          {!propertyLoading && property && <PropertySummary property={property} />}
          {!propertyLoading && !property && (
            <p className="text-sm text-muted">
              <Link to={to(`/property/${q.propertyId}`)} className="font-semibold text-blue-700 hover:underline">
                {q.propertyTitle}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MobileProperty({ q }: { q: Inquiry }) {
  const { t } = useI18n();
  const { data, loading } = useApi(() => getProperty(q.propertyId), [q.propertyId]);
  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{t("agent.inq.aboutProperty")}</p>
      {loading && <Skeleton className="h-28 w-full" />}
      {!loading && data && <PropertySummary property={data} />}
      {!loading && !data && (
        <p className="text-sm font-semibold text-slate-800">{q.propertyTitle}</p>
      )}
    </div>
  );
}

function PropertySummary({ property: p }: { property: Property }) {
  const { t, to, locale } = useI18n();
  const img = p.media.images[0];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="flex gap-3 p-3 sm:gap-4">
        {img ? (
          <img src={img} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover sm:h-24 sm:w-32" />
        ) : (
          <div className="h-20 w-28 shrink-0 rounded-lg bg-slate-200 sm:h-24 sm:w-32" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold tabular">
            {p.offMarket ? t("card.priceOnRequest") : fmtPrice(p, locale)}
          </p>
          <p className="mt-0.5 truncate font-semibold text-slate-900" title={p.title}>{p.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {locationLabel(p)}
          </p>
          <div className="mt-2"><PropertyFacts property={p} size="sm" /></div>
        </div>
      </div>
      <div className="border-t border-slate-200 px-3 py-2.5">
        <Link
          to={to(`/property/${p.id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline"
        >
          {t("agent.inq.openListing")}
          <ArrowSquareOut className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function InquiriesSkeleton() {
  return (
    <>
      <div className="hidden min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-300 bg-white lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="divide-y divide-slate-200 border-r border-slate-200">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="flex items-start gap-3.5 px-4 py-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32 max-w-full" />
                <Skeleton className="h-3 w-48 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-11 w-56 max-w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-slate-300 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-36 max-w-full" />
                <Skeleton className="h-3 w-48 max-w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
