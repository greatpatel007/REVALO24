import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Blueprint, Buildings, HouseLine, LockKey, MagnifyingGlass, MapTrifold, Sparkle } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/lib/useApi";
import { autocompleteLocations, EXPLORE_CITIES, getFeatured, getOffMarket, POPULAR_CITIES, searchProperties } from "@/features/property/api";
import { useFavorites } from "@/features/account/useFavorites";
import { CATEGORY_INDEX, cityPhoto, HERO_PHOTO, INVENTORY_TOTAL } from "@/shared/mock/db";
import { LOCALES } from "@/shared/i18n/dictionaries";
import { PropertyCard, LockIcon } from "@/features/property/PropertyCard";
import { MapCanvas } from "@/features/search/MapCanvas";
import { Seg } from "@/shared/ui/Seg";
import { Button } from "@/shared/ui/Button";
import { CardSkeletonGrid } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { CityIndexEntry, ListingType } from "@/shared/types";

/* Shared section-header pattern: overline + display heading (+ optional link) */
function SectionHeader({ overline, title, href, linkLabel }: { overline: string; title: string; href?: string; linkLabel?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="t-overline text-blue-700">{overline}</p>
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm font-semibold text-blue-700 transition-transform active:scale-[0.96] hover:underline"
        >
          {linkLabel ?? t("home.viewAll")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

const CATEGORY_ICONS: Record<string, typeof Buildings> = {
  Apartments: Buildings,
  Houses: HouseLine,
  "New Construction": Blueprint,
  "Off-Market": LockKey,
};

export function HomePage() {
  const { t, to, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ListingType>("buy");
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<CityIndexEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { favIds, onToggleFavorite } = useFavorites();

  const featured = useApi(getFeatured);
  const offmarket = useApi(getOffMarket);
  const mapProps = useApi(() => searchProperties({ perPage: 50 }));
  const featuredList = featured.data ?? [];

  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const h = setTimeout(() => {
      void autocompleteLocations(q).then((s) => { setSuggestions(s); setOpen(true); setHighlighted(-1); });
    }, 180);
    return () => clearTimeout(h);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => () => {
    if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
  }, []);

  const submit = (term = q) => {
    navigate(to(`/properties?type=${mode}${term ? `&q=${encodeURIComponent(term)}` : ""}`));
  };

  /* WAI-ARIA combobox keyboard pattern: arrows move the highlight, Enter picks it */
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      const s = suggestions[highlighted];
      setQ(s.city);
      setOpen(false);
      submit(s.city);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <>
      {/* ---- 1. Photo hero + omnibox ---- */}
      <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden px-4 py-11 sm:py-12">
        {/* Crop biased below center: keeps the villa + pool (lower half of the
            photo) in frame on wide viewports; spare sky gets trimmed instead */}
        <img src={HERO_PHOTO} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[center_62%]" />
        {/* Light global scrim keeps the photo bright; the radial layer concentrates darkening
            behind the centred text so busy image detail never fights the headline */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/45 via-navy/25 to-navy/55" aria-hidden />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(15,23,42,0.55), transparent 100%)" }}
        />
        <div className="relative z-10 w-full max-w-2xl text-center">
          <p className="t-overline mb-3 text-blue-100/90">{t("hero.overline")}</p>
          <h1 className="mb-3 font-display text-3xl font-extrabold leading-tight text-white [text-shadow:0_2px_16px_rgba(15,23,42,0.55)] sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mb-7 max-w-xl text-pretty text-base text-slate-200 [text-shadow:0_1px_10px_rgba(15,23,42,0.6)] sm:text-lg">{t("hero.sub")}</p>

          <div ref={boxRef} className="relative">
            <form
              onSubmit={(e) => { e.preventDefault(); submit(); }}
              className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-elevation-lg sm:flex-row sm:items-center"
            >
              <Seg
                ariaLabel={t("search.listingType")}
                options={[{ value: "buy", label: t("nav.buy") }, { value: "rent", label: t("nav.rent") }]}
                value={mode}
                onChange={setMode}
                className="!rounded-lg"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                  if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
                  if (suggestions.length) setOpen(true);
                }}
                onBlur={() => {
                  blurCloseRef.current = setTimeout(() => {
                    setOpen(false);
                    setHighlighted(-1);
                  }, 120);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={t("hero.placeholder")}
                aria-label={t("hero.placeholder")}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open && suggestions.length > 0}
                aria-controls="hero-suggestions"
                aria-activedescendant={highlighted >= 0 ? `hero-suggestion-${highlighted}` : undefined}
                className="min-h-11 flex-1 rounded-lg bg-transparent px-4 text-base text-navy placeholder:text-slate-500 sm:text-sm"
              />
              <Button type="submit" size="lg" className="rounded-lg sm:shrink-0">
                <MagnifyingGlass className="size-4.5" weight="bold" aria-hidden />
                {t("common.search")}
              </Button>
            </form>

            {open && suggestions.length > 0 && (
              <ul id="hero-suggestions" role="listbox" className="absolute inset-x-2 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-300 bg-white text-left shadow-elevation-lg">
                {suggestions.map((s, i) => (
                  <li key={s.city}>
                    <button
                      type="button"
                      id={`hero-suggestion-${i}`}
                      role="option"
                      aria-selected={i === highlighted}
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setQ(s.city); setOpen(false); submit(s.city); }}
                      onMouseEnter={() => setHighlighted(i)}
                      className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-4 text-sm ${i === highlighted ? "bg-blue-50" : ""}`}
                    >
                      <span><strong>{s.city}</strong> · {s.country} · {s.zip}</span>
                      <span className="text-xs text-muted">{s.count} {t("home.listings")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Inventory trust line (Sreality pattern) */}
          <p className="mt-4 text-sm font-semibold text-blue-100">
            {t("home.inventory", { count: INVENTORY_TOTAL.toLocaleString(locale) })}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {POPULAR_CITIES.map((c) => (
              <Link
                key={c.city}
                to={to(`/properties?type=${mode}&q=${encodeURIComponent(c.city)}`)}
                className="inline-flex min-h-11 items-center rounded-lg border border-white/35 bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur transition-[color,background-color,transform] hover:bg-white/25 active:scale-[0.96]"
              >
                {c.city} <span className="ml-1 text-blue-200">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 2. Featured & Top placements (white) ---- */}
      <section className="mx-auto max-w-shell px-4 py-14 sm:px-6">
        <SectionHeader overline={t("home.featuredOverline")} title={t("home.featuredTitle")} href={to("/properties")} />
        {featured.loading ? (
          <CardSkeletonGrid count={8} />
        ) : featured.error ? (
          <ErrorState message={t("home.featuredError")} onRetry={featured.reload} />
        ) : featuredList.length === 0 ? (
          <EmptyState title={t("home.featuredEmpty")}>
            <p className="mb-4">{t("home.featuredEmptyBody")}</p>
            <Link to={to("/properties")}>
              <Button variant="secondary" size="sm">{t("home.viewAll")}</Button>
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {featuredList.map((p) => (
              <PropertyCard key={p.id} property={p} favorite={favIds.includes(p.id)} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        )}
      </section>

      {/* ---- 2b. Browse by category — Sreality entry points ---- */}
      <section aria-label={t("home.categoryAria")} className="mx-auto max-w-shell px-4 pb-14 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORY_INDEX.map((c) => {
            const Icon = CATEGORY_ICONS[c.label] ?? Buildings;
            return (
              <Link
                key={c.label}
                to={to(c.href ?? `/properties?kind=${encodeURIComponent(c.kind ?? "")}`)}
                className="group flex items-center gap-3.5 rounded-xl border border-slate-300 bg-white p-4 shadow-elevation-sm transition-[border-color,transform] hover:border-action active:scale-[0.96]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700" aria-hidden>
                  <Icon weight="duotone" className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold group-hover:text-blue-700">{t(`cat.${c.label}`)}</span>
                  <span className="block text-xs font-semibold tabular text-muted">
                    {c.count.toLocaleString(locale)} {t("home.listings")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- 3. Explore by city (canvas) ---- */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-shell px-4 py-14 sm:px-6">
          <SectionHeader overline={t("home.exploreOverline")} title={t("home.exploreTitle")} href={to("/map")} linkLabel={t("home.exploreLink")} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {EXPLORE_CITIES.map((c, i) => (
              <Link
                key={c.city}
                to={to(`/properties?type=${mode}&q=${encodeURIComponent(c.city)}`)}
                className="group relative block aspect-[4/5] overflow-hidden rounded-xl shadow-elevation-sm transition-transform active:scale-[0.96]"
              >
                <img
                  src={cityPhoto(c.city, i)}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="h-full w-full object-cover outline outline-1 outline-offset-[-1px] outline-black/10"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/15 to-transparent transition-colors duration-300 group-hover:from-navy/90 group-hover:via-navy/25" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="font-display text-base font-extrabold text-white">{c.city}</p>
                  <p className="text-xs font-semibold text-blue-100">{c.count} {t("home.listings")}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 4. Explore the map (white) — single interactive surface ---- */}
      <section className="mx-auto max-w-shell px-4 py-14 sm:px-6">
        <Link
          to={to("/map")}
          className="group relative block h-[380px] overflow-hidden rounded-2xl border border-slate-300 shadow-elevation-sm transition-shadow hover:shadow-elevation-md sm:h-[440px]"
        >
          {/* pointer-events-none so the map engine doesn't swallow the link click */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <MapCanvas properties={mapProps.data?.data ?? []} interactive={false} showAttribution={false} />
          </div>
          {/* z-20 keeps the copy above the map markers (which sit at z-10) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-navy/85 via-navy/55 to-transparent p-5 pt-14 sm:p-7 sm:pt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-md">
                <p className="t-overline mb-1 flex items-center gap-1.5 text-blue-100">
                  <MapTrifold className="size-4" aria-hidden /> {t("home.mapOverline")}
                </p>
                <h2 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                  {t("home.mapTitle")}
                </h2>
                <p className="mt-1 text-sm text-slate-200">{t("home.mapSub")}</p>
              </div>
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-navy transition-[background-color,transform] group-hover:bg-blue-50 group-active:scale-[0.96]">
                {t("home.mapCta")} <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ---- 5. Off-Market teaser (navy band) ---- */}
      <section className="bg-navy">
        <div className="mx-auto grid max-w-shell items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="t-overline mb-2 text-champagne-100/80">{t("home.offOverline")}</p>
            <h2 className="mb-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
              {t("home.offTitle")}
            </h2>
            <p className="mb-6 max-w-lg text-pretty text-slate-400">{t("home.offSub")}</p>
            <Link
              to={to("/off-market")}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-premium px-6 text-sm font-bold text-premium-accent transition-[background-color,transform] hover:bg-champagne-700 active:scale-[0.96]"
            >
              <LockIcon className="size-4.5" /> {t("home.offCta")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(offmarket.data ?? []).slice(0, 2).map((p) => (
              <PropertyCard key={p.id} property={p} compact />
            ))}
          </div>
        </div>
      </section>

      {/* ---- 5b. Soft B2C register nudge (guests only) — buyers see their
             CTA before the agent-facing band below ---- */}
      {!user && (
        <section aria-label={t("home.nudgeCta")} className="mx-auto max-w-shell px-4 pt-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-blue-50 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-display text-lg font-extrabold">{t("home.nudgeTitle")}</h2>
              <p className="text-sm text-muted">{t("home.nudgeSub")}</p>
            </div>
            <Link to={to("/register")}><Button>{t("home.nudgeCta")}</Button></Link>
          </div>
        </section>
      )}

      {/* ---- 6. Agent / B2B band (replaces the value-prop cards) ---- */}
      <section className="mx-auto max-w-shell px-4 py-14 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* AI Exposé banner */}
          <div className="flex flex-col rounded-2xl border border-slate-300 bg-gradient-to-br from-blue-50 to-white p-7 sm:p-8">
            <p className="t-overline mb-2 flex items-center gap-1.5 text-blue-700">
              <Sparkle weight="duotone" className="size-4.5" aria-hidden /> {t("home.aiOverline")}
            </p>
            <h2 className="mb-2 font-display text-xl font-extrabold sm:text-2xl">
              {t("home.aiTitle")}
            </h2>
            <p className="mb-5 max-w-md text-pretty text-sm text-muted">{t("home.aiSub")}</p>
            <div className="mb-6 flex flex-wrap gap-1.5" aria-hidden>
              {LOCALES.map((l) => (
                <span key={l.code} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-blue-700 shadow-elevation-sm">
                  {l.code}
                </span>
              ))}
            </div>
            <Link
              to={to("/agents")}
              className="mt-auto inline-flex items-center gap-1 self-start text-sm font-bold text-blue-700 transition-transform active:scale-[0.96] hover:underline"
            >
              {t("home.aiCta")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* B2B onboarding CTA */}
          <div className="flex flex-col rounded-2xl bg-navy p-7 text-white sm:p-8">
            <p className="t-overline mb-2 flex items-center gap-1.5 text-champagne-100/80">
              <Buildings weight="duotone" className="size-4.5" aria-hidden /> {t("home.b2bOverline")}
            </p>
            <h2 className="mb-2 font-display text-xl font-extrabold sm:text-2xl">
              {t("home.b2bTitle")}
            </h2>
            <p className="mb-6 max-w-md text-pretty text-sm text-slate-400">{t("home.b2bSub")}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                to={to("/register?role=agent")}
                className="inline-flex min-h-12 items-center rounded-lg bg-action px-6 text-sm font-bold text-white transition-[background-color,transform] hover:bg-action-hover active:scale-[0.96]"
              >
                {t("home.b2bCta")}
              </Link>
              <Link
                to={to("/agents#plans")}
                className="inline-flex min-h-12 items-center rounded-lg border border-white/30 px-6 text-sm font-bold text-white transition-[background-color,transform] hover:bg-white/10 active:scale-[0.96]"
              >
                {t("home.b2bPlans")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
