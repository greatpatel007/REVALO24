import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowsDownUp, Bathtub, Bed, Blueprint, Buildings, Calculator, CalendarBlank,
  CaretDown, Door, Heart, Images, MapPin, Panorama, Play, Receipt, Ruler, SealCheck,
  ShareNetwork, Stairs, TrendDown, TrendUp, Tree,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/lib/useApi";
import { getListingAgent, getProperty, getSubUnits, priceInsight, unlockOffMarket } from "@/features/property/api";
import { EnergyScale } from "@/features/property/EnergyClass";
import { amenityIcon } from "@/features/property/amenityIcons";
import { getFxQuote } from "@/features/property/fxApi";
import { OffMarketCover } from "@/features/property/PropertyCard";
import { useOffMarketAccess } from "@/features/off-market/useOffMarketAccess";
import { MapCanvas } from "@/features/search/MapCanvas";
import { sendInquiry } from "@/features/account/api";
import { useFavorites } from "@/features/account/useFavorites";
import { PURCHASE_COSTS } from "@/shared/lib/constants";
import { fmtDate, fmtEur, fmtLocalByCountry, fmtLocalEstimate, fmtPrice, locationLabel } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Input, Textarea, Consent } from "@/shared/ui/Field";
import { Modal } from "@/shared/ui/Modal";
import { Seg } from "@/shared/ui/Seg";
import { Tabs } from "@/shared/ui/Tabs";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { Locale, Property } from "@/shared/types";

type MediaTab = "photos" | "video" | "floorplan" | "tour";
type LightboxState = { tab: MediaTab; idx: number };

function hasVideo(p: Property) {
  return Boolean(p.media.videoUrl);
}
function hasFloorPlan(p: Property) {
  return Boolean(p.media.floorPlanUrl);
}
function hasTour(p: Property) {
  return Boolean(p.media.virtualTourUrl);
}

/* ---- Lightbox: photos + available video / floor-plan (IS24 exposé) ---- */
function MediaLightbox({
  p, open, initial, onClose,
}: {
  p: Property; open: boolean; initial: LightboxState; onClose: () => void;
}) {
  const { t } = useI18n();
  const video = hasVideo(p);
  const plan = hasFloorPlan(p);
  const tour = hasTour(p);
  const [tab, setTab] = useState<MediaTab>(initial.tab);
  const [imgIdx, setImgIdx] = useState(initial.idx);

  const tabs = [
    { id: "photos" as const, label: t("detail.photos", { n: p.media.images.length }) },
    ...(video ? [{ id: "video" as const, label: t("detail.video") }] : []),
    ...(plan ? [{ id: "floorplan" as const, label: t("detail.floorplan") }] : []),
    ...(tour ? [{ id: "tour" as const, label: t("detail.tour") }] : []),
  ];

  return (
    <Modal open={open} onClose={onClose} title={`${t("detail.media")} — ${p.title}`} wide>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "photos" && (
          <>
            <img src={p.media.images[imgIdx]} alt={`${p.title} — ${t("detail.photoOf", { n: imgIdx + 1 })}`} className="aspect-[16/9] w-full rounded-xl object-cover" />
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {p.media.images.map((src, i) => (
                <button key={src} type="button" onClick={() => setImgIdx(i)} aria-label={t("detail.openPhoto", { n: i + 1 })}
                  className={`h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${i === imgIdx ? "border-action" : "border-transparent opacity-75 hover:opacity-100"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
        {tab === "video" && (
          video && p.media.videoUrl ? (
            <div className="aspect-[16/9] overflow-hidden rounded-xl bg-navy">
              {p.media.videoUrl.includes("youtube.com") || p.media.videoUrl.includes("youtu.be") ? (
                <iframe
                  title={t("detail.video")}
                  src={p.media.videoUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={p.media.videoUrl} controls className="h-full w-full" poster={p.media.images[0]}>
                  {t("detail.videoPh")}
                </video>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-navy text-slate-400">
              <div className="flex flex-col items-center text-center">
                <Play weight="fill" className="mb-2 size-10" aria-hidden />
                <p className="text-sm font-semibold">{t("detail.videoMissing")}</p>
              </div>
            </div>
          )
        )}
        {tab === "floorplan" && (
          plan && p.media.floorPlanUrl ? (
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img
                src={p.media.floorPlanUrl}
                alt={t("detail.floorplan")}
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </figure>
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 bg-white text-muted">
              <Blueprint className="size-8" aria-hidden />
              <p className="text-sm font-semibold">{t("detail.planMissing")}</p>
            </div>
          )
        )}
        {tab === "tour" && (
          tour && p.media.virtualTourUrl ? (
            <div className="aspect-[16/9] overflow-hidden rounded-xl bg-navy">
              <iframe
                title={t("detail.tour")}
                src={p.media.virtualTourUrl}
                className="h-full w-full"
                allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl bg-navy text-slate-400">
              <Panorama weight="duotone" className="size-10" aria-hidden />
              <p className="text-sm font-semibold">{t("detail.tourMissing")}</p>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

/* Media strip — Video / Floor plan only (photos use "Show all photos" on the mosaic) */
function MediaTypeStrip({
  p, onOpen,
}: {
  p: Property;
  onOpen: (state: LightboxState) => void;
}) {
  const { t } = useI18n();
  const video = hasVideo(p);
  const plan = hasFloorPlan(p);
  const tour = hasTour(p);

  const chip = (
    available: boolean,
    kindLabel: string,
    actionLabel: string,
    icon: ReactNode,
    missingHint: string,
    onClick?: () => void,
  ) => {
    const body = (
      <>
        <span className="inline-flex size-4.5 shrink-0 items-center justify-center [&>svg]:size-4.5">{icon}</span>
        <span className="whitespace-nowrap">{kindLabel}</span>
        <span className="whitespace-nowrap font-bold">{available ? actionLabel : t("detail.mediaUnavailable")}</span>
      </>
    );
    if (available && onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-action/40 bg-blue-50 px-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
        >
          {body}
        </button>
      );
    }
    return (
      <span
        title={missingHint}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-canvas/70 px-3.5 text-sm font-semibold text-slate-400"
      >
        {body}
      </span>
    );
  };

  return (
    <div
      role="group"
      aria-label={t("detail.mediaTypes")}
      className="mt-3 flex flex-wrap gap-2"
    >
      {chip(
        video,
        t("detail.video"),
        t("detail.videoWatch"),
        <Play weight="fill" aria-hidden />,
        t("detail.videoMissing"),
        video ? () => onOpen({ tab: "video", idx: 0 }) : undefined,
      )}
      {chip(
        plan,
        t("detail.floorplan"),
        t("detail.floorplanView"),
        <Blueprint weight="duotone" aria-hidden />,
        t("detail.planMissing"),
        plan ? () => onOpen({ tab: "floorplan", idx: 0 }) : undefined,
      )}
      {chip(
        tour,
        t("detail.tour"),
        t("detail.tourWatch"),
        <Panorama weight="duotone" aria-hidden />,
        t("detail.tourMissing"),
        tour ? () => onOpen({ tab: "tour", idx: 0 }) : undefined,
      )}
    </div>
  );
}

/* ---- Gallery: 5-image mosaic on desktop (IS24 relaunch pattern),
        swipeable carousel with counter on mobile ---- */
function Gallery({ p, onOpen }: { p: Property; onOpen: (state: LightboxState) => void }) {
  const { t } = useI18n();
  const imgs = p.media.images;
  const [mobIdx, setMobIdx] = useState(0);
  const openPhoto = (idx: number) => onOpen({ tab: "photos", idx });

  return (
    <div>
      <div className="relative">
        {/* Mobile: snap carousel */}
        <div className="relative sm:hidden">
          <div
            className="flex snap-x snap-mandatory overflow-x-auto rounded-xl"
            onScroll={(e) => setMobIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {imgs.map((src, i) => (
              <button key={src} type="button" onClick={() => openPhoto(i)} aria-label={t("detail.openPhoto", { n: i + 1 })} className="w-full shrink-0 cursor-pointer snap-center">
                <img src={src} alt={`${p.title} — ${t("detail.photoOf", { n: i + 1 })}`} loading={i > 0 ? "lazy" : undefined} className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
          <span className="absolute bottom-3 left-3 rounded-full bg-navy/75 px-2.5 py-1 text-xs font-bold text-white" aria-hidden>
            {mobIdx + 1} / {imgs.length}
          </span>
        </div>

        {/* Desktop: 1 hero + 4 tiles */}
        <div className="hidden aspect-[2/1] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:grid">
          <button type="button" onClick={() => openPhoto(0)} aria-label={t("detail.openPhoto", { n: 1 })} className="group col-span-2 row-span-2 cursor-pointer overflow-hidden">
            <img src={imgs[0]} alt={`${p.title} — ${t("detail.photoOf", { n: 1 })}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          </button>
          {imgs.slice(1, 5).map((src, i) => (
            <button key={src} type="button" onClick={() => openPhoto(i + 1)} aria-label={t("detail.openPhoto", { n: i + 2 })} className="group cursor-pointer overflow-hidden">
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openPhoto(0)}
          className="absolute bottom-3 right-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-navy shadow-elevation-md transition-colors hover:bg-blue-50 sm:px-4"
        >
          <Images weight="bold" className="size-4.5" aria-hidden /> {t("detail.showAllPhotos", { n: imgs.length })}
        </button>
      </div>

      <MediaTypeStrip p={p} onOpen={onOpen} />
    </div>
  );
}

/* ---- Purchase-cost transparency (IS24 Kaufnebenkosten; buy only) ---- */
function PurchaseCostsCard({ p, locale }: { p: Property; locale: Locale }) {
  const { t } = useI18n();
  const rates = PURCHASE_COSTS[p.location.countryCode];
  const { data: fx } = useApi(() => getFxQuote(p.location.countryCode), [p.location.countryCode]);
  if (!rates) return null;
  const rows = (
    [
      [t("detail.transferTax"), rates.transferTax],
      [t("detail.notary"), rates.notary],
      [t("detail.agentFee"), rates.agentFee],
    ] as [string, number][]
  ).filter(([, pct]) => pct > 0);
  const totalEur = Math.round(p.price + rows.reduce((sum, [, pct]) => sum + (p.price * pct) / 100, 0));
  const localTotal = fmtLocalByCountry(totalEur, p.location.countryCode, locale);

  const row = (label: string, value: string, bold = false) => (
    <div key={label} className={`flex items-baseline justify-between gap-4 py-2.5 ${bold ? "font-extrabold" : ""}`}>
      <dt className={bold ? "" : "text-slate-800"}>{label}</dt>
      <dd className="whitespace-nowrap font-semibold tabular">{value}</dd>
    </div>
  );

  return (
    <details open className="group mt-10 rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <Receipt weight="duotone" className="size-5 text-blue-600" aria-hidden /> {t("detail.costs")}
        </span>
        <CaretDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-5 pb-5">
        <dl className="divide-y divide-slate-200 text-sm">
          {row(t("detail.purchasePrice"), fmtEur(p.price, locale))}
          {rows.map(([label, pct]) => row(`${label} (${pct.toLocaleString(locale)} %)`, fmtEur(Math.round((p.price * pct) / 100), locale)))}
          {row(t("detail.totalIncl"), fmtEur(totalEur, locale), true)}
        </dl>
        {localTotal && fx && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted">
            <span className="font-semibold tabular text-slate-700">{localTotal}</span>
            <span aria-hidden className="text-slate-300">·</span>
            <span className="tabular">
              {t("detail.fxRatePair", {
                rate: fx.rate.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                currency: fx.currency,
              })}
            </span>
            <span aria-hidden className="text-slate-300">·</span>
            <span>{t("detail.fxIndicative")}</span>
            <span aria-hidden className="text-slate-300">·</span>
            <time dateTime={fx.asOf}>{fmtDate(fx.asOf, locale)}</time>
          </p>
        )}
        <p className="mt-3 text-xs text-muted">{t("detail.costsNote", { country: p.location.country })}</p>
      </div>
    </details>
  );
}

/* ---- Financing estimate (IS24 Baufinanzierung pattern; buy only) ---- */
const TERMS = [15, 20, 25, 30].map((v) => ({ value: v, label: `${v} y` }));

function FinancingCard({ p, locale }: { p: Property; locale: Locale }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [equity, setEquity] = useState(() => Math.round((p.price * 0.2) / 1000) * 1000);
  const [term, setTerm] = useState(25);
  const [rate, setRate] = useState(3.6);

  const loan = Math.max(0, p.price - equity);
  const mr = rate / 100 / 12;
  const n = term * 12;
  /* Standard annuity — real rates arrive via the partner rate-feed API later */
  const monthly = mr > 0 ? (loan * mr) / (1 - (1 + mr) ** -n) : loan / n;

  return (
    <section
      aria-labelledby="financing-estimate-heading"
      className="rounded-xl border border-dashed border-slate-400 bg-canvas/80 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="financing-estimate-heading" className="flex flex-wrap items-center gap-2 font-display text-base font-bold">
            <Calculator weight="duotone" className="size-5 shrink-0 text-blue-600" aria-hidden />
            {t("detail.financing")}
            <Badge tone="neutral">{t("detail.financingOptional")}</Badge>
          </h2>
          <p className="mt-1 text-pretty text-xs text-muted">{t("detail.financingSub")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-expanded={open}
          aria-controls="financing-estimate-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("detail.financingHide") : t("detail.financingShow")}
        </Button>
      </div>

      {open && (
        <div id="financing-estimate-panel" className="mt-4 flex flex-col gap-3.5 border-t border-slate-300 pt-4">
          <Input
            label={t("detail.equity")}
            type="number"
            inputMode="numeric"
            min={0}
            max={p.price}
            step={1000}
            value={equity}
            onChange={(e) => setEquity(Math.min(p.price, Math.max(0, Number(e.target.value) || 0)))}
          />
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-900">{t("detail.term")}</p>
            <Seg ariaLabel={t("detail.loanTerm")} size="sm" options={TERMS} value={term} onChange={setTerm} />
          </div>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-sm font-semibold text-slate-900">
              {t("detail.rate")} <span className="tabular">{rate.toFixed(1)} %</span>
            </span>
            <input
              type="range" min={1} max={6} step={0.1} value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full cursor-pointer accent-action"
            />
          </label>
          <div className="rounded-lg bg-white px-4 py-3 outline outline-1 outline-slate-300">
            <p className="text-xs font-semibold text-muted">{t("detail.loanLine", { amount: fmtEur(loan, locale) })}</p>
            <p className="font-display text-2xl font-extrabold tabular text-blue-700">
              {fmtEur(Math.round(monthly), locale)}<span className="text-sm font-bold text-muted"> {t("detail.perMonth")}</span>
            </p>
          </div>
          <p className="text-xs text-muted">{t("detail.finNote")}</p>
        </div>
      )}
    </section>
  );
}

/* New Construction master projects list their sub-units in an interactive
   table (ImmoScout24 pattern) — discovery doc "Important Layout Requirement". */
function SubUnitsSection({ masterId, localeTo, locale }: { masterId: number; localeTo: (p: string) => string; locale: Locale }) {
  const { t } = useI18n();
  const { data: units, loading } = useApi(() => getSubUnits(masterId), [masterId]);
  const [sortAsc, setSortAsc] = useState(true);

  if (loading) return <Skeleton className="mt-8 h-48 w-full" />;
  if (!units || units.length === 0) return null;

  const rows = [...units].sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
  const available = units.filter((u) => u.status !== "sold").length;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Buildings weight="duotone" className="size-5 text-blue-600" aria-hidden />
          {t("detail.units")}
          <span className="text-sm font-semibold text-muted">{t("detail.unitsCount", { a: available, b: units.length })}</span>
        </h2>
        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-400 px-3.5 text-xs font-bold hover:bg-slate-200"
        >
          <ArrowsDownUp className="size-3.5" aria-hidden /> {sortAsc ? t("detail.priceLowHigh") : t("detail.priceHighLow")}
        </button>
      </div>
      {/* Mobile: unit cards instead of a horizontally-scrolling table */}
      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {rows.map((u: Property) => {
          const sold = u.status === "sold";
          const unitLabel = u.title.split("·")[1]?.trim() ?? u.title;
          return (
            <li key={u.id} className={`rounded-xl border border-slate-200 bg-white p-3.5 ${sold ? "opacity-55" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{unitLabel}</p>
                <p className="shrink-0 text-sm font-bold tabular">{fmtEur(u.price, locale)}</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {t("detail.floor")} {u.floor ?? "—"} · {t("detail.rooms")} {u.rooms} · {u.livingArea} m²
              </p>
              <div className="mt-2">
                {sold ? (
                  <Badge tone="neutral">{t("detail.sold")}</Badge>
                ) : (
                  <Link to={localeTo(`/property/${u.id}`)} className="text-sm font-semibold text-blue-700 hover:underline">
                    {t("detail.viewUnit")}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white scrollbar-thin md:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              {[t("detail.unit"), t("detail.floor"), t("detail.rooms"), t("detail.livingArea"), t("search.price"), ""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((u: Property) => {
              const sold = u.status === "sold";
              const unitLabel = u.title.split("·")[1]?.trim() ?? u.title;
              return (
                <tr key={u.id} className={sold ? "opacity-55" : "hover:bg-blue-50/60"}>
                  <td className="px-4 py-3 font-semibold">{unitLabel}</td>
                  <td className="px-4 py-3 tabular">{u.floor ?? "—"}</td>
                  <td className="px-4 py-3 tabular">{u.rooms}</td>
                  <td className="px-4 py-3 tabular">{u.livingArea} m²</td>
                  <td className="px-4 py-3 font-bold tabular">{fmtEur(u.price, locale)}</td>
                  <td className="px-4 py-3 text-right">
                    {sold ? (
                      <Badge tone="neutral">{t("detail.sold")}</Badge>
                    ) : (
                      <Link to={localeTo(`/property/${u.id}`)} className="whitespace-nowrap font-semibold text-blue-700 hover:underline">
                        {t("detail.viewUnit")}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---- Off-Market gated detail (spec Screen 4B) ----
   Identifying details never reach the DOM: price/address/description render
   as decorative placeholder bars, location is region-level only. Unlock has
   two paths — agent access code, or signing in as an approved buyer. */
function GatedDetail({ p, onUnlocked }: { p: Property; onUnlocked: () => void }) {
  const { t, to } = useI18n();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    void unlockOffMarket(code.trim(), p.id)
      .then((r) => {
        if (r.ok) {
          toast(t("off.granted"));
          onUnlocked(); // parent re-renders into the full exposé in place
        } else {
          setError(t("off.invalid"));
        }
      })
      .finally(() => setBusy(false));
  };

  const blurBar = (w: string) => (
    <span aria-hidden className={`block h-4 rounded-sm bg-slate-300 blur-[3px] ${w}`} />
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        <Link to={to("/off-market")} className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> {t("nav.offmarket")}
        </Link>
      </nav>

      {/* Padlock hero — the photo stays blurred behind the champagne lock */}
      <div className="aspect-[16/8] overflow-hidden rounded-xl">
        <OffMarketCover image={p.media.images[0]} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="premium">Off-Market</Badge>
        <Badge tone={p.listingType === "buy" ? "success" : "info"}>
          {p.listingType === "buy" ? t("search.forSale") : t("search.forRent")}
        </Badge>
      </div>
      <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{p.title}</h1>
      <p className="mt-1 flex items-center gap-1 text-muted">
        <MapPin className="size-4 shrink-0" aria-hidden />
        {p.location.city}, {p.location.country} · <span className="text-sm">{t("gate.region")}</span>
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_320px]">
        {/* Non-identifying summary (spec: type + region-level only) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="t-overline mb-3 text-muted">{t("gate.summary")}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {[
              [t("search.homeType"), t(`kind.${p.propertyType}`)],
              [t("detail.livingArea"), `${p.livingArea} m²`],
              [t("detail.rooms"), String(p.rooms)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                <dd className="mt-0.5 font-bold tabular">{value}</dd>
              </div>
            ))}
          </dl>
          {/* Blurred placeholders — no real price/address/description in the DOM */}
          <div className="mt-5 space-y-2.5 border-t border-slate-200 pt-4">
            {blurBar("w-2/5")}
            {blurBar("w-full")}
            {blurBar("w-11/12")}
            {blurBar("w-3/5")}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 rounded-xl bg-navy p-6 text-center">
          <p className="font-display text-xl font-extrabold text-white">{t("card.priceOnRequest")}</p>
          <p className="text-sm text-slate-400">{t("gate.sub")}</p>
          <Button variant="premium" size="lg" onClick={() => setModal(true)}>{t("gate.cta")}</Button>
        </div>
      </div>

      {/* Dismissible unlock modal — never blocks the rest of the page (spec note) */}
      <Modal open={modal} onClose={() => setModal(false)} title={t("off.modalTitle")}>
        <div className="flex flex-col gap-4">
          {!user ? (
            <>
              <p className="text-sm text-muted">{t("gate.signInHint")}</p>
              <Link to={to("/login")} state={{ from: location.pathname }}>
                <Button size="lg" className="w-full">{t("gate.signIn")}</Button>
              </Link>
              <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
                <span className="h-px flex-1 bg-slate-300" /> {t("auth.or")} <span className="h-px flex-1 bg-slate-300" />
              </div>
            </>
          ) : (
            /* Signed in but not an approved buyer — distinct messaging (spec 4B) */
            <p className="rounded-lg bg-warn-50 px-4 py-3 text-sm font-semibold text-warn-700">
              {t("gate.notApproved")}
            </p>
          )}

          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <p className="text-sm text-muted">{t("gate.haveCode")}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              aria-label={t("off.codeLabel")}
              placeholder="••••••"
              className="min-h-14 w-full rounded-xl border border-border-strong text-center font-display text-2xl font-extrabold tracking-[0.5em]"
            />
            {error && <p role="alert" className="text-sm font-semibold text-err-700">{error}</p>}
            <Button type="submit" size="lg" loading={busy} disabled={code.length !== 6}>{t("off.unlock")}</Button>
          </form>
        </div>
      </Modal>

    </div>
  );
}

export function PropertyDetailPage() {
  const { id } = useParams();
  const { t, to, locale } = useI18n();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const { favIds, onToggleFavorite } = useFavorites();
  const { hasAccess, grant } = useOffMarketAccess();
  const { data: p, loading } = useApi(() => getProperty(Number(id)), [id]);
  const { data: agent } = useApi(
    () => (p ? getListingAgent(p.agentId) : Promise.resolve(null)),
    [p?.agentId],
  );
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [wantTour, setWantTour] = useState(false);

  /* Query-preserving back link, set by PropertyCard when arriving from search */
  const backTo = (location.state as { back?: string } | null)?.back;

  if (loading) {
    return (
      <div className="mx-auto max-w-shell space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="aspect-[16/8] w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!p) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="mb-2 font-display text-2xl font-extrabold">{t("detail.notFound")}</h1>
        <Link to={to("/properties")} className="font-semibold text-blue-700 hover:underline">{t("detail.backToSearch")}</Link>
      </div>
    );
  }

  /* Off-Market without access → gated view (spec 4B). Unlock re-renders in place. */
  if (p.offMarket && !hasAccess(p.id)) {
    return <GatedDetail p={p} onUnlocked={() => grant(p.id)} />;
  }

  const inactive = p.status === "sold" || p.status === "rented";

  const onInquiry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSending(true);
    void sendInquiry({
      propertyId: p.id, propertyTitle: p.title,
      name: String(fd.get("name")), email: String(fd.get("email")),
      phone: String(fd.get("phone") || ""), message: String(fd.get("message")),
      wantTour,
      tourPreference: wantTour ? String(fd.get("tourPreference") || "") || undefined : undefined,
    })
      .then(() => {
        toast(t("detail.inquirySent"));
        /* Reset only after success so a failed send keeps the user's input */
        form.reset();
        setConsent(false);
        setWantTour(false);
        setSent(true);
      })
      .catch(() => toast(t("detail.inquiryFail"), "error"))
      .finally(() => setSending(false));
  };

  const onShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: p.title, url }).catch(() => undefined);
    } else {
      void navigator.clipboard?.writeText(url);
      toast(t("detail.linkCopied"), "info");
    }
  };

  const isFavorite = favIds.includes(p.id);

  type Fact = { label: string; value: React.ReactNode; icon: typeof Ruler };
  const facts: Fact[] = [
    { label: t("detail.livingArea"), value: `${p.livingArea} m²`, icon: Ruler },
    ...(p.landArea ? [{ label: t("detail.landArea"), value: `${p.landArea} m²`, icon: Tree }] : []),
    { label: t("detail.rooms"), value: String(p.rooms), icon: Door },
    { label: t("detail.bedrooms"), value: String(p.bedrooms), icon: Bed },
    { label: t("detail.bathrooms"), value: String(p.bathrooms), icon: Bathtub },
    ...(p.floor != null ? [{ label: t("detail.floor"), value: String(p.floor), icon: Stairs }] : []),
    ...(p.yearBuilt ? [{ label: t("detail.yearBuilt"), value: String(p.yearBuilt), icon: CalendarBlank }] : []),
  ];

  /* €/m² vs city average (IS24 Preiskarte, reduced to an honest mock) */
  const insight = priceInsight(p);
  const deltaPct = insight.cityAvg ? Math.round(((insight.sqm - insight.cityAvg) / insight.cityAvg) * 100) : null;

  return (
    <div className="mx-auto max-w-shell px-4 pb-24 pt-8 sm:px-6 sm:pb-8 lg:pt-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
        {backTo ? (
          <Link to={backTo} className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> {t("detail.backToResults")}
          </Link>
        ) : (
          <>
            <Link to={to("/properties")} className="hover:text-blue-700 hover:underline">{t("detail.properties")}</Link>
            <span aria-hidden> / </span>{p.location.city}
          </>
        )}
      </nav>

      {/* Sold/Rented status banner — contact is disabled below (spec Screen 4) */}
      {inactive && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn-600/40 bg-warn-50 px-5 py-4">
          <p className="font-bold text-warn-700">
            {p.status === "sold" ? t("detail.soldBanner") : t("detail.rentedBanner")}
          </p>
          <Link
            to={to(`/properties?q=${encodeURIComponent(p.location.city)}`)}
            className="text-sm font-bold text-blue-700 hover:underline"
          >
            {t("detail.browseSimilar")} →
          </Link>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{p.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {locationLabel(p)}{p.location.street ? ` · ${p.location.street}` : ""}
          </p>
          {p.masterProjectId && (
            <Link to={to(`/property/${p.masterProjectId}`)} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
              <Buildings className="size-4" aria-hidden /> {t("detail.partOfProject")}
            </Link>
          )}
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end sm:text-right">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <p className="font-display text-3xl font-extrabold tabular">{fmtPrice(p, locale)}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onToggleFavorite(p.id)}
                aria-label={isFavorite ? t("card.removeFav") : t("card.addFav")}
                aria-pressed={isFavorite}
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-slate-400 bg-white transition-colors hover:bg-slate-100"
              >
                <Heart weight={isFavorite ? "fill" : "regular"} className={`size-5 ${isFavorite ? "text-err-600" : "text-slate-700"}`} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onShare}
                aria-label={t("detail.share")}
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-slate-400 bg-white transition-colors hover:bg-slate-100"
              >
                <ShareNetwork className="size-5 text-slate-700" aria-hidden />
              </button>
            </div>
          </div>
          {/* CZ/PL display estimate — EUR stays the fiscal base (§4.1) */}
          {fmtLocalEstimate(p.price, locale) && (
            <p className="text-sm font-semibold tabular text-muted">
              {fmtLocalEstimate(p.price, locale)} <span className="font-normal">· {t("fx.note")}</span>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-2 text-sm sm:justify-end">
            <span className="font-semibold tabular text-muted">
              {fmtEur(Math.round(insight.sqm), locale)}/m²{p.listingType === "rent" ? ` · ${t("detail.monthly")}` : ""}
            </span>
            {deltaPct !== null && Math.abs(deltaPct) >= 1 && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                  deltaPct < 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                }`}
              >
                {deltaPct < 0
                  ? <TrendDown weight="bold" className="size-3.5 shrink-0" aria-hidden />
                  : <TrendUp weight="bold" className="size-3.5 shrink-0" aria-hidden />}
                {t(deltaPct < 0 ? "detail.belowAvg" : "detail.aboveAvg", { pct: Math.abs(deltaPct), city: p.location.city })}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* ---- Gallery mosaic + lightbox ---- */}
          <Gallery p={p} onOpen={setLightbox} />
          {lightbox !== null && (
            <MediaLightbox
              key={`${lightbox.tab}-${lightbox.idx}`}
              p={p}
              open
              initial={lightbox}
              onClose={() => setLightbox(null)}
            />
          )}

          {/* ---- Facts ---- */}
          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-bold">{t("detail.keyFacts")}</h2>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {p.placement === "top" && <Badge tone="action">{t("card.top")}</Badge>}
              {p.placement === "featured" && <Badge tone="premium">{t("card.featured")}</Badge>}
              {p.isNewConstruction && <Badge tone="info">{t("card.newBuild")}</Badge>}
              <Badge tone={p.listingType === "buy" ? "success" : "info"}>{p.listingType === "buy" ? t("search.forSale") : t("search.forRent")}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon weight="duotone" className="mt-0.5 size-5 shrink-0 text-blue-600" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
                    <dd className="mt-0.5 font-bold tabular">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* EPBD: the energy class must be visible in the ad — full official ladder */}
            {p.energyRating && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{t("detail.energyTitle")}</h3>
                  <span className="text-xs text-muted">{t("detail.energyCert")}{p.yearBuilt ? ` · ${t("detail.built", { y: p.yearBuilt })}` : ""}</span>
                </div>
                <EnergyScale active={p.energyRating} />
                {/* GEG §87 certificate details — mandatory disclosure for DE listings */}
                {(p.energyCertType || p.energyValue || p.energySource || p.energyCertYear) && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
                    {p.energyCertType && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t("detail.energyCertType")}</dt>
                        <dd className="mt-0.5 text-sm font-bold">{t(p.energyCertType === "demand" ? "detail.energyDemand" : "detail.energyConsumption")}</dd>
                      </div>
                    )}
                    {p.energyValue != null && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t("detail.energyValue")}</dt>
                        <dd className="mt-0.5 text-sm font-bold tabular">{p.energyValue.toLocaleString(locale)} kWh/(m²·a)</dd>
                      </div>
                    )}
                    {p.energySource && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t("detail.energySource")}</dt>
                        <dd className="mt-0.5 text-sm font-bold">{p.energySource}</dd>
                      </div>
                    )}
                    {p.energyCertYear && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t("detail.energyYear")}</dt>
                        <dd className="mt-0.5 text-sm font-bold tabular">{p.energyCertYear}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-bold">{t("detail.description")}</h2>
            <p className="hyphens-auto whitespace-pre-line leading-relaxed text-slate-800">{p.description}</p>
          </section>

          {/* Hidden when the listing carries no amenity data (import edge case) */}
          {p.amenities.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-lg font-bold">{t("detail.amenities")}</h2>
              <ul className="flex flex-wrap gap-2">
                {p.amenities.map((a) => {
                  const Icon = amenityIcon(a);
                  return (
                    <li key={a} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-800">
                      <Icon weight="duotone" className="size-4.5 shrink-0 text-blue-600" aria-hidden />
                      {t(`amen.${a}`)}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ---- Purchase costs (buy only) ---- */}
          {p.listingType === "buy" && <PurchaseCostsCard p={p} locale={locale} />}

          {/* ---- Sub-units (New Construction master project) ---- */}
          {p.isNewConstruction && !p.masterProjectId && (
            <SubUnitsSection masterId={p.id} localeTo={to} locale={locale} />
          )}

          {/* ---- Location map snippet (spec Screen 4) — city-level viewport ---- */}
          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-bold">{t("detail.location")}</h2>
            <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
              <MapCanvas properties={[p]} center={p.location.geo} zoom={13} interactive={false} />
            </div>
            <Link
              to={to(`/map?q=${encodeURIComponent(p.location.city)}`)}
              className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
            >
              {t("detail.openArea", { city: p.location.city })} →
            </Link>
          </section>
        </div>

        {/* ---- Sidebar: contact form, then optional financing (separate surface) ---- */}
        <aside>
          <div className="sticky top-20 flex flex-col gap-6">
            <div id="contact-agent" className="scroll-mt-20 rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {(agent?.name ?? "•").charAt(0)}
                </span>
                <div>
                  <p className="font-bold">{agent?.name ?? t("detail.listingAgent")}</p>
                  <p className="text-xs text-muted">
                    {agent?.company ?? "—"}
                    {agent?.verified && (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                          <SealCheck weight="fill" className="size-3.5" aria-hidden /> {t("detail.verifiedAgent")}
                        </span>
                      </>
                    )}
                  </p>
                  {agent && <p className="mt-0.5 text-xs text-muted">{t("detail.speaks", { langs: agent.languages.join(" · ") })}</p>}
                </div>
              </div>
              {inactive ? (
                <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-muted">
                  {t("detail.inactiveContact")}
                </p>
              ) : (
              <form onSubmit={onInquiry} className="flex flex-col gap-3.5">
                <Input name="name" label={t("form.name")} required autoComplete="name" />
                <Input name="email" type="email" label={t("form.email")} required autoComplete="email" />
                <Input name="phone" type="tel" label={t("form.phone")} hint={t("form.optional")} autoComplete="tel" />
                <Textarea name="message" label={t("form.message")} required defaultValue={t("detail.msgDefault", { title: p.title })} />
                <label className="flex min-h-6 cursor-pointer items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={wantTour}
                    onChange={(e) => setWantTour(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action"
                  />
                  <span className="font-semibold">{t("detail.wantTour")}</span>
                </label>
                {wantTour && (
                  <Input
                    name="tourPreference"
                    label={`${t("detail.tourPreference")} ${t("form.optionalTag")}`}
                    hint={t("detail.tourPreferenceHint")}
                    placeholder={t("detail.tourPreferencePh")}
                  />
                )}
                <Consent checked={consent} onChange={setConsent}>
                  {t("form.consentPre")} <Link to={to("/legal/privacy")} className="font-semibold text-blue-700 underline">{t("form.privacy")}</Link>{t("form.consentPost")}
                </Consent>
                <Button type="submit" size="lg" loading={sending} disabled={!consent}>{t("detail.contactAgent")}</Button>
              </form>
              )}

              {/* Soft register nudge after a guest inquiry — never blocks the flow */}
              {sent && !user && (
                <div className="mt-4 rounded-lg bg-blue-50 p-3.5 text-sm">
                  <p className="font-bold text-navy">{t("detail.inquiryDone")}</p>
                  <p className="mt-0.5 text-muted">{t("detail.inquiryNudge")}</p>
                  <Link
                    to={to("/register")}
                    state={{ from: location.pathname + location.search }}
                    className="mt-1.5 inline-block font-bold text-blue-700 hover:underline"
                  >
                    {t("detail.nudgeCta")}
                  </Link>
                </div>
              )}
            </div>

            {p.listingType === "buy" && <FinancingCard p={p} locale={locale} />}
          </div>
        </aside>
      </div>

      {/* ---- Mobile sticky contact bar — the form sits far down-page on phones ---- */}
      {!inactive && (
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-300 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-display text-lg font-extrabold tabular">{fmtPrice(p, locale)}</p>
          <Button onClick={() => document.getElementById("contact-agent")?.scrollIntoView({ behavior: "smooth" })}>
            {t("detail.contactAgent")}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
