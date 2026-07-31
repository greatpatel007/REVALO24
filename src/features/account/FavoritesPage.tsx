import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getFavoriteIds, getFavorites, toggleFavorite } from "@/features/account/api";
import { PropertyCard } from "@/features/property/PropertyCard";
import { CardSkeletonGrid } from "@/shared/ui/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState";

export function FavoritesPage() {
  const { t, to } = useI18n();
  const { data, loading, reload } = useApi(getFavorites);
  const [favIds, setFavIds] = useState<number[]>(getFavoriteIds);

  const onToggle = (id: number) =>
    void toggleFavorite(id).then((ids) => { setFavIds(ids); reload(); });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("account.favorites")}</h1>
      <p className="mb-6 text-sm text-muted">{t("account.fav.sub")}</p>
      {loading ? (
        <CardSkeletonGrid count={3} />
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.map((p) => (
            <PropertyCard key={p.id} property={p} favorite={favIds.includes(p.id)} onToggleFavorite={onToggle} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Heart className="size-9" aria-hidden />} title={t("account.fav.emptyTitle")}>
          {t("account.fav.emptyBody")} <Link to={to("/properties")} className="font-semibold text-blue-700 underline">{t("account.fav.browse")}</Link>
        </EmptyState>
      )}
    </div>
  );
}
