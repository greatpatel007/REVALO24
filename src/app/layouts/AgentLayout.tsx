import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChartBar, CreditCard, DownloadSimple, EnvelopeSimple, HouseLine, SealCheck, ShieldCheck,
  SignOut, Sparkle, Star, UserCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Logo } from "@/features/chrome/Header";
import { LanguageSelector } from "@/features/chrome/LanguageSelector";
import { CookieBanner, openCookieSettings } from "@/features/chrome/CookieBanner";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import type { AgentProfile } from "@/shared/types";

/* Agent Panel shell (§3.4.3) — sidebar on desktop, scrollable tab rail on
   mobile. Desktop gets a slim top bar (verification chip + language picker,
   dropdown opens safely downward); logout stays in the sidebar footer.
   Mobile keeps the globe bottom-sheet and gains an account menu holding
   logout + the legal links. */
export function AgentLayout() {
  const { user, isAgent, logout } = useAuth();
  const { t, to } = useI18n();
  const location = useLocation();
  const railRef = useRef<HTMLElement>(null);

  /* Keep the active tab visible in the mobile rail (8 items, ~3 visible) */
  useEffect(() => {
    railRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [location.pathname]);

  if (!user) {
    return <Navigate to={to("/login")} state={{ from: location.pathname + location.search }} replace />;
  }
  if (!isAgent) return <Navigate to={to("/account")} replace />;
  const agent = user as AgentProfile;

  const ic = "size-4.5 shrink-0";
  const items = [
    { href: to("/agent"), label: t("agent.nav.dashboard"), icon: <ChartBar className={ic} aria-hidden />, end: true },
    { href: to("/agent/listings"), label: t("agent.nav.listings"), icon: <HouseLine className={ic} aria-hidden /> },
    { href: to("/agent/inquiries"), label: t("agent.nav.inquiries"), icon: <EnvelopeSimple className={ic} aria-hidden /> },
    { href: to("/agent/ai"), label: t("agent.nav.ai"), icon: <Sparkle className={ic} aria-hidden /> },
    { href: to("/agent/import"), label: t("agent.nav.import"), icon: <DownloadSimple className={ic} aria-hidden /> },
    { href: to("/agent/placements"), label: t("agent.nav.placements"), icon: <Star className={ic} aria-hidden /> },
    { href: to("/agent/subscription"), label: t("agent.nav.subscription"), icon: <CreditCard className={ic} aria-hidden /> },
    { href: to("/agent/profile"), label: t("agent.nav.profile"), icon: <ShieldCheck className={ic} aria-hidden /> },
  ];

  const verificationChip = agent.verificationState === "approved" ? (
    <Badge tone="action"><SealCheck weight="fill" className="size-3.5 shrink-0" aria-hidden /> {t("agent.verifiedBadge")}</Badge>
  ) : (
    <StatusBadge status={agent.verificationState} />
  );

  /* lg:h-dvh locks the shell to the viewport so pages can fill remaining height */
  return (
    <div className="flex min-h-screen flex-col lg:h-dvh lg:overflow-hidden lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-slate-300 bg-white lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Link to={to("/")} aria-label="REVALO24 home"><Logo /></Link>
          {/* Mobile top bar: globe bottom-sheet + account menu (logout, legal) */}
          <span className="flex items-center gap-1 lg:hidden">
            <LanguageSelector />
            <MobileAccountMenu agent={agent} chip={verificationChip} onLogout={() => void logout()} />
          </span>
        </div>
        <div className="relative">
          <nav ref={railRef} aria-label="Agent panel" className="flex gap-1 overflow-x-auto px-3 pb-3 scrollbar-thin lg:flex-col lg:overflow-visible lg:pt-2">
            {items.map((i) => (
              <NavLink
                key={i.href}
                to={i.href}
                end={i.end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-200"
                  }`
                }
              >
                {i.icon} {i.label}
              </NavLink>
            ))}
          </nav>
          {/* Scroll affordance — the mobile tab rail holds 8 items but shows ~3 */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent lg:hidden" />
        </div>
        <div className="mt-auto hidden border-t border-slate-300 p-4 lg:block">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{agent.name || agent.email}</p>
              <p className="truncate text-xs text-muted">{agent.companyName || "—"}</p>
            </div>
            <button type="button" onClick={() => void logout()}
              className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-slate-200 hover:text-navy">
              <SignOut className="size-4" aria-hidden /> {t("nav.logout")}
            </button>
          </div>
          {/* Legal chrome (§5 DE compliance): always reachable from the panel */}
          <LegalLinks className="mt-3 border-t border-slate-200 pt-3" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Desktop top bar — the language dropdown now opens downward into the
            viewport instead of out of it from the sidebar footer */}
        <header className="hidden h-14 shrink-0 items-center justify-end gap-3 border-b border-slate-300 bg-white px-6 lg:flex">
          {verificationChip}
          <LanguageSelector />
        </header>
        {/* overflow-y-auto: tall pages (Subscription) scroll here; fill-height
            pages (Inquiries) still flex to the viewport via min-h-0 + flex-1 */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Cookie consent must be reachable inside the panel too (GDPR) */}
      <CookieBanner />
    </div>
  );
}

function LegalLinks({ className = "" }: { className?: string }) {
  const { t, to } = useI18n();
  const link = "cursor-pointer text-xs text-muted hover:text-navy hover:underline";
  return (
    <p className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      <Link className={link} to={to("/legal/imprint")}>{t("footer.legal.imprint")}</Link>
      <Link className={link} to={to("/legal/privacy")}>{t("footer.legal.privacy")}</Link>
      <Link className={link} to={to("/legal/terms")}>{t("footer.legal.terms")}</Link>
      <button type="button" className={link} onClick={openCookieSettings}>{t("footer.legal.cookieSettings")}</button>
    </p>
  );
}

/* Mobile account menu — bottom sheet (same thumb-friendly pattern as the
   language selector) holding identity, logout and the legal links. */
function MobileAccountMenu({ agent, chip, onLogout }: { agent: AgentProfile; chip: React.ReactNode; onLogout: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("agent.accountMenu")}
        onClick={() => setOpen(true)}
        className="flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 text-slate-800 hover:bg-slate-200"
      >
        <UserCircle className="size-6" aria-hidden />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[95] flex items-end bg-navy/50" onClick={() => setOpen(false)}>
          <div role="menu" className="w-full rounded-t-2xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-400" aria-hidden />
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{agent.name || agent.email}</p>
                <p className="truncate text-xs text-muted">{agent.companyName || agent.email}</p>
              </div>
              {chip}
            </div>
            <button type="button" onClick={onLogout}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-slate-800 hover:bg-slate-200">
              <SignOut className="size-4.5" aria-hidden /> {t("nav.logout")}
            </button>
            <LegalLinks className="mt-3 border-t border-slate-200 px-3 pt-3" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
