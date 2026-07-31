import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Locale } from "@/shared/types";
import { DEFAULT_LOCALE, DICTIONARIES, LOCALES } from "./dictionaries";

interface I18n {
  locale: Locale;
  /** Translate a key; optional vars fill {placeholders}: t("detail.showAllPhotos", { n: 8 }) */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Prefix an app path with the active locale: to("/properties") → "/de/properties" */
  to: (path: string) => string;
  switchLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18n | null>(null);

export function isLocale(v: string | undefined): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

/** Mounted under the /:locale route — locale-prefixed URLs per proposal §3.5.2. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locale: Locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;

  const value = useMemo<I18n>(() => {
    const dict = DICTIONARIES[locale];
    const fallback = DICTIONARIES[DEFAULT_LOCALE];
    return {
      locale,
      t: (key, vars) => {
        const raw = dict[key] ?? fallback[key] ?? key;
        if (!vars) return raw;
        return raw.replace(/\{(\w+)\}/g, (m, name: string) => (vars[name] !== undefined ? String(vars[name]) : m));
      },
      to: (path) => `/${locale}${path.startsWith("/") ? path : `/${path}`}`,
      switchLocale: (next) => {
        const rest = location.pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
        navigate(`/${next}${rest || "/"}${location.search}`, { replace: false });
        document.documentElement.lang = next;
      },
    };
  }, [locale, location.pathname, location.search, navigate]);

  document.documentElement.lang = locale;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
