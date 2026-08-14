import { Link, useLocation } from "react-router-dom";
import { m } from "motion/react";
import { Bathtub, Door, Heart, LockKey, MapPin, Ruler } from "@phosphor-icons/react";
import type { Property } from "@/shared/types";
import { fmtPrice, locationLabel } from "@/shared/lib/format";
import { listingImageSrc, listingImageSrcSet, LISTING_THUMB_SIZES } from "@/shared/lib/images";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Badge } from "@/shared/ui/Badge";
import { EnergyClassBadge } from "@/features/property/EnergyClass";
import { easeOut, inViewOnce, revealInView } from "@/shared/motion/presets";

/** Key facts with Phosphor icons for at-a-glance scanning: area · rooms · baths.
    Three facts only (EU-portal convention — rooms, not beds, is the headline
    figure); the full fact set lives in the exposé Key facts grid. */
export function PropertyFacts({ property: p, size = "md" }: { property: Property; size?: "md" | "sm" }) {
  const { t } = useI18n();
  const facts = [
    { icon: Ruler, value: `${p.livingArea}\u00A0m²`, label: t("card.livingArea") },
    { icon: Door, value: String(p.rooms), label: t("card.rooms") },
    { icon: Bathtub, value: String(p.bathrooms), label: t("card.bathrooms") },
  ];
  return (
    <ul className={`flex flex-wrap items-center ${size === "sm" ? "gap-x-3 gap-y-0.5 text-xs" : "gap-x-4 gap-y-1 text-sm"}`}>
      {facts.map((f) => (
        <li key={f.label} className="flex items-center gap-1 text-slate-700" title={`${f.value} ${f.label}`}>
          <f.icon weight="duotone" className={`shrink-0 text-blue-600 ${size === "sm" ? "size-4" : "size-4.5"}`} aria-hidden />
          <span className="font-semibold tabular">{f.value}</span>
          <span className="sr-only">{f.label}</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  property: Property;
  favorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  compact?: boolean;
  /** Off-market cards trigger this (e.g. open the unlock dialog) instead of
      navigating — avoids the self-loop on the Off-Market hub itself. */
  onOffMarketClick?: () => void;
}

/** Off-Market imagery: photo stays visible but blurred, lock badge on top (DS: Duotone champagne). */
export function OffMarketCover({ image, className = "" }: { image?: string; className?: string }) {
  const srcSet = image ? listingImageSrcSet(image) : undefined;
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-navy ${className}`}>
      {image && (
        <img
          src={listingImageSrc(image, 640)}
          srcSet={srcSet}
          sizes={srcSet ? LISTING_THUMB_SIZES : undefined}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-full w-full scale-110 object-cover blur-[6px] brightness-[0.55]"
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-champagne-100">
        <span className="flex size-11 items-center justify-center rounded-full bg-navy/70 backdrop-blur-sm">
          <LockIcon className="size-6" />
        </span>
        <span className="t-overline text-[11px] drop-shadow">Off-Market</span>
      </div>
    </div>
  );
}

export function PropertyCard({ property: p, favorite, onToggleFavorite, compact, onOffMarketClick }: Props) {
  const { t, to, locale } = useI18n();
  const location = useLocation();
  /* Off-market cards open the GATED detail view (spec 4B) — the unlock
     modal with code + sign-in paths lives there. */
  const href = to(`/property/${p.id}`);
  /* Lets the detail page render "Back to results" preserving the exact query */
  const backState = { back: location.pathname + location.search };
  const asAction = p.offMarket && onOffMarketClick;

  const media = (
    <>
      {p.offMarket ? (
        <OffMarketCover image={p.media.images[0]} />
      ) : (
        <img
          src={listingImageSrc(p.media.images[0], 640)}
          srcSet={listingImageSrcSet(p.media.images[0])}
          sizes={LISTING_THUMB_SIZES}
          alt={p.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover outline outline-1 outline-offset-[-1px] outline-black/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.03]"
        />
      )}
      <div className="absolute left-3 top-3 flex gap-1.5">
        {p.placement === "top" && <Badge tone="action">{t("card.top")}</Badge>}
        {p.placement === "featured" && <Badge tone="premium">{t("card.featured")}</Badge>}
        {p.isNewConstruction && <Badge tone="info">{t("card.newBuild")}</Badge>}
      </div>
    </>
  );
  const mediaClass = "relative block aspect-[8/5] w-full overflow-hidden bg-slate-300";

  return (
    <m.article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[box-shadow,border-color] duration-200 ease-out hover:border-slate-300 hover:shadow-elevation-sm"
      variants={revealInView}
      initial="hidden"
      whileInView="show"
      viewport={inViewOnce}
      whileHover={{ y: -3 }}
      transition={easeOut}
    >
      {asAction ? (
        <button type="button" onClick={onOffMarketClick} aria-label={t("card.unlockAria", { title: p.title })} className={`${mediaClass} cursor-pointer`}>
          {media}
        </button>
      ) : (
        <Link to={href} state={backState} className={mediaClass}>
          {media}
        </Link>
      )}

      {onToggleFavorite && !p.offMarket && (
        <button
          type="button"
          aria-label={favorite ? t("card.removeFav") : t("card.addFav")}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(p.id)}
          className="absolute right-3 top-3 flex size-10 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow-elevation-sm transition-colors hover:bg-white"
        >
          {/* Outline → fill crossfade (quieter than hover:scale-110). */}
          <span className="relative size-5" aria-hidden>
            <Heart
              weight="regular"
              className={`absolute inset-0 size-5 text-slate-700 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
                favorite ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
              }`}
            />
            <Heart
              weight="fill"
              className={`absolute inset-0 size-5 text-err-600 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
                favorite ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
              }`}
            />
          </span>
        </button>
      )}

      <div className={`flex flex-1 flex-col gap-1.5 ${compact ? "p-3.5" : "p-4"}`}>
        {/* EPBD Art. 12: the energy class must appear in property advertising —
            anchored to the right of the price row so it has a stable position
            on every card instead of trailing the facts icons. */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-extrabold tabular">
            {p.offMarket ? t("card.priceOnRequest") : fmtPrice(p, locale)}
          </p>
          {p.energyRating && !p.offMarket && <EnergyClassBadge rating={p.energyRating} size="sm" />}
        </div>
        {asAction ? (
          <button type="button" onClick={onOffMarketClick} className="cursor-pointer text-left font-semibold text-slate-900 hover:text-blue-700">
            {p.title}
          </button>
        ) : (
          <Link to={href} state={backState} className="font-semibold text-slate-900 hover:text-blue-700">
            {p.title}
          </Link>
        )}
        {!compact && <div className="pt-0.5"><PropertyFacts property={p} /></div>}
        <p className="mt-auto flex items-center gap-1 pt-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {locationLabel(p)}
        </p>
      </div>
    </m.article>
  );
}

/** Phosphor Duotone lock — champagne register for Off-Market (DS §06). */
export function LockIcon({ className = "size-6" }: { className?: string }) {
  return <LockKey weight="duotone" className={className} aria-hidden />;
}
