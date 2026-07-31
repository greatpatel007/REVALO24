import { CaretDown } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { searchProperties } from "@/features/property/api";
import { useFavorites } from "@/features/account/useFavorites";
import { PropertyCard } from "@/features/property/PropertyCard";
import { FilterBar, FloatingViewSwitch, SORT_OPTIONS, useSearchFilters } from "@/features/search/FilterBar";
import { CardSkeletonGrid } from "@/shared/ui/Skeleton";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Pagination } from "@/shared/ui/Pagination";

export function SearchPage() {
  const { t } = useI18n();
  const { params, filters, set, reset } = useSearchFilters();
  const { favIds, onToggleFavorite } = useFavorites();

  const result = useApi(() => searchProperties(filters), [params.toString()]);

  return (
    <>
      <FilterBar sticky total={result.data?.meta.total} />
      <FloatingViewSwitch view="list" />

      {/* ---- Results ---- */}
      <div className="mx-auto max-w-shell px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-extrabold sm:text-2xl">
              {filters.q ? t("search.titleIn", { q: filters.q }) : t("search.titleAll")}
            </h1>
            <p aria-live="polite" className="text-sm text-muted">
              {result.data ? `${result.data.meta.total} ${t("search.results")}` : t("common.loading")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* "Save search" lives in the FilterBar bell CTA (shared with map view) */}
            {/* Desktop-only — on mobile Sort lives in the floating List|Map|Sort control */}
            <label className="hidden items-center gap-2 text-sm font-semibold text-slate-800 sm:flex">
              {t("search.sort")}
              {/* appearance-none + own caret: the native arrow was bleeding over the text */}
              <span className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value === "new" ? undefined : e.target.value })}
                  className="min-h-11 cursor-pointer appearance-none rounded-lg border border-border-strong bg-white pl-3 pr-9 text-sm"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                </select>
                <CaretDown weight="bold" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" aria-hidden />
              </span>
            </label>
          </div>
        </div>

        {result.loading ? (
          <CardSkeletonGrid />
        ) : result.error ? (
          <ErrorState message={t("search.errorList")} onRetry={result.reload} />
        ) : result.data && result.data.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {result.data.data.map((p) => (
                <PropertyCard key={p.id} property={p} favorite={favIds.includes(p.id)} onToggleFavorite={onToggleFavorite} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination
                page={result.data.meta.current_page}
                lastPage={result.data.meta.last_page}
                onChange={(p) => set({ page: String(p) }, false)}
              />
            </div>
          </>
        ) : (
          <EmptyState title={t("search.noResults")}>
            <p>{t("search.noResultsHint")}</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={reset}>
              {t("search.clearAll")}
            </Button>
          </EmptyState>
        )}
      </div>
    </>
  );
}
