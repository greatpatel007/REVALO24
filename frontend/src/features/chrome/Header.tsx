import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  Buildings, EnvelopeSimple, HouseLine, Info, Key, List, LockKey, MapTrifold,
  SignOut, UserCircle, X,
} from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { LanguageSelector } from "./LanguageSelector";
import { Badge } from "@/shared/ui/Badge";

/** `compact` drops the wordmark below sm (top-nav use only) — the hotspot test
    showed the full logo stealing first-view attention on every mobile page.
    Callers must keep an accessible name (aria-label) on the wrapping link. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-navy">
      <svg viewBox="0 0 40 40" className="size-8" aria-hidden>
        <rect x="1" y="1" width="38" height="38" rx="9" fill="#0F172A" />
        <path d="M20 9l9 6.5v9L20 31l-9-6.5v-9L20 9z" stroke="#2563EB" strokeWidth="2.2" fill="none" />
        <circle cx="20" cy="20" r="3.4" fill="#10B981" />
      </svg>
      <span aria-hidden={compact || undefined} className={compact ? "hidden sm:inline" : undefined}>
        REVALO<span className="text-blue-600">24</span>
      </span>
    </span>
  );
}

type NavItem = { href: string; label: string; icon: typeof HouseLine; active: boolean };

export function Header() {
  const { t, to } = useI18n();
  const { user, isAgent, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* Shadow appears once the page scrolls under the sticky bar */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Query-aware active states: Buy/Rent share /properties and differ only in
     ?type=…, so plain NavLink matching would light both up at once. */
  const params = new URLSearchParams(location.search);
  const onPath = (p: string) => location.pathname.endsWith(p) || location.pathname.includes(`${p}/`);
  const primary: NavItem[] = [
    { href: to("/properties?type=buy"), label: t("nav.buy"), icon: HouseLine, active: onPath("/properties") && params.get("type") !== "rent" },
    { href: to("/properties?type=rent"), label: t("nav.rent"), icon: Key, active: onPath("/properties") && params.get("type") === "rent" },
    { href: to("/map"), label: t("nav.map"), icon: MapTrifold, active: onPath("/map") },
    { href: to("/off-market"), label: t("nav.offmarket"), icon: LockKey, active: onPath("/off-market") },
  ];

  const navPill = (active: boolean) =>
    `flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors ${
      active ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-200"
    }`;

  const drawerLink = (active = false) =>
    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${
      active ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-200"
    }`;
  const drawerIcon = "size-5 shrink-0 text-blue-600";

  /* Drawer is portaled to <body>: the header's backdrop-blur creates a CSS
     containing block that would otherwise trap (and hide) fixed children. */
  const drawer = menuOpen
    ? createPortal(
        <div className="fixed inset-0 z-[95]" role="presentation">
          <div className="absolute inset-0 bg-navy/45" onClick={() => setMenuOpen(false)} />
          <nav
            aria-label={t("nav.menu")}
            className="absolute bottom-0 right-0 top-0 flex w-full max-w-xs flex-col gap-0.5 overflow-y-auto bg-white p-4 pt-5 shadow-elevation-lg"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <Logo />
              <button
                type="button"
                aria-label={t("nav.closeMenu")}
                onClick={() => setMenuOpen(false)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-slate-800 hover:bg-slate-200"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* Signed-in identity block (mobile parity with the desktop bar) */}
            {user && (
              <Link
                to={isAgent ? to("/agent") : to("/account")}
                className="mb-2 flex items-center gap-3 rounded-xl border border-slate-300 bg-canvas px-3.5 py-3 hover:border-border-strong sm:hidden"
              >
                <UserCircle weight="duotone" className="size-9 shrink-0 text-blue-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{user.name}</span>
                  <span className="block text-xs font-semibold text-blue-700">
                    {isAgent ? t("nav.agentPanel") : t("nav.account")} →
                  </span>
                </span>
              </Link>
            )}

            <div className="lg:hidden">
              {primary.map((n) => (
                <Link key={n.label} to={n.href} aria-current={n.active ? "page" : undefined} className={drawerLink(n.active)}>
                  <n.icon weight="duotone" className={drawerIcon} aria-hidden /> {n.label}
                </Link>
              ))}
              <hr className="my-2 border-slate-300" />
            </div>

            <p className="t-overline px-3 py-2 text-muted">{t("nav.professional")}</p>
            <Link to={to("/agents")} className={drawerLink(onPath("/agents"))}>
              <Buildings weight="duotone" className={drawerIcon} aria-hidden /> {t("nav.agents")}
            </Link>
            <span className="flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-muted">
              {t("nav.network")} <Badge tone="info">soon</Badge>
            </span>
            <Link to={to("/agents#plans")} className={drawerLink()}>
              <span aria-hidden className="w-5 shrink-0" /> {t("nav.plans")}
            </Link>

            <hr className="my-2 border-slate-300" />
            <p className="t-overline px-3 py-2 text-muted">{t("nav.company")}</p>
            <Link to={to("/about")} className={drawerLink(onPath("/about"))}>
              <Info weight="duotone" className={drawerIcon} aria-hidden /> {t("nav.about")}
            </Link>
            <Link to={to("/contact")} className={drawerLink(onPath("/contact"))}>
              <EnvelopeSimple weight="duotone" className={drawerIcon} aria-hidden /> {t("nav.contact")}
            </Link>

            <hr className="my-2 border-slate-300 sm:hidden" />
            <div className="flex flex-col gap-0.5 sm:hidden">
              {user ? (
                <button type="button" onClick={() => void logout()} className={`${drawerLink()} cursor-pointer text-left`}>
                  <SignOut className={drawerIcon} aria-hidden /> {t("nav.logout")}
                </button>
              ) : (
                <>
                  <Link to={to("/login")} className={drawerLink()}>
                    <UserCircle weight="duotone" className={drawerIcon} aria-hidden /> {t("nav.login")}
                  </Link>
                  <Link to={to("/register")} className="mt-1 flex min-h-11 items-center justify-center rounded-lg bg-action px-4 text-sm font-bold text-white hover:bg-action-hover">
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>

          </nav>
        </div>,
        document.body,
      )
    : null;

  return (
    <header
      className={`sticky top-0 z-80 border-b bg-white/95 backdrop-blur transition-shadow ${
        scrolled ? "border-transparent shadow-elevation-md" : "border-slate-300"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-shell items-center gap-3 px-4 sm:px-6">
        <Link to={to("/")} aria-label="REVALO24 home" className="shrink-0">
          <Logo compact />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 pl-3 lg:flex">
          {primary.map((n) => (
            <Link key={n.label} to={n.href} aria-current={n.active ? "page" : undefined} className={navPill(n.active)}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSelector />
          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                to={isAgent ? to("/agent") : to("/account")}
                className="flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              >
                <UserCircle weight="duotone" className="size-6 text-blue-600" aria-hidden />
                {isAgent ? t("nav.agentPanel") : t("nav.account")}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label={t("nav.logout")}
                className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-slate-200 hover:text-navy"
              >
                <SignOut className="size-4.5" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to={to("/login")} className="flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200">
                {t("nav.login")}
              </Link>
              <Link to={to("/register")} className="flex min-h-10 items-center rounded-lg bg-action px-5 text-sm font-bold text-white transition-colors hover:bg-action-hover">
                {t("nav.register")}
              </Link>
            </div>
          )}

          {/* Burger — all viewports; hosts the professional section */}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={t("nav.menu")}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-lg text-navy hover:bg-slate-200"
          >
            <List className="size-6" aria-hidden />
          </button>
        </div>
      </div>
      {drawer}
    </header>
  );
}
