import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Header } from "@/features/chrome/Header";
import { Footer } from "@/features/chrome/Footer";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";

/* Private User dashboard shell (§3.4.4). Agents are redirected to their panel. */
export function AccountLayout() {
  const { user, isAgent } = useAuth();
  const { t, to } = useI18n();
  const location = useLocation();

  if (!user) {
    return <Navigate to={to("/login")} state={{ from: location.pathname + location.search }} replace />;
  }
  if (isAgent) return <Navigate to={to("/agent")} replace />;

  const items = [
    { href: to("/account"), label: t("account.overview"), end: true },
    { href: to("/account/favorites"), label: t("account.favorites") },
    { href: to("/account/searches"), label: t("account.searches") },
    { href: to("/account/listings"), label: t("account.listings") },
    { href: to("/account/profile"), label: t("account.profile") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-shell flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-8">
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto scrollbar-thin lg:w-52 lg:flex-col lg:overflow-visible">
          {items.map((i) => (
            <NavLink
              key={i.href}
              to={i.href}
              end={i.end}
              className={({ isActive }) =>
                `flex min-h-11 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors ${
                  isActive ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-200"
                }`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
