import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapTrifold } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { searchProperties } from "@/features/property/api";
import type { Property } from "@/shared/types";

const MapCanvas = lazy(() =>
  import("@/features/search/MapCanvas").then((m) => ({ default: m.MapCanvas })),
);

/**
 * Below-fold Home map teaser — Leaflet + OSM stay off the critical path until
 * the section is near the viewport *and* the main thread is idle (Lighthouse
 * was still pulling tiles during early Speed Index when we used a fat rootMargin).
 */
export function HomeMapTeaser() {
  const { t, to } = useI18n();
  const rootRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [idle, setIdle] = useState(false);
  const active = near && idle;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      /* Tight margin: only when the teaser is almost on screen. */
      { rootMargin: "48px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (idle) return;
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      const ric = window.requestIdleCallback?.bind(window);
      if (ric) {
        idleId = ric(() => {
          if (!cancelled) setIdle(true);
        }, { timeout: 3500 });
      } else {
        timeoutId = setTimeout(() => {
          if (!cancelled) setIdle(true);
        }, 2000);
      }
    };

    if (document.readyState === "complete") arm();
    else {
      window.addEventListener("load", arm, { once: true });
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      window.removeEventListener("load", arm);
    };
  }, [idle]);

  return (
    <section ref={rootRef} className="mx-auto max-w-shell px-4 py-20 sm:px-6">
      <Link
        to={to("/map")}
        className="group relative block h-[380px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-elevation-sm transition-shadow hover:shadow-elevation-md sm:h-[440px]"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {active ? <DeferredMap /> : <MapPlaceholder />}
        </div>
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
  );
}

/** Soft grid stand-in so the CTA block never sits on a blank void pre-Leaflet. */
function MapPlaceholder() {
  return (
    <div
      className="h-full w-full"
      style={{
        backgroundImage:
          "linear-gradient(135deg,#e2e8f0 0%,#cbd5e1 45%,#e2e8f0 100%),repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(148,163,184,0.35) 31px,rgba(148,163,184,0.35) 32px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(148,163,184,0.35) 31px,rgba(148,163,184,0.35) 32px)",
      }}
    />
  );
}

function DeferredMap() {
  /* Fewer pins than the full map page — teaser only. */
  const mapProps = useApi(() => searchProperties({ perPage: 24 }));
  const properties: Property[] = mapProps.data?.data ?? [];

  return (
    <Suspense fallback={<MapPlaceholder />}>
      <MapCanvas properties={properties} interactive={false} showAttribution={false} />
    </Suspense>
  );
}
