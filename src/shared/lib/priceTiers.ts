/** Buy-mode price quick tiers — shared by Home sticky strip + Search FilterBar */
export const PRICE_TIERS: {
  id: string;
  labelKey: string;
  min?: number;
  max?: number;
}[] = [
  { id: "u250", labelKey: "filter.tier.u250", max: 250_000 },
  { id: "250_500", labelKey: "filter.tier.250_500", min: 250_000, max: 500_000 },
  { id: "500_1m", labelKey: "filter.tier.500_1m", min: 500_000, max: 1_000_000 },
  { id: "1m_plus", labelKey: "filter.tier.1m_plus", min: 1_000_000 },
];

export function priceTierQuery(tier: (typeof PRICE_TIERS)[number]): { min?: string; max?: string } {
  return {
    min: tier.min != null ? String(tier.min) : undefined,
    max: tier.max != null ? String(tier.max) : undefined,
  };
}
