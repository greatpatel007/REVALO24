import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useToast } from "@/shared/ui/Toast";
import { getFavoriteIds, toggleFavorite } from "./api";

/** Favorites require an account (free B2C registration) — guests who tap the
    heart get an explaining toast and are routed to login. `state.from` brings
    them back to this exact page (incl. filters) after signing in. */
export function useFavorites() {
  const { user } = useAuth();
  const { t, to } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [favIds, setFavIds] = useState<number[]>(() => (user ? getFavoriteIds() : []));

  const onToggleFavorite = (id: number) => {
    if (!user) {
      toast(t("fav.gate"), "info");
      navigate(to("/login"), { state: { from: location.pathname + location.search } });
      return;
    }
    void toggleFavorite(id).then(setFavIds);
  };

  return { favIds, onToggleFavorite };
}
