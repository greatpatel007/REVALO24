import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { searchProperties } from "@/features/property/api";
import { fmtPrice, locationLabel } from "@/shared/lib/format";
import { useFavorites } from "@/features/account/useFavorites";
import { OffMarketCover, PropertyCard } from "@/features/property/PropertyCard";
import { FilterBar, FloatingViewSwitch, useSearchFilters } from "@/features/search/FilterBar";
import { Button } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/ErrorState";
import { MapCanvas } from "./MapCanvas";

/* Map view of the same search: URL-driven filters shared with /properties,
   so switching List ↔ Map never loses state. Desktop shows a split view
   (map + card panel); on mobile the floating pill returns to the list view. */
export function MapPage() {
  const { t, to, locale } = useI18n();
  const { params, filters } = useSearchFilters();
  const { favIds, onToggleFavorite } = useFavorites();
  const [active, setActive] = useState<number | null>(null);

  /* Map shows the full result set (no pagination) */
  const result = useApi(
    () => searchProperties({ ...filters, page: 1, perPage: 100 }),
    [params.toString()],
  );
  const rows = useMemo(() => result.data?.data ?? [], [result.data]);
  const activeProp = rows.find((p) => p.id === active) ?? null;

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col">
      <FilterBar total={rows.length} />

      {/* ---- Split: map + card panel ---- */}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative flex-1">
          <MapCanvas
            properties={rows}
            activeId={active}
            onMarkerClick={(id) => setActive(id === active ? null : id)}
            radiusKm={filters.radiusKm ?? 0}
          >
            <p aria-live="polite" className="absolute left-3 top-3 z-20 rounded-lg bg-white/95 px-3.5 py-2 text-xs font-bold text-navy shadow-elevation-sm">
              {result.loading ? t("common.loading") : `${rows.length} ${t("search.results")}${filters.q ? ` · “${filters.q}”` : ""}`}
            </p>

            {/* Empty state over the map — clear escape hatch instead of a bare canvas */}
            {!result.loading && !result.error && rows.length === 0 && (
              <div className="absolute left-1/2 top-1/2 z-20 w-[min(92%,360px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-300 bg-white p-5 text-center shadow-elevation-lg">
                <p className="font-bold">{t("search.noResults")}</p>
                <p className="mt-1 text-sm text-muted">{t("search.mapEmpty")}</p>
                <Link to={to("/map")} className="mt-3 inline-block">
                  <Button size="sm" variant="secondary">{t("search.clearAll")}</Button>
                </Link>
              </div>
            )}
            {result.error && (
              <div className="absolute left-1/2 top-1/2 z-20 w-[min(92%,400px)] -translate-x-1/2 -translate-y-1/2">
                <ErrorState message={t("search.errorMap")} onRetry={result.reload} />
              </div>
            )}
            {activeProp && (
              <div className="absolute bottom-4 left-1/2 z-40 w-[min(92%,380px)] -translate-x-1/2 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-elevation-lg">
                <div className="flex gap-3 p-3">
                  {activeProp.offMarket ? (
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg"><OffMarketCover image={activeProp.media.images[0]} /></div>
                  ) : (
                    <img src={activeProp.media.images[0]} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold tabular">{activeProp.offMarket ? t("card.priceOnRequest") : fmtPrice(activeProp, locale)}</p>
                    <p className="truncate text-sm font-semibold" title={activeProp.title}>{activeProp.title}</p>
                    <p className="truncate text-xs text-muted" title={locationLabel(activeProp)}>{locationLabel(activeProp)}</p>
                    <Link
                      to={to(`/property/${activeProp.id}`)}
                      className="mt-1 inline-block text-xs font-bold text-blue-700 hover:underline"
                    >
                      {activeProp.offMarket ? t("map.unlock") : t("map.viewDetails")}
                    </Link>
                  </div>
                  <button type="button" aria-label={t("common.close")} onClick={() => setActive(null)}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-slate-200">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </MapCanvas>
        </div>

        {/* Card panel (desktop) — hovering a card highlights its marker */}
        <aside
          aria-label="Results"
          className="hidden w-[420px] overflow-y-auto border-l border-slate-300 bg-canvas scrollbar-thin lg:block xl:w-[620px]"
        >
          <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-2">
            {rows.map((p) => (
              <div
                key={p.id}
                onMouseEnter={() => setActive(p.id)}
                className={`rounded-xl transition-shadow ${p.id === active ? "ring-2 ring-action" : ""}`}
              >
                <PropertyCard property={p} favorite={favIds.includes(p.id)} onToggleFavorite={onToggleFavorite} />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Bottom-center List | Map switch (hidden while a marker popover is open) */}
      {!activeProp && <FloatingViewSwitch view="map" />}
    </div>
  );
}
