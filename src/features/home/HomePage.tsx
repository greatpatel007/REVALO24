import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Blueprint, Buildings, HouseLine, LockKey } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getFeatured, getOffMarket } from "@/features/property/api";
import { useFavorites } from "@/features/account/useFavorites";
import { CATEGORY_INDEX } from "@/shared/mock/db";
import { PropertyCard, LockIcon } from "@/features/property/PropertyCard";
import { IntegrationTrustStrip } from "@/features/home/IntegrationTrustStrip";
import { HomeHero } from "@/features/home/HomeHero";
import { HomeMapTeaser } from "@/features/home/HomeMapTeaser";
import { Button } from "@/shared/ui/Button";
import { CardSkeletonGrid } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import type { ListingType } from "@/shared/types";

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
  const [mode, setMode] = useState<ListingType>("buy");
  const { favIds, onToggleFavorite } = useFavorites();

  const featured = useApi(getFeatured);
  const offmarket = useApi(getOffMarket);
  const featuredList = featured.data ?? [];

  return (
    <>
      <HomeHero mode={mode} onModeChange={setMode} />

      {/* ---- Featured & Top placements ---- */}
      <section className="mx-auto max-w-shell px-4 py-20 sm:px-6">
        <SectionHeader overline={t("home.featuredOverline")} title={t("home.featuredTitle")} href={to("/properties")} />
        {featured.loading ? (
          <CardSkeletonGrid count={12} />
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

      {/* ---- Browse by category — Sreality entry points ---- */}
      <section aria-label={t("home.categoryAria")} className="mx-auto max-w-shell px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CATEGORY_INDEX.map((c) => {
            const Icon = CATEGORY_ICONS[c.label] ?? Buildings;
            return (
              <Link
                key={c.label}
                to={to(c.href ?? `/properties?kind=${encodeURIComponent(c.kind ?? "")}`)}
                className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-elevation-sm transition-[border-color,transform] hover:border-action active:scale-[0.96]"
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

      <HomeMapTeaser />

      {/* ---- Off-Market teaser ---- */}
      <section className="bg-navy">
        <div className="mx-auto grid max-w-shell items-center gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2">
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

      <IntegrationTrustStrip />

      {/* ---- Single agents / B2B CTA (collapsed from dual AI + B2B band) ---- */}
      <section className="mx-auto max-w-shell px-4 py-20 sm:px-6">
        <div className="flex flex-col rounded-2xl bg-navy p-7 text-white sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:p-8">
          <div className="max-w-xl">
            <p className="t-overline mb-2 flex items-center gap-1.5 text-champagne-100/80">
              <Buildings weight="duotone" className="size-4.5" aria-hidden /> {t("home.b2bOverline")}
            </p>
            <h2 className="mb-2 font-display text-xl font-extrabold sm:text-2xl">
              {t("home.b2bTitle")}
            </h2>
            <p className="text-pretty text-sm text-slate-400">{t("home.b2bSub")}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-0 sm:shrink-0">
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
      </section>
    </>
  );
}
