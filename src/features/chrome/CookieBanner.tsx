import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Button } from "@/shared/ui/Button";

const LS_KEY = "r24.cookieChoice";
const REOPEN_EVENT = "r24:cookie-settings";

/** Reopens the consent dialog (with the per-category panel expanded) from
    anywhere a "Cookie settings" link lives — footer, agent panel, account. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

interface CookiePrefs {
  analytics: boolean;
  marketing: boolean;
}

/* EDPB-compliant: Accept / Reject equally prominent, no pre-ticked options,
   and "Manage preferences" opens real per-category toggles (not consent theater). */
export function CookieBanner() {
  const { t, to } = useI18n();
  const [choice, setChoice] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  });
  const [manage, setManage] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs>({ analytics: false, marketing: false });

  useEffect(() => {
    const onOpen = () => { setChoice(null); setManage(true); };
    window.addEventListener(REOPEN_EVENT, onOpen);
    return () => window.removeEventListener(REOPEN_EVENT, onOpen);
  }, []);

  if (choice) return null;

  const decide = (v: string) => {
    try { localStorage.setItem(LS_KEY, v); } catch { /* ignore */ }
    setChoice(v);
  };

  const categories: { key: keyof CookiePrefs | "essential"; label: string; desc: string }[] = [
    { key: "essential", label: t("cookie.essential"), desc: t("cookie.essentialDesc") },
    { key: "analytics", label: t("cookie.analytics"), desc: t("cookie.analyticsDesc") },
    { key: "marketing", label: t("cookie.marketing"), desc: t("cookie.marketingDesc") },
  ];

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-110 border-t border-slate-300 bg-white p-3 shadow-elevation-lg max-lg:bottom-[var(--r24-agent-tab-h,0px)] sm:p-4"
    >
      <div className="mx-auto max-w-shell">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-slate-800">
            {t("cookie.text")}{" "}
            <Link to={to("/legal/cookies")} className="font-semibold text-blue-700 underline">{t("cookie.policy")}</Link>
          </p>
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap">
            <Button size="md" className="w-full sm:w-auto" onClick={() => decide("all")}>{t("cookie.acceptAll")}</Button>
            <Button size="md" variant="secondary" className="w-full sm:w-auto" onClick={() => decide("essential")}>{t("cookie.reject")}</Button>
            <Button size="md" variant="ghost" className="w-full sm:w-auto" aria-expanded={manage} onClick={() => setManage((v) => !v)}>
              {t("cookie.manage")}
            </Button>
          </div>
        </div>

        {manage && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <ul className="mb-4 grid gap-3 sm:grid-cols-3">
              {categories.map((c) => {
                const essential = c.key === "essential";
                const checked = essential ? true : prefs[c.key as keyof CookiePrefs];
                return (
                  <li key={c.key} className="rounded-lg border border-slate-300 p-3.5">
                    <label className={`flex items-start gap-2.5 ${essential ? "" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={essential}
                        onChange={(e) =>
                          setPrefs((p) => ({ ...p, [c.key]: e.target.checked }))
                        }
                        className="mt-0.5 size-5 shrink-0 accent-action"
                      />
                      <span>
                        <span className="block text-sm font-bold">
                          {c.label}{essential && <span className="ml-1.5 text-xs font-semibold text-muted">({t("cookie.alwaysOn")})</span>}
                        </span>
                        <span className="block text-xs text-muted">{c.desc}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Button size="md" variant="secondary" onClick={() => decide(JSON.stringify(prefs))}>
              {t("cookie.savePrefs")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
