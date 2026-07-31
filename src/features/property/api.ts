/* Property discovery services — Public Frontend.
   Real endpoints (Laravel API v1):
     GET /properties            (filters as query params, Laravel paginator)
     GET /properties/{id}
     GET /locations/autocomplete?q=
   Swap-in: set VITE_USE_MOCKS=false — no component changes required. */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import { CITIES, LISTING_AGENTS, PROPERTIES } from "@/shared/mock/db";
import type { CityIndexEntry, ListingAgent, Paginated, Property, PropertyFilters } from "@/shared/types";

/** Haversine distance in km — powers the mock radius search. */
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const s =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

function applyFilters(rows: Property[], f: PropertyFilters): Property[] {
  let out = rows.filter((p) => p.status === "active");
  if (f.type) out = out.filter((p) => p.offMarket || p.listingType === f.type);
  if (f.q) {
    const q = f.q.toLowerCase();
    const textMatch = (p: Property) =>
      `${p.location.city} ${p.location.country} ${p.location.postalCode} ${p.title}`.toLowerCase().includes(q);
    /* Radius search: geocode the query via the first text match, then keep
       everything within N km of that centre (backend: Google Geocoding §4.3). */
    const center = f.radiusKm ? out.find(textMatch)?.location.geo : undefined;
    out = center
      ? out.filter((p) => distKm(center, p.location.geo) <= f.radiusKm!)
      : out.filter(textMatch);
  }
  if (f.country) out = out.filter((p) => p.location.country === f.country);
  if (f.propertyType) out = out.filter((p) => p.propertyType === f.propertyType);
  if (f.priceMin) out = out.filter((p) => p.offMarket || p.price >= f.priceMin!);
  if (f.priceMax) out = out.filter((p) => p.offMarket || p.price <= f.priceMax!);
  if (f.areaMin) out = out.filter((p) => p.livingArea >= f.areaMin!);
  if (f.bedroomsMin) out = out.filter((p) => p.bedrooms >= f.bedroomsMin!);
  /* Energy class means "this class or better"; EPC order is A+ (best) → H,
     so "A+" needs an explicit rank — lexical compare would sort it below A */
  const energyRank = (r: string) => (r === "A+" ? 0 : r.charCodeAt(0) - 64);
  if (f.energyClass) out = out.filter((p) => p.energyRating && energyRank(p.energyRating) <= energyRank(f.energyClass!));
  if (f.amenities?.length) out = out.filter((p) => f.amenities!.every((a) => p.amenities.includes(a)));
  switch (f.sort) {
    case "price_asc": out = [...out].sort((a, b) => a.price - b.price); break;
    case "price_desc": out = [...out].sort((a, b) => b.price - a.price); break;
    default: out = [...out].sort((a, b) => b.id - a.id);
  }
  /* Top placements pin to the front (§G5 / proposal placement tiers) */
  return [...out.filter((p) => p.placement === "top"), ...out.filter((p) => p.placement !== "top")];
}

export async function searchProperties(filters: PropertyFilters): Promise<Paginated<Property>> {
  if (!USE_MOCKS) return request<Paginated<Property>>("/properties", { params: { ...filters } as never });
  await mockDelay();
  /* Default 8 fills two rows at 2xl (4-col) and keeps parity with home featured */
  const perPage = filters.perPage ?? 8;
  const page = filters.page ?? 1;
  /* Public search = every top-level listing; New Construction sub-units stay
     inside their master project's unit table (drafts/sold drop via status) */
  const all = applyFilters(PROPERTIES.filter((p) => !p.masterProjectId), filters);
  return {
    data: all.slice((page - 1) * perPage, page * perPage),
    meta: { current_page: page, last_page: Math.max(1, Math.ceil(all.length / perPage)), per_page: perPage, total: all.length },
  };
}

export async function getProperty(id: number): Promise<Property | undefined> {
  if (!USE_MOCKS) return request<{ data: Property }>(`/properties/${id}`).then((r) => r.data);
  await mockDelay(250);
  return PROPERTIES.find((p) => p.id === id);
}

/** Public agent card for the exposé contact block — GET /agents/{id}/public */
export async function getListingAgent(agentId: number): Promise<ListingAgent> {
  if (!USE_MOCKS) return request<{ data: ListingAgent }>(`/agents/${agentId}/public`).then((r) => r.data);
  await mockDelay(120);
  return LISTING_AGENTS[agentId] ?? LISTING_AGENTS[101];
}

export async function getFeatured(): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>("/properties", { params: { placement: "any" } }).then((r) => r.data);
  await mockDelay(200);
  /* Top placements first; capped at 8 so the home grid fills exact rows at
     lg (3+3+2) and 2xl (4+4) — same card scale as the search list */
  return PROPERTIES
    .filter((p) => p.placement && p.status === "active")
    .sort((a, b) => (a.placement === "top" ? 0 : 1) - (b.placement === "top" ? 0 : 1))
    .slice(0, 8);
}

/** Sub-units of a New Construction master project — GET /properties/{id}/units */
export async function getSubUnits(masterId: number): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>(`/properties/${masterId}/units`).then((r) => r.data);
  await mockDelay(250);
  return PROPERTIES
    .filter((p) => p.masterProjectId === masterId)
    .sort((a, b) => a.price - b.price);
}

/** €/m² insight vs the city average (same listing type) — mock computes from
    the local dataset; real backend: GET /properties/{id}/price-insight. */
export function priceInsight(p: Property): { sqm: number; cityAvg: number | null } {
  const sqm = p.price / p.livingArea;
  const peers = PROPERTIES.filter(
    (x) =>
      x.id !== p.id && x.status === "active" && !x.offMarket &&
      x.listingType === p.listingType && x.location.city === p.location.city,
  );
  if (peers.length === 0) return { sqm, cityAvg: null };
  const cityAvg = peers.reduce((s, x) => s + x.price / x.livingArea, 0) / peers.length;
  return { sqm, cityAvg };
}

export async function getOffMarket(): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>("/properties", { params: { off_market: true } }).then((r) => r.data);
  await mockDelay(200);
  return PROPERTIES.filter((p) => p.offMarket);
}

export async function autocompleteLocations(q: string): Promise<CityIndexEntry[]> {
  if (!USE_MOCKS) return request<{ data: CityIndexEntry[] }>("/locations/autocomplete", { params: { q } }).then((r) => r.data);
  await mockDelay(120);
  const term = q.toLowerCase().replace(/[\s-]/g, "");
  return CITIES.filter(
    (c) => c.city.toLowerCase().includes(q.toLowerCase()) || c.zip.replace(/[\s-]/g, "").startsWith(term),
  ).slice(0, 5);
}

/** Off-Market unlock — POST /off-market/{id}/unlock { code }.
    Without a propertyId (hub entry) the backend resolves the code to its listing. */
export async function unlockOffMarket(code: string, propertyId?: number): Promise<{ ok: boolean; propertyId?: number }> {
  if (!USE_MOCKS) return request("/off-market/unlock", { method: "POST", body: { code, propertyId } });
  await mockDelay(700);
  return code === "492810" ? { ok: true, propertyId: propertyId ?? 1 } : { ok: false };
}

export const POPULAR_CITIES = CITIES.slice(0, 6);

/** Curated set for the home "Explore by city" cards. */
const EXPLORE = ["Berlin", "Praha", "Paris", "Amsterdam", "Madrid", "München"];
export const EXPLORE_CITIES = EXPLORE
  .map((name) => CITIES.find((c) => c.city === name))
  .filter((c): c is NonNullable<typeof c> => Boolean(c));
