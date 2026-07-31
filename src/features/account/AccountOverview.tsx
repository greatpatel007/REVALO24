import { Link } from "react-router-dom";
import { BellRinging, EnvelopeSimple, Heart, HouseLine } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/lib/useApi";
import { getFavorites, getInquiries, getMyListings, getSavedSearches, PRIVATE_LISTING_LIMIT } from "@/features/account/api";
import { fmtDate } from "@/shared/lib/format";
import { StatusBadge } from "@/shared/ui/Badge";

export function AccountOverview() {
  const { user } = useAuth();
  const { t, to, locale } = useI18n();
  const favorites = useApi(getFavorites);
  const searches = useApi(getSavedSearches);
  const listings = useApi(getMyListings);
  const inquiries = useApi(getInquiries);

  const ic = "size-7";
  const cards = [
    { label: t("account.favorites"), value: favorites.data?.length, href: to("/account/favorites"), icon: <Heart weight="duotone" className={`${ic} text-err-600`} aria-hidden /> },
    { label: t("account.searches"), value: searches.data?.length, href: to("/account/searches"), icon: <BellRinging weight="duotone" className={`${ic} text-blue-600`} aria-hidden /> },
    { label: t("account.listings"), value: listings.data ? `${listings.data.length} / ${PRIVATE_LISTING_LIMIT}` : undefined, href: to("/account/listings"), icon: <HouseLine weight="duotone" className={`${ic} text-emerald-600`} aria-hidden /> },
    { label: t("account.inqSent"), value: inquiries.data?.length, href: to("/property/1"), icon: <EnvelopeSimple weight="duotone" className={`${ic} text-champagne-700`} aria-hidden /> },
  ];

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("account.hello", { name: user?.name.split(" ")[0] ?? "" })}</h1>
      <p className="mb-7 text-sm text-muted">{t("account.sub", { n: PRIVATE_LISTING_LIMIT })}</p>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.href} className="rounded-xl border border-slate-300 bg-white p-5 transition-shadow hover:shadow-elevation-md">
            <span className="mb-2 block">{c.icon}</span>
            <p className="font-display text-2xl font-extrabold tabular">{c.value ?? "…"}</p>
            <p className="text-sm font-semibold text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-slate-300 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-4 font-display text-base font-bold">{t("account.newMatchesTitle")}</h2>
        <ul className="divide-y divide-slate-200">
          {(searches.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-muted">{t("account.savedOn", { date: fmtDate(s.createdAt, locale) })}</p>
              </div>
              {s.newMatches > 0 ? <StatusBadge status="active" /> : <span className="text-xs text-muted">{t("account.noNewMatches")}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
