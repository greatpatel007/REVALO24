/* Platform scope constants (proposal: 13 pre-loaded EU markets, DACH conventions). */

export const COUNTRIES = [
  "Germany",
  "Austria",
  "Netherlands",
  "Belgium",
  "France",
  "Spain",
  "Portugal",
  "Italy",
  "Czechia",
  "Slovakia",
  "Poland",
  "Hungary",
  "Croatia",
] as const;
export type Country = (typeof COUNTRIES)[number];

/** Calling codes for the 13 platform markets — used by split phone inputs (code + national number). */
export const DIAL_CODES = [
  { iso: "DE", code: "+49" },
  { iso: "AT", code: "+43" },
  { iso: "NL", code: "+31" },
  { iso: "BE", code: "+32" },
  { iso: "FR", code: "+33" },
  { iso: "ES", code: "+34" },
  { iso: "PT", code: "+351" },
  { iso: "IT", code: "+39" },
  { iso: "CZ", code: "+420" },
  { iso: "SK", code: "+421" },
  { iso: "PL", code: "+48" },
  { iso: "HU", code: "+36" },
  { iso: "HR", code: "+385" },
] as const;

/** DACH "Anrede" convention (registration spec file 04) — optional, never required. */
export const SALUTATIONS = [
  { value: "", label: "—" },
  { value: "herr", label: "Herr" },
  { value: "frau", label: "Frau" },
  { value: "divers", label: "Divers" },
] as const;

/* Buyer-side purchase costs as % of price, keyed by ISO country code.
   Representative national rates for the demo (IS24 "Kaufnebenkosten" pattern) —
   regional rates/exemptions come from the country-compliance service later. */
export interface PurchaseCostRates {
  transferTax: number; // land-transfer / registration tax
  notary: number;      // notary + land registry
  agentFee: number;    // typical buyer-side commission (0 = seller pays)
}
export const PURCHASE_COSTS: Record<string, PurchaseCostRates> = {
  DE: { transferTax: 5.0, notary: 2.0, agentFee: 3.57 },
  AT: { transferTax: 3.5, notary: 2.5, agentFee: 3.0 },
  NL: { transferTax: 2.0, notary: 1.5, agentFee: 0 },
  BE: { transferTax: 12.5, notary: 2.0, agentFee: 0 },
  FR: { transferTax: 5.8, notary: 1.5, agentFee: 0 },
  ES: { transferTax: 8.0, notary: 1.5, agentFee: 0 },
  PT: { transferTax: 6.0, notary: 1.5, agentFee: 0 },
  IT: { transferTax: 4.0, notary: 2.5, agentFee: 3.0 },
  CZ: { transferTax: 0, notary: 1.0, agentFee: 3.0 }, // transfer tax abolished 2020
  SK: { transferTax: 0, notary: 1.0, agentFee: 3.0 },
  PL: { transferTax: 2.0, notary: 2.0, agentFee: 2.0 },
  HU: { transferTax: 4.0, notary: 1.5, agentFee: 3.0 },
  HR: { transferTax: 3.0, notary: 1.5, agentFee: 3.0 },
};
