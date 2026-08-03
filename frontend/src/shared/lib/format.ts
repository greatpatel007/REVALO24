import type { Locale, Property } from "@/shared/types";

/* Localized "per month" suffix for rent prices — kept here (not in the
   dictionaries) because fmtPrice is called outside React components. */
const PER_MONTH: Record<Locale, string> = {
  en: "/ mo", de: "/ Monat", fr: "/ mois", es: "/ mes", pt: "/ mês",
  nl: "/ mnd", cs: "/ měsíc", pl: "/ mies.", sk: "/ mesiac",
};

/** EUR fiscal base; localized display estimates per proposal §4.1. */
export function fmtPrice(p: Property, locale: Locale = "en"): string {
  const eur = new Intl.NumberFormat(locale, {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(p.price);
  /* nbsp keeps the price and its "/ mo" suffix on one line in tight card rows */
  return p.listingType === "rent" ? `${eur}\u00A0${PER_MONTH[locale]}` : eur;
}

export function fmtEur(amount: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

/** Invoice-grade EUR — keeps cents for net / VAT / gross lines. */
export function fmtEurExact(amount: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/* Demo daily reference rates — production fetches GET /fx/daily (ECB feed).
   Only the non-EUR target regions (Czechia, Poland) get a display estimate. */
const FX_DISPLAY: Partial<Record<Locale, { currency: string; rate: number }>> = {
  cs: { currency: "CZK", rate: 24.6 },
  pl: { currency: "PLN", rate: 4.27 },
};

/** Localized display estimate per proposal §4.1 / §8.2(5): all transactions and
    stored prices are EUR; CZ/PL locales additionally see a converted estimate.
    Returns null for EUR locales. */
export function fmtLocalEstimate(amountEur: number, locale: Locale): string | null {
  const fx = FX_DISPLAY[locale];
  if (!fx) return null;
  const amount = new Intl.NumberFormat(locale, {
    style: "currency", currency: fx.currency, maximumFractionDigits: 0,
  }).format(amountEur * fx.rate);
  return `≈\u00A0${amount}`;
}

export function fmtDate(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Date + time for logs/imports. Accepts "YYYY-MM-DD HH:mm" or ISO strings. */
export function fmtDateTime(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso.replace(" ", "T")));
}

export function locationLabel(p: Property): string {
  return `${p.location.postalCode !== "—" ? p.location.postalCode + " " : ""}${p.location.city}, ${p.location.country}`;
}
