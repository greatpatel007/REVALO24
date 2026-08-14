import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ChartBar, CreditCard, DotsThreeCircle, DownloadSimple, EnvelopeSimple, HouseLine, SealCheck, ShieldCheck,
  SignOut, Sparkle, Star, UserCircle,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Logo } from "@/features/chrome/Header";
import { LanguageSelector } from "@/features/chrome/LanguageSelector";
import { CookieBanner, openCookieSettings } from "@/features/chrome/CookieBanner";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { ActionSheet } from "@/shared/ui/ActionSheet";
import { BottomTabBar, BOTTOM_TAB_PAD } from "@/shared/ui/BottomTabBar";
import type { AgentProfile } from "@/shared/types";

/**
 * Agent Panel shell (§3.4.3) —
 * Desktop (lg+): sidebar + slim top bar.
 * Mobile: compact top + bottom tabs (Home / Listings / Inquiries / More) —
 * not a horizontally scrolled desktop rail.
 */
export function AgentLayout() {
  const { user, isAgent, logout } = useAuth();
  const { t, to } = useI18n();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!user) {
    return <Navigate to={to("/login")} state={{ from: location.pathname + location.search }} replace />;
  }
  if (!isAgent) return <Navigate to={to("/account")} replace />;
  const agent = user as AgentProfile;

  const ic = "size-4.5 shrink-0";
  const tabIc = "size-5 shrink-0";

  const sidebarItems = [
    { href: to("/agent"), label: t("agent.nav.dashboard"), icon: <ChartBar className={ic} aria-hidden />, end: true },
    { href: to("/agent/listings"), label: t("agent.nav.listings"), icon: <HouseLine className={ic} aria-hidden /> },
    { href: to("/agent/inquiries"), label: t("agent.nav.inquiries"), icon: <EnvelopeSimple className={ic} aria-hidden /> },
    { href: to("/agent/ai"), label: t("agent.nav.ai"), icon: <Sparkle className={ic} aria-hidden /> },
    { href: to("/agent/import"), label: t("agent.nav.import"), icon: <DownloadSimple className={ic} aria-hidden /> },
    { href: to("/agent/placements"), label: t("agent.nav.placements"), icon: <Star className={ic} aria-hidden /> },
    { href: to("/agent/subscription"), label: t("agent.nav.subscription"), icon: <CreditCard className={ic} aria-hidden /> },
    { href: to("/agent/profile"), label: t("agent.nav.profile"), icon: <ShieldCheck className={ic} aria-hidden /> },
  ];

  const moreHrefs = [
    to("/agent/ai"),
    to("/agent/import"),
    to("/agent/placements"),
    to("/agent/subscription"),
    to("/agent/profile"),
  ];
  const moreActive = moreHrefs.some((h) => location.pathname === h || location.pathname.startsWith(`${h}/`));

  /* Hide bottom tabs on listing editor so sticky CTAs aren't covered. */
  const hideBottomTabs = /\/agent\/listings\/(new|\d+)/.test(location.pathname);

  const verificationChip = agent.verificationState === "approved" ? (
    <Badge tone="action"><SealCheck weight="fill" className="size-3.5 shrink-0" aria-hidden /> {t("agent.verifiedBadge")}</Badge>
  ) : (
    <StatusBadge status={agent.verificationState} />
  );

  const moreLinks = [
    { href: to("/agent/ai"), label: t("agent.nav.ai"), icon: <Sparkle className={ic} aria-hidden /> },
    { href: to("/agent/import"), label: t("agent.nav.import"), icon: <DownloadSimple className={ic} aria-hidden /> },
    { href: to("/agent/placements"), label: t("agent.nav.placements"), icon: <Star className={ic} aria-hidden /> },
    { href: to("/agent/subscription"), label: t("agent.nav.subscription"), icon: <CreditCard className={ic} aria-hidden /> },
    { href: to("/agent/profile"), label: t("agent.nav.profile"), icon: <ShieldCheck className={ic} aria-hidden /> },
  ];

  return (
    <div
      className="flex min-h-screen flex-col lg:h-dvh lg:flex-row lg:overflow-hidden"
      style={
        hideBottomTabs
          ? undefined
          : ({ ["--r24-agent-tab-h" as string]: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" } as CSSProperties)
      }
    >
      {/* Desktop sidebar only — mobile uses top bar + bottom tabs */}
      <aside className="hidden shrink-0 flex-col border-r border-slate-300 bg-white lg:flex lg:w-64 lg:overflow-y-auto">
        <div className="flex h-16 items-center px-4">
          <Link to={to("/")} aria-label="REVALO24 home" className="inline-flex items-center"><Logo /></Link>
        </div>
        <nav aria-label={t("agent.nav.dashboard")} className="flex flex-col gap-1 px-3 pt-2">
          {sidebarItems.map((i) => (
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
        <div className="mt-auto border-t border-slate-300 p-4">
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
          <LegalLinks className="mt-3 border-t border-slate-200 pt-3" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-300 bg-white px-3 lg:hidden">
          <Link to={to("/")} aria-label="REVALO24 home" className="inline-flex items-center"><Logo compact /></Link>
          <span className="flex items-center gap-1">
            <LanguageSelector />
            <MobileAccountMenu agent={agent} chip={verificationChip} onLogout={() => void logout()} />
          </span>
        </header>

        {/* Desktop top bar */}
        <header className="hidden h-14 shrink-0 items-center justify-end gap-3 border-b border-slate-300 bg-white px-6 lg:flex">
          {verificationChip}
          <LanguageSelector />
        </header>

        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-canvas p-4 sm:p-6 lg:p-8 ${
            hideBottomTabs ? "" : BOTTOM_TAB_PAD
          }`}
        >
          <Outlet />
        </main>
      </div>

      {!hideBottomTabs && (
        <BottomTabBar
          ariaLabel={t("agent.nav.panelAria")}
          items={[
            {
              href: to("/agent"),
              label: t("agent.nav.tabDashboard"),
              icon: <ChartBar className={tabIc} weight="duotone" aria-hidden />,
              end: true,
            },
            {
              href: to("/agent/listings"),
              label: t("agent.nav.tabListings"),
              icon: <HouseLine className={tabIc} weight="duotone" aria-hidden />,
            },
            {
              href: to("/agent/inquiries"),
              label: t("agent.nav.tabInquiries"),
              icon: <EnvelopeSimple className={tabIc} weight="duotone" aria-hidden />,
            },
            {
              href: "#more",
              label: t("agent.nav.more"),
              icon: <DotsThreeCircle className={tabIc} weight="duotone" aria-hidden />,
              onPress: () => setMoreOpen(true),
              forceActive: moreActive,
            },
          ]}
        />
      )}

      <ActionSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t("agent.nav.moreTitle")}
        heading={t("agent.nav.moreTitle")}
      >
        <ul className="flex flex-col gap-0.5">
          {moreLinks.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${
                    isActive ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-100"
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </ActionSheet>

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

function MobileAccountMenu({ agent, chip, onLogout }: { agent: AgentProfile; chip: ReactNode; onLogout: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("agent.accountMenu")}
        onClick={() => setOpen(true)}
        className="flex min-h-11 cursor-pointer items-center rounded-lg px-2.5 text-slate-800 hover:bg-slate-200"
      >
        <UserCircle className="size-6" aria-hidden />
      </button>
      <ActionSheet open={open} onClose={() => setOpen(false)} title={t("agent.accountMenu")}>
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{agent.name || agent.email}</p>
            <p className="truncate text-xs text-muted">{agent.companyName || agent.email}</p>
          </div>
          {chip}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-slate-800 hover:bg-slate-200"
        >
          <SignOut className="size-4.5" aria-hidden /> {t("nav.logout")}
        </button>
        <LegalLinks className="mt-3 border-t border-slate-200 px-3 pt-3" />
      </ActionSheet>
    </>
  );
}
