import { CaretDown } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { searchProperties } from "@/features/property/api";
import { useFavorites } from "@/features/account/useFavorites";
import { PropertyCard } from "@/features/property/PropertyCard";
import { FilterBar, SORT_OPTIONS, ViewSwitch, useSearchFilters } from "@/features/search/FilterBar";
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

      {/* ---- Results ---- */}
      <div className="mx-auto max-w-shell px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold sm:text-2xl">
              {filters.q ? t("search.titleIn", { q: filters.q }) : t("search.titleAll")}
            </h1>
            <p aria-live="polite" className="text-sm text-muted">
              {result.data ? `${result.data.meta.total} ${t("search.results")}` : t("common.loading")}
            </p>
          </div>
          {/* List | Map + Sort — matched h-10 controls, tight cluster */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ViewSwitch view="list" />
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 sm:gap-2">
              <span className="hidden sm:inline">{t("search.sort")}</span>
              <span className="relative">
                <select
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value === "new" ? undefined : e.target.value })}
                  aria-label={t("search.sort")}
                  className="h-10 cursor-pointer appearance-none rounded-lg border border-border-strong bg-white pl-3 pr-8 text-sm sm:pr-9"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                </select>
                <CaretDown weight="bold" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-600 sm:right-3" aria-hidden />
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
