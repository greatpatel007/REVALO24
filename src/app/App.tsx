import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { I18nProvider, isLocale } from "@/shared/i18n/I18nContext";
import { DEFAULT_LOCALE } from "@/shared/i18n/dictionaries";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { AccountLayout } from "@/app/layouts/AccountLayout";
import { AgentLayout } from "@/app/layouts/AgentLayout";
import { Skeleton } from "@/shared/ui/Skeleton";

/* Landing-critical pages stay in the entry chunk for fast first paint. */
import { HomePage } from "@/features/home/HomePage";
import { SearchPage } from "@/features/search/SearchPage";

/* Everything else is route-level code-split (Lighthouse 85+ mobile mandate). */
const MapPage = lazy(() => import("@/features/search/MapPage").then((m) => ({ default: m.MapPage })));
const PropertyDetailPage = lazy(() => import("@/features/property/PropertyDetailPage").then((m) => ({ default: m.PropertyDetailPage })));
const OffMarketPage = lazy(() => import("@/features/off-market/OffMarketPage").then((m) => ({ default: m.OffMarketPage })));
const CmsStaticPage = lazy(() => import("@/features/cms/CmsPages").then((m) => ({ default: m.CmsStaticPage })));
const ContactPage = lazy(() => import("@/features/cms/CmsPages").then((m) => ({ default: m.ContactPage })));
const LegalPage = lazy(() => import("@/features/cms/CmsPages").then((m) => ({ default: m.LegalPage })));
const AgentsLandingPage = lazy(() => import("@/features/agent/AgentsLandingPage").then((m) => ({ default: m.AgentsLandingPage })));
const LoginPage = lazy(() => import("@/features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));

const AccountOverview = lazy(() => import("@/features/account/AccountOverview").then((m) => ({ default: m.AccountOverview })));
const FavoritesPage = lazy(() => import("@/features/account/FavoritesPage").then((m) => ({ default: m.FavoritesPage })));
const SavedSearchesPage = lazy(() => import("@/features/account/SavedSearchesPage").then((m) => ({ default: m.SavedSearchesPage })));
const MyListingsPage = lazy(() => import("@/features/account/MyListingsPage").then((m) => ({ default: m.MyListingsPage })));
const ProfilePage = lazy(() => import("@/features/account/ProfilePage").then((m) => ({ default: m.ProfilePage })));

const AgentDashboard = lazy(() => import("@/features/agent/AgentDashboard").then((m) => ({ default: m.AgentDashboard })));
const AgentListings = lazy(() => import("@/features/agent/AgentListings").then((m) => ({ default: m.AgentListings })));
const AgentInquiries = lazy(() => import("@/features/agent/AgentInquiries").then((m) => ({ default: m.AgentInquiries })));
const ListingEditor = lazy(() => import("@/features/agent/ListingEditor").then((m) => ({ default: m.ListingEditor })));
const AiOptimizer = lazy(() => import("@/features/agent/AiOptimizer").then((m) => ({ default: m.AiOptimizer })));
const CrmImport = lazy(() => import("@/features/agent/CrmImport").then((m) => ({ default: m.CrmImport })));
const SubscriptionPage = lazy(() => import("@/features/agent/SubscriptionPage").then((m) => ({ default: m.SubscriptionPage })));
const PlacementsPage = lazy(() => import("@/features/agent/PlacementsPage").then((m) => ({ default: m.PlacementsPage })));
const AgentProfilePage = lazy(() => import("@/features/agent/AgentProfilePage").then((m) => ({ default: m.AgentProfilePage })));

/* Hidden design-system reference — reachable only by typing /designsystem */
const DesignSystemPage = lazy(() => import("@/features/designsystem/DesignSystemPage").then((m) => ({ default: m.DesignSystemPage })));
const NotFoundPage = lazy(() => import("@/features/chrome/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

/* SPA route changes keep the old scroll position by default — reset it, but
   leave in-page hash/param-only changes (filters, tabs) untouched. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="mx-auto max-w-shell space-y-4 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function LocaleGate() {
  const { locale } = useParams();
  if (!isLocale(locale)) return <Navigate to={`/${DEFAULT_LOCALE}`} replace />;
  return (
    <I18nProvider>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="properties" element={<SearchPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="property/:id" element={<PropertyDetailPage />} />
            <Route path="off-market" element={<OffMarketPage />} />
            <Route path="about" element={<CmsStaticPage page="about" />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="legal/:page" element={<LegalPage />} />
            <Route path="agents" element={<AgentsLandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            {/* 404 inside the public shell — honest, not a silent redirect */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountOverview />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="searches" element={<SavedSearchesPage />} />
            <Route path="listings" element={<MyListingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="agent" element={<AgentLayout />}>
            <Route index element={<AgentDashboard />} />
            <Route path="listings" element={<AgentListings />} />
            <Route path="listings/new" element={<ListingEditor />} />
            <Route path="listings/:id/edit" element={<ListingEditor />} />
            <Route path="inquiries" element={<AgentInquiries />} />
            <Route path="ai" element={<AiOptimizer />} />
            <Route path="import" element={<CrmImport />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="placements" element={<PlacementsPage />} />
            <Route path="profile" element={<AgentProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </I18nProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${DEFAULT_LOCALE}`} replace />} />
      {/* Unlinked design-system reference, locale-independent (type the URL) */}
      <Route
        path="/designsystem"
        element={
          /* Provider needed because kit demos (PropertyFacts etc.) call useI18n;
             without a :locale param it falls back to the default locale */
          <I18nProvider>
            <Suspense fallback={<PageFallback />}>
              <DesignSystemPage />
            </Suspense>
          </I18nProvider>
        }
      />
      <Route path="/:locale/*" element={<LocaleGate />} />
    </Routes>
  );
}
