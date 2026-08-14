import { Link } from "react-router-dom";
import { EnvelopeSimple, FacebookLogo, InstagramLogo, LinkedinLogo, MapPin, Phone, ShieldCheck, YoutubeLogo } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { LOCALES } from "@/shared/i18n/dictionaries";
import { Logo } from "./Header";
import type { Locale } from "@/shared/types";

const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com", icon: LinkedinLogo },
  { label: "Instagram", href: "https://www.instagram.com", icon: InstagramLogo },
  { label: "Facebook", href: "https://www.facebook.com", icon: FacebookLogo },
  { label: "YouTube", href: "https://www.youtube.com", icon: YoutubeLogo },
];

export function Footer() {
  const { t, to, locale, switchLocale } = useI18n();
  const col = "flex flex-col gap-2 text-sm";
  const link = "text-slate-400 hover:text-white transition-colors";

  return (
    <footer className="mt-auto bg-navy text-slate-400">
      <div className="mx-auto grid max-w-shell grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-3">
            <Logo onDark />
          </div>
          <p className="mb-4 max-w-xs text-sm">{t("footer.tagline")}</p>
          {/* Official operator data (client email, 2026-07): Manageer Europe GmbH */}
          <address className="flex flex-col gap-1.5 text-sm not-italic">
            <a href="mailto:hello@revalo24.eu" className={`flex items-center gap-2 ${link}`}>
              <EnvelopeSimple className="size-4 shrink-0" aria-hidden /> hello@revalo24.eu
            </a>
            <a href="tel:+4930123456780" className={`flex items-center gap-2 ${link}`}>
              <Phone className="size-4 shrink-0" aria-hidden /> +49 30 1234 5678-0
            </a>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> Manageer Europe GmbH · Siebenhäusergasse 7 · D-35423 Lich, Germany
            </span>
          </address>
        </div>
        <div className={col}>
          <p className="t-overline mb-1 text-slate-500">{t("footer.discover")}</p>
          <Link className={link} to={to("/properties?type=buy")}>{t("nav.buy")}</Link>
          <Link className={link} to={to("/properties?type=rent")}>{t("nav.rent")}</Link>
          <Link className={link} to={to("/map")}>{t("nav.map")}</Link>
          <Link className={link} to={to("/off-market")}>{t("nav.offmarket")}</Link>
        </div>
        <div className={col}>
          <p className="t-overline mb-1 text-slate-500">{t("footer.company")}</p>
          <Link className={link} to={to("/about")}>{t("nav.about")}</Link>
          <Link className={link} to={to("/contact")}>{t("nav.contact")}</Link>
          <Link className={link} to={to("/agents")}>{t("nav.agents")}</Link>
          <div className="mt-2 flex gap-1.5">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-white">
                <s.icon weight="fill" className="size-4.5" aria-hidden />
              </a>
            ))}
          </div>
        </div>
        <div className={col}>
          <p className="t-overline mb-1 text-slate-500">{t("footer.legal")}</p>
          <Link className={link} to={to("/legal/imprint")}>{t("footer.legal.imprint")}</Link>
          <Link className={link} to={to("/legal/terms")}>{t("footer.legal.terms")}</Link>
          <Link className={link} to={to("/legal/privacy")}>{t("footer.legal.privacy")}</Link>
          <Link className={link} to={to("/legal/cookies")}>{t("footer.legal.cookies")}</Link>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs sm:px-6">
          <span>{t("footer.copyright")}</span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" aria-hidden /> {t("footer.badges")}
            </span>
            <label className="flex items-center gap-2">
              <span className="sr-only">{t("footer.language")}</span>
              <select
                value={locale}
                onChange={(e) => switchLocale(e.target.value as Locale)}
                aria-label={t("footer.language")}
                className="min-h-9 cursor-pointer rounded-lg border border-slate-700 bg-transparent px-2.5 text-base font-bold uppercase text-slate-300 hover:border-slate-500 sm:text-xs"
              >
                {LOCALES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-navy text-white">{l.code} — {l.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </footer>
  );
}
