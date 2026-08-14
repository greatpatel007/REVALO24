import { useEffect } from "react";
import { Link } from "react-router-dom";
import { m } from "motion/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { POPULAR_CITIES } from "@/features/property/api";
import {
  HERO_PHOTO,
  HERO_PHOTO_SIZES,
  HERO_PHOTO_SRCSET,
  INVENTORY_TOTAL,
} from "@/shared/mock/db";
import { fadeUp, staggerContainer } from "@/shared/motion/presets";
import { HeroOmnibox } from "@/features/home/HeroOmnibox";
import type { ListingType } from "@/shared/types";

type Props = {
  mode: ListingType;
  onModeChange: (m: ListingType) => void;
};

/**
 * Original Home hero — full-bleed photo, centered copy + omnibox.
 * Static grain/sheen for atmosphere; LCP-tuned responsive image + preload.
 */
export function HomeHero({ mode, onModeChange }: Props) {
  const { t, to, locale } = useI18n();

  /* Preload the LCP candidate while Home is mounted (SPA-friendly). */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = HERO_PHOTO;
    link.setAttribute("imagesrcset", HERO_PHOTO_SRCSET);
    link.setAttribute("imagesizes", HERO_PHOTO_SIZES);
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  return (
    <section className="relative flex min-h-[50vh] items-center justify-center overflow-hidden px-4 py-11 sm:py-12">
      {/* Crop biased below center: keeps the villa + pool in frame on wide viewports */}
      <img
        src={HERO_PHOTO}
        srcSet={HERO_PHOTO_SRCSET}
        sizes={HERO_PHOTO_SIZES}
        alt=""
        aria-hidden
        loading="eager"
        fetchPriority="high"
        decoding="sync"
        className="absolute inset-0 h-full w-full object-cover object-[center_62%] brightness-[1.1]"
      />
      {/* Soft even wash — no radial patch; type contrast from text-shadow */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/20 via-navy/15 to-navy/40" aria-hidden />
      {/* Soft daylight sheen (top-left) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_10%,rgba(255,255,255,0.14)_0%,transparent_55%)]"
        aria-hidden
      />
      {/* Static film grain — CSS only, no animation */}
      <div className="hero-grain absolute inset-0" aria-hidden />

      <m.div
        className="relative z-10 w-full max-w-2xl text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <m.p
          variants={fadeUp}
          className="t-overline mb-3 text-blue-50 [text-shadow:0_1px_8px_rgba(15,23,42,0.75)]"
        >
          {t("hero.overline")}
        </m.p>
        <m.h1
          variants={fadeUp}
          className="mb-3 font-display text-3xl font-extrabold leading-tight text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.85),0_6px_28px_rgba(15,23,42,0.55)] sm:text-5xl"
        >
          {t("hero.title")}
        </m.h1>
        <m.p
          variants={fadeUp}
          className="mx-auto mb-7 max-w-xl text-pretty text-base text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.8),0_4px_20px_rgba(15,23,42,0.5)] sm:text-lg"
        >
          {t("hero.sub")}
        </m.p>

        <m.div variants={fadeUp}>
          <HeroOmnibox mode={mode} onModeChange={onModeChange} />
        </m.div>

        <m.p
          variants={fadeUp}
          className="mt-4 text-sm font-semibold text-blue-50 [text-shadow:0_1px_8px_rgba(15,23,42,0.7)]"
        >
          {t("home.inventory", { count: INVENTORY_TOTAL.toLocaleString(locale) })}
        </m.p>

        <m.div variants={fadeUp} className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {POPULAR_CITIES.map((c, i) => (
            <Link
              key={c.city}
              to={to(`/properties?type=${mode}&q=${encodeURIComponent(c.city)}`)}
              className={`inline-flex min-h-11 items-center rounded-lg border border-white/35 bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur transition-[color,background-color,transform] hover:bg-white/25 active:scale-[0.96] ${i >= 3 ? "hidden sm:inline-flex" : ""}`}
            >
              {c.city} <span className="ml-1 text-blue-200">{c.count}</span>
            </Link>
          ))}
        </m.div>
      </m.div>
    </section>
  );
}
