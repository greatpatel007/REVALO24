import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowsDownUp, BellRinging, CaretDown, Check, Faders, ListBullets, MapTrifold } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { saveSearch } from "@/features/account/api";
import { COUNTRY_OPTIONS, PROPERTY_TYPES } from "@/shared/mock/db";
import { Seg, RADIUS_OPTIONS } from "@/shared/ui/Seg";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Field";
import { Modal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";
import type { AlertFrequency, ListingType, Locale, PropertyFilters } from "@/shared/types";

/* One search experience, two views: the URL query string is the single
   source of truth shared by /properties (list) and /map. Switching views
   keeps every active filter, so the experience is seamless. */

export function useSearchFilters() {
  const [params, setParams] = useSearchParams();

  const filters: PropertyFilters = useMemo(() => ({
    type: (params.get("type") as ListingType) || undefined,
    q: params.get("q") || undefined,
    country: params.get("country") || undefined,
    propertyType: params.get("kind") || undefined,
    priceMin: Number(params.get("min")) || undefined,
    priceMax: Number(params.get("max")) || undefined,
    areaMin: Number(params.get("area")) || undefined,
    bedroomsMin: Number(params.get("beds")) || undefined,
    energyClass: params.get("energy") || undefined,
    amenities: params.get("amen")?.split(",").filter(Boolean) || undefined,
    radiusKm: (Number(params.get("radius")) as PropertyFilters["radiusKm"]) || undefined,
    sort: (params.get("sort") as PropertyFilters["sort"]) || "new",
    page: Number(params.get("page")) || 1,
  }), [params]);

  const set = (patch: Record<string, string | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const activeCount = ["type", "min", "max", "beds", "kind", "radius", "energy", "amen", "country", "area"].filter((k) => params.get(k)).length;

  return { params, filters, set, reset, activeCount };
}

type PillId = "type" | "price" | "beds" | "kind" | "more";

/** Amenity toggles surfaced in the "More" panel (IS24 filter-depth pattern) */
const MORE_AMENITIES = ["Balcony", "Garden", "Parking", "Elevator"];

export const SORT_OPTIONS: { value: NonNullable<PropertyFilters["sort"]>; labelKey: string }[] = [
  { value: "new", labelKey: "search.sortNew" },
  { value: "price_asc", labelKey: "search.sortPriceAsc" },
  { value: "price_desc", labelKey: "search.sortPriceDesc" },
];

/** Zillow-style floating control, bottom-center: a List | Map segmented
    switch that carries the full query string, plus — in list view on
    mobile — a Sort segment opening a bottom sheet (the header sort select
    is desktop-only). */
export function FloatingViewSwitch({ view }: { view: "list" | "map" }) {
  const { t, to } = useI18n();
  const { params, filters, set } = useSearchFilters();
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (!sortOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSortOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sortOpen]);

  const crossParams = new URLSearchParams(params);
  crossParams.delete("page"); // list-only concept
  const qs = crossParams.toString() ? `?${crossParams.toString()}` : "";

  const seg = (active: boolean) =>
    `flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-bold transition-colors ${
      active ? "bg-white text-navy" : "text-slate-300 hover:text-white"
    }`;

  return (
    <>
      <div
        role="group"
        aria-label={t("search.view")}
        className="fixed bottom-6 left-1/2 z-120 flex -translate-x-1/2 items-center rounded-xl bg-navy p-1 shadow-elevation-lg"
      >
        <Link to={to(`/properties${qs}`)} aria-current={view === "list" ? "page" : undefined} className={seg(view === "list")}>
          <ListBullets weight="bold" className="size-4.5" aria-hidden /> {t("search.list")}
        </Link>
        <Link to={to(`/map${qs}`)} aria-current={view === "map" ? "page" : undefined} className={seg(view === "map")}>
          <MapTrifold weight="bold" className="size-4.5" aria-hidden /> {t("nav.map")}
        </Link>
        {view === "list" && (
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
            className={`${seg(false)} cursor-pointer border-l border-white/20 sm:hidden`}
          >
            <ArrowsDownUp weight="bold" className="size-4.5" aria-hidden /> {t("search.sort")}
          </button>
        )}
      </div>

      {/* ---- Mobile sort bottom sheet ---- */}
      {sortOpen && (
        <div className="fixed inset-0 z-90 flex items-end bg-navy/50 sm:hidden" onClick={() => setSortOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t("search.sortBy")} className="w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-400" aria-hidden />
            <h2 className="mb-2 text-lg font-bold">{t("search.sortBy")}</h2>
            <ul>
              {SORT_OPTIONS.map((o) => {
                const active = (filters.sort ?? "new") === o.value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => { set({ sort: o.value === "new" ? undefined : o.value }); setSortOpen(false); }}
                      className={`flex min-h-12 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-sm ${
                        active ? "bg-blue-50 font-bold text-blue-700" : "font-semibold text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {t(o.labelKey)}
                      {active && <Check weight="bold" className="size-4.5" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Saved-search dialog (IS24 Suchauftrag / Sreality alert pattern) ---- */

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Human-readable chips for the active filters — reused as the default name. */
export function filterChips(f: PropertyFilters, t: Translate, locale: Locale = "en"): string[] {
  const chips: string[] = [f.type === "rent" ? t("search.forRent") : f.type === "buy" ? t("search.forSale") : t("search.buyOrRent")];
  if (f.q) chips.push(f.radiusKm ? `${f.q} + ${f.radiusKm} km` : f.q);
  if (f.country) chips.push(f.country);
  if (f.priceMin || f.priceMax) {
    chips.push(`€${(f.priceMin ?? 0).toLocaleString(locale)} – ${f.priceMax ? `€${f.priceMax.toLocaleString(locale)}` : "∞"}`);
  }
  if (f.areaMin) chips.push(t("chips.area", { n: f.areaMin }));
  if (f.bedroomsMin) chips.push(t("chips.minBeds", { n: f.bedroomsMin }));
  if (f.propertyType) chips.push(t(`kind.${f.propertyType}`));
  if (f.energyClass) chips.push(t("chips.energy", { c: f.energyClass }));
  chips.push(...(f.amenities ?? []).map((a) => t(`amen.${a}`)));
  return chips;
}

const FREQ_OPTIONS: { value: AlertFrequency; labelKey: string }[] = [
  { value: "instant", labelKey: "freq.instant" },
  { value: "daily", labelKey: "freq.daily" },
  { value: "weekly", labelKey: "freq.weekly" },
  { value: "off", labelKey: "freq.off" },
];
const FREQ_TOAST: Record<AlertFrequency, string> = {
  instant: "search.savedInstant",
  daily: "search.savedDaily",
  weekly: "search.savedWeekly",
  off: "search.savedOff",
};

function SaveSearchDialog({ filters, onClose }: { filters: PropertyFilters; onClose: () => void }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const chips = filterChips(filters, t, locale);
  const [name, setName] = useState(() => chips.slice(0, 3).join(" · "));
  const [freq, setFreq] = useState<AlertFrequency>("daily");
  const [saving, setSaving] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    void saveSearch(name.trim() || t("chips.allProperties"), filters, freq)
      .then(() => { toast(t(FREQ_TOAST[freq])); onClose(); })
      .finally(() => setSaving(false));
  };

  return (
    <Modal open onClose={onClose} title={t("search.saveTitle")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input label={t("search.saveName")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t("search.yourFilters")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <li key={c} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800">{c}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">{t("search.emailMatches")}</p>
          <Seg
            ariaLabel={t("search.alertFreq")}
            wrap
            options={FREQ_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            value={freq}
            onChange={setFreq}
          />
          <p className="mt-2 text-xs text-muted">{t("search.saveHint")}</p>
        </div>

        <Button type="submit" size="lg" loading={saving}>
          <BellRinging weight="bold" className="size-4.5" aria-hidden /> {t("search.saveSearch")}
        </Button>
      </form>
    </Modal>
  );
}

interface FilterBarProps {
  /** sticky in the scrolling list view; static inside the fixed-height map layout */
  sticky?: boolean;
  /** result total for the mobile sheet's Done button */
  total?: number;
}

export function FilterBar({ sticky = false, total }: FilterBarProps) {
  const { t, to, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { filters, set, reset, activeCount } = useSearchFilters();
  const [openPill, setOpenPill] = useState<PillId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  /* Guest-gated like favorites: info toast + route to login, with a return
     path so the search (incl. filters) is restored after signing in */
  const onSaveSearch = () => {
    if (!user) {
      toast(t("search.saveGate"), "info");
      navigate(to("/login"), { state: { from: location.pathname + location.search } });
      return;
    }
    setSaveOpen(true);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenPill(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* Escape dismisses open panels/sheets (keyboard parity with backdrop click) */
  useEffect(() => {
    if (!sheetOpen && !openPill) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSheetOpen(false); setOpenPill(null); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, openPill]);

  const pill = (id: PillId, label: string, active: boolean) => (
    <button
      type="button"
      aria-expanded={openPill === id}
      onClick={() => setOpenPill(openPill === id ? null : id)}
      className={`flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition-colors ${
        active ? "border-action bg-blue-50 text-blue-700" : "border-slate-400 bg-white text-slate-800 hover:border-border-strong"
      }`}
    >
      {label} <CaretDown className="size-3" aria-hidden />
    </button>
  );

  /* w-max + max-w keeps wide content (e.g. the radius segmented control)
     inside the dropdown instead of bleeding past a fixed width */
  const panel = "absolute top-full z-60 mt-2 w-max min-w-72 max-w-[min(92vw,400px)] rounded-xl border border-slate-300 bg-white p-4 shadow-elevation-lg";

  const moreCount =
    (filters.country ? 1 : 0) + (filters.areaMin ? 1 : 0) +
    (filters.radiusKm ? 1 : 0) + (filters.energyClass ? 1 : 0) + (filters.amenities?.length ?? 0);

  const filterGroups = (
    <>
      <fieldset className="relative">
        <legend className="sr-only">{t("search.listingType")}</legend>
        <div className="lg:hidden"><p className="mb-2 text-sm font-bold">{t("search.listingType")}</p></div>
        <span className="hidden lg:inline">
          {pill("type", filters.type ? (filters.type === "rent" ? t("search.forRent") : t("search.forSale")) : t("search.buyOrRent"), !!filters.type)}
        </span>
        <div className={`${openPill === "type" ? "block" : "hidden"} max-lg:block max-lg:static max-lg:mt-0 max-lg:w-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none ${panel}`}>
          <Seg
            ariaLabel={t("search.listingType")}
            options={[{ value: "", label: t("search.all") }, { value: "buy", label: t("search.forSale") }, { value: "rent", label: t("search.forRent") }]}
            value={filters.type ?? ""}
            onChange={(v) => { set({ type: v || undefined }); setOpenPill(null); }}
          />
        </div>
      </fieldset>

      <fieldset className="relative">
        <legend className="sr-only">{t("search.price")}</legend>
        <div className="lg:hidden"><p className="mb-2 text-sm font-bold">{t("search.price")}</p></div>
        <span className="hidden lg:inline">
          {pill("price", filters.priceMin || filters.priceMax
            ? `€${(filters.priceMin ?? 0).toLocaleString(locale)} – ${filters.priceMax ? `€${filters.priceMax.toLocaleString(locale)}` : "∞"}`
            : t("search.price"), !!(filters.priceMin || filters.priceMax))}
        </span>
        <div className={`${openPill === "price" ? "block" : "hidden"} max-lg:block max-lg:static max-lg:mt-0 max-lg:w-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none ${panel}`}>
          {/* key remounts the uncontrolled inputs when the URL value changes (e.g. Reset) */}
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" placeholder="Min €" key={`min-${filters.priceMin ?? ""}`} defaultValue={filters.priceMin ?? ""} aria-label={t("search.minPrice")}
              onBlur={(e) => set({ min: e.target.value || undefined })}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="min-h-11 w-full rounded-lg border border-border-strong px-3 text-base sm:text-sm" />
            <span aria-hidden className="text-muted">–</span>
            <input type="number" inputMode="numeric" placeholder="Max €" key={`max-${filters.priceMax ?? ""}`} defaultValue={filters.priceMax ?? ""} aria-label={t("search.maxPrice")}
              onBlur={(e) => set({ max: e.target.value || undefined })}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="min-h-11 w-full rounded-lg border border-border-strong px-3 text-base sm:text-sm" />
          </div>
        </div>
      </fieldset>

      <fieldset className="relative">
        <legend className="sr-only">{t("search.beds")}</legend>
        <div className="lg:hidden"><p className="mb-2 text-sm font-bold">{t("search.beds")}</p></div>
        <span className="hidden lg:inline">{pill("beds", filters.bedroomsMin ? `${filters.bedroomsMin}+ ${t("search.beds")}` : t("search.beds"), !!filters.bedroomsMin)}</span>
        <div className={`${openPill === "beds" ? "block" : "hidden"} max-lg:block max-lg:static max-lg:mt-0 max-lg:w-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none ${panel}`}>
          <Seg
            ariaLabel={t("search.minBeds")}
            wrap
            options={[{ value: 0, label: t("search.any") }, { value: 1, label: "1+" }, { value: 2, label: "2+" }, { value: 3, label: "3+" }, { value: 4, label: "4+" }]}
            value={filters.bedroomsMin ?? 0}
            onChange={(v) => { set({ beds: v ? String(v) : undefined }); setOpenPill(null); }}
          />
        </div>
      </fieldset>

      <fieldset className="relative">
        <legend className="sr-only">{t("search.homeType")}</legend>
        <div className="lg:hidden"><p className="mb-2 text-sm font-bold">{t("search.homeType")}</p></div>
        <span className="hidden lg:inline">{pill("kind", filters.propertyType ? t(`kind.${filters.propertyType}`) : t("search.homeType"), !!filters.propertyType)}</span>
        <div className={`${openPill === "kind" ? "block" : "hidden"} max-lg:block max-lg:static max-lg:mt-0 max-lg:w-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none ${panel}`}>
          <div className="flex flex-wrap gap-2">
            {["", ...PROPERTY_TYPES].map((k) => (
              <button key={k || "all"} type="button"
                onClick={() => { set({ kind: k || undefined }); setOpenPill(null); }}
                className={`min-h-9 cursor-pointer rounded-lg border px-3 text-xs font-semibold ${
                  (filters.propertyType ?? "") === k ? "border-action bg-blue-50 text-blue-700" : "border-slate-400 text-slate-800 hover:border-border-strong"
                }`}>
                {k ? t(`kind.${k}`) : t("search.any")}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="relative">
        <legend className="sr-only">{t("search.more")}</legend>
        <span className="hidden lg:inline">
          {pill("more", moreCount ? `${t("search.more")} · ${moreCount}` : t("search.more"), moreCount > 0)}
        </span>
        <div className={`${openPill === "more" ? "block" : "hidden"} max-lg:block max-lg:static max-lg:mt-0 max-lg:w-full max-lg:border-0 max-lg:p-0 max-lg:shadow-none ${panel} right-0`}>
          {/* Country + Living area (spec Screen 2 filter set) */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">{t("search.country")}</span>
              <span className="relative block">
                <select
                  value={filters.country ?? ""}
                  onChange={(e) => set({ country: e.target.value || undefined })}
                  className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-border-strong bg-white pl-3 pr-9 text-base sm:text-sm"
                >
                  <option value="">{t("search.allCountries")}</option>
                  {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <CaretDown weight="bold" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" aria-hidden />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">{t("search.livingAreaMin")}</span>
              <input
                type="number" inputMode="numeric" min={0} placeholder="Min m²"
                key={`area-${filters.areaMin ?? ""}`} defaultValue={filters.areaMin ?? ""}
                onBlur={(e) => set({ area: e.target.value || undefined })}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="min-h-11 w-full rounded-lg border border-border-strong px-3 text-base sm:text-sm"
              />
            </label>
          </div>

          <p className="mb-2 mt-5 text-sm font-bold">{t("search.radius")}</p>
          <Seg
            ariaLabel={t("search.radius")}
            wrap
            options={[{ value: 0, label: t("search.radiusOff") }, ...RADIUS_OPTIONS]}
            value={filters.radiusKm ?? 0}
            onChange={(v) => set({ radius: v ? String(v) : undefined })}
          />
          <p className="mt-2 text-xs text-muted">
            {filters.q ? t("search.radiusAround", { q: filters.q }) : t("search.radiusHint")}
          </p>

          <p className="mb-2 mt-5 text-sm font-bold">{t("search.energy")}</p>
          <Seg
            ariaLabel={t("search.energy")}
            wrap
            options={[{ value: "", label: t("search.any") }, { value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" }]}
            value={filters.energyClass ?? ""}
            onChange={(v) => set({ energy: v || undefined })}
          />
          <p className="mt-2 text-xs text-muted">{t("search.energyHint")}</p>

          <p className="mb-2 mt-5 text-sm font-bold">{t("search.amenities")}</p>
          <div className="flex flex-wrap gap-2">
            {MORE_AMENITIES.map((a) => {
              const selected = (filters.amenities ?? []).includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const current = filters.amenities ?? [];
                    const next = selected ? current.filter((x) => x !== a) : [...current, a];
                    set({ amen: next.length ? next.join(",") : undefined });
                  }}
                  className={`flex min-h-9 cursor-pointer items-center gap-1 rounded-lg border px-3 text-xs font-semibold ${
                    selected ? "border-action bg-blue-50 text-blue-700" : "border-slate-400 text-slate-800 hover:border-border-strong"
                  }`}
                >
                  {selected && <Check weight="bold" className="size-3.5" aria-hidden />}
                  {t(`amen.${a}`)}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>
    </>
  );

  return (
    <>
      <div ref={barRef} className={`${sticky ? "sticky top-16" : ""} z-60 border-b border-slate-300 bg-white py-3`}>
        <div className="mx-auto flex max-w-shell items-center gap-2 px-4 sm:px-6">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <input
              type="search"
              defaultValue={filters.q ?? ""}
              key={filters.q}
              placeholder={t("hero.placeholder")}
              aria-label={t("hero.placeholder")}
              onKeyDown={(e) => { if (e.key === "Enter") set({ q: (e.target as HTMLInputElement).value || undefined }); }}
              className="min-h-11 w-full rounded-lg border border-border-strong bg-white px-3.5 text-base placeholder:text-slate-500 sm:text-sm"
            />
          </div>

          <div className="hidden items-center gap-2 lg:flex">{filterGroups}</div>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-400 px-4 text-sm font-semibold lg:hidden"
          >
            <Faders className="size-4.5" aria-hidden /> {t("search.filters")}
            {activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-action text-[11px] font-bold text-white">{activeCount}</span>}
          </button>

          {/* Bell CTA (IS24 Suchauftrag) — quiet outline so it doesn't compete
              with the filter pills; shared by list and map views */}
          <button
            type="button"
            onClick={onSaveSearch}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-border-strong hover:bg-slate-100"
          >
            <BellRinging weight="duotone" className="size-4.5 text-blue-600" aria-hidden />
            <span className="hidden sm:inline">{t("search.saveSearch")}</span>
            <span className="sr-only sm:hidden">{t("search.saveSearch")}</span>
          </button>

          {activeCount > 0 && (
            <button type="button" onClick={reset}
              className="hidden min-h-11 cursor-pointer whitespace-nowrap px-2 text-sm font-semibold text-blue-700 hover:underline lg:block">
              {t("common.reset")}
            </button>
          )}
        </div>
      </div>

      {saveOpen && <SaveSearchDialog filters={filters} onClose={() => setSaveOpen(false)} />}

      {/* ---- Mobile filter sheet ---- */}
      {sheetOpen && (
        <div className="fixed inset-0 z-90 flex items-end bg-navy/50 lg:hidden" onClick={() => setSheetOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t("search.filters")} className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-400" aria-hidden />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("search.filters")}</h2>
              <button type="button" onClick={reset} className="cursor-pointer text-sm font-semibold text-blue-700">{t("common.reset")}</button>
            </div>
            <div className="flex flex-col gap-6">{filterGroups}</div>
            <Button className="mt-6 w-full" size="lg" onClick={() => setSheetOpen(false)}>
              {t("common.done")} {total !== undefined ? `· ${total} ${t("search.results")}` : ""}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
