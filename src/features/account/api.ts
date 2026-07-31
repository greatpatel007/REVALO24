/* Private user services (B2C dashboard).
   Real endpoints:
     GET/POST/DELETE /me/favorites
     GET/POST/DELETE /me/saved-searches
     GET/POST        /me/listings            (max 3 active — enforced server-side too)
     POST            /inquiries              { property_id, name, email, phone?, message }  */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import { FAVORITES_SEED, PROPERTIES, SAVED_SEARCHES } from "@/shared/mock/db";
import type { AlertFrequency, Inquiry, Property, PropertyFilters, SavedSearch } from "@/shared/types";

const LS_FAV = "r24.favorites";
const LS_MY = "r24.myListings";

function readIds(key: string, seed: number[]): number[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as number[]) : seed;
  } catch {
    return seed;
  }
}
function writeIds(key: string, ids: number[]): void {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* ignore */ }
}

export async function getFavorites(): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>("/me/favorites").then((r) => r.data);
  await mockDelay(250);
  const ids = readIds(LS_FAV, FAVORITES_SEED);
  return PROPERTIES.filter((p) => ids.includes(p.id));
}

export function getFavoriteIds(): number[] {
  return readIds(LS_FAV, FAVORITES_SEED);
}

export async function toggleFavorite(id: number): Promise<number[]> {
  if (!USE_MOCKS) {
    await request(`/me/favorites/${id}`, { method: "POST" });
    return getFavoriteIds();
  }
  const ids = readIds(LS_FAV, FAVORITES_SEED);
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  writeIds(LS_FAV, next);
  return next;
}

let savedSearches = [...SAVED_SEARCHES];

export async function getSavedSearches(): Promise<SavedSearch[]> {
  if (!USE_MOCKS) return request<{ data: SavedSearch[] }>("/me/saved-searches").then((r) => r.data);
  await mockDelay(250);
  return savedSearches;
}

export async function saveSearch(label: string, filters: PropertyFilters, alertFrequency: AlertFrequency = "daily"): Promise<SavedSearch> {
  if (!USE_MOCKS) return request<{ data: SavedSearch }>("/me/saved-searches", { method: "POST", body: { label, filters, alert_frequency: alertFrequency } }).then((r) => r.data);
  await mockDelay(300);
  const s: SavedSearch = { id: Date.now(), label, filters, createdAt: "2026-07-29", newMatches: 0, alertFrequency };
  savedSearches = [s, ...savedSearches];
  return s;
}

/** PATCH /me/saved-searches/{id} — currently only the alert cadence is editable */
export async function updateSavedSearch(id: number, patch: { alertFrequency: AlertFrequency }): Promise<void> {
  if (!USE_MOCKS) { await request(`/me/saved-searches/${id}`, { method: "PATCH", body: { alert_frequency: patch.alertFrequency } }); return; }
  await mockDelay(200);
  savedSearches = savedSearches.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export async function deleteSavedSearch(id: number): Promise<void> {
  if (!USE_MOCKS) { await request(`/me/saved-searches/${id}`, { method: "DELETE" }); return; }
  await mockDelay(200);
  savedSearches = savedSearches.filter((s) => s.id !== id);
}

/** Private listings — max 3 active per account (proposal §3.4.4). */
export async function getMyListings(): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>("/me/listings").then((r) => r.data);
  await mockDelay(250);
  const ids = readIds(LS_MY, []);
  return PROPERTIES.filter((p) => ids.includes(p.id));
}

export const PRIVATE_LISTING_LIMIT = 3;

let inquiries: Inquiry[] = [];

export async function sendInquiry(input: Omit<Inquiry, "id" | "status" | "createdAt">): Promise<Inquiry> {
  if (!USE_MOCKS) return request<{ data: Inquiry }>("/inquiries", { method: "POST", body: input }).then((r) => r.data);
  await mockDelay(800);
  const inq: Inquiry = { ...input, id: Date.now(), status: "sent", createdAt: "2026-07-29" };
  inquiries = [inq, ...inquiries];
  return inq;
}

export async function getInquiries(): Promise<Inquiry[]> {
  if (!USE_MOCKS) return request<{ data: Inquiry[] }>("/me/inquiries").then((r) => r.data);
  await mockDelay(200);
  return inquiries;
}
