/* Agent Panel services.
   Real endpoints:
     GET/POST/PUT/DELETE /agent/properties        (+ bulk: POST /agent/properties/bulk)
     GET  /agent/stats                            (dashboard, per-listing daily views/clicks)
     GET  /agent/subscription  · GET /plans · GET /placements
     POST /agent/placements/purchase              (Stripe Checkout session URL)
     GET  /agent/invoices
     POST /agent/stripe-portal                    (hosted Customer Portal URL — §4.1)
     POST /agent/ai/expose                        (Gemini queue; async job id)
     GET  /agent/imports · POST /agent/imports/upload (manual ZIP fallback)
     GET  /agent/ftp-credentials
     GET  /agent/inquiries · PUT /agent/inquiries/{id}/replied

   Mocks are scoped to the CURRENT agent session (like the API scopes by
   bearer token) — three demo agents see three different datasets. */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import {
  dailyStats, DEMO_AGENT, ftpCredentialsFor, IMPORT_JOBS_BY_AGENT, INVOICES_BY_AGENT,
  PLACEMENTS, PLANS, PROPERTIES, SUBSCRIPTION_BASE,
} from "@/shared/mock/db";
import type {
  AgentDashboardStats, AgentProfile, AgentSubscription, ExposeRequest, ExposeResult, FtpCredentials,
  ImportJob, Inquiry, Invoice, ListingTrafficRow, Locale, PlacementProduct, Property, PropertyStatus, SubscriptionPlan,
} from "@/shared/types";

/* ---- session scoping (mock equivalent of the bearer token) ---- */

function currentAgentId(): number {
  try {
    const raw = localStorage.getItem("r24.session");
    const user = raw ? (JSON.parse(raw) as { id?: number; role?: string }) : null;
    return user?.role === "agent" && typeof user.id === "number" ? user.id : DEMO_AGENT.id;
  } catch {
    return DEMO_AGENT.id;
  }
}

const propsByAgent = new Map<number, Property[]>();
function agentProps(id = currentAgentId()): Property[] {
  if (!propsByAgent.has(id)) propsByAgent.set(id, PROPERTIES.filter((p) => p.agentId === id));
  return propsByAgent.get(id)!;
}
function setAgentProps(next: Property[], id = currentAgentId()) {
  propsByAgent.set(id, next);
}

export async function getAgentProperties(): Promise<Property[]> {
  if (!USE_MOCKS) return request<{ data: Property[] }>("/agent/properties").then((r) => r.data);
  await mockDelay(300);
  return agentProps();
}

export async function saveAgentProperty(input: Partial<Property> & { id?: number }): Promise<Property> {
  if (!USE_MOCKS) {
    return input.id
      ? request<{ data: Property }>(`/agent/properties/${input.id}`, { method: "PUT", body: input }).then((r) => r.data)
      : request<{ data: Property }>("/agent/properties", { method: "POST", body: input }).then((r) => r.data);
  }
  await mockDelay(600);
  const props = agentProps();
  if (input.id) {
    const next = props.map((p) => (p.id === input.id ? ({ ...p, ...input } as Property) : p));
    setAgentProps(next);
    return next.find((p) => p.id === input.id)!;
  }
  const base = props[0] ?? PROPERTIES[0];
  const created = {
    ...base,
    ...input,
    id: Math.max(...PROPERTIES.map((p) => p.id), ...props.map((p) => p.id)) + 1,
    agentId: currentAgentId(),
    status: (input.status ?? "draft") as PropertyStatus,
    createdAt: "2026-07-30",
    viewsTotal: 0,
    clicksTotal: 0,
  } as Property;
  setAgentProps([created, ...props]);
  return created;
}

export async function bulkAction(ids: number[], action: "activate" | "pause" | "delete" | PropertyStatus): Promise<void> {
  if (!USE_MOCKS) { await request("/agent/properties/bulk", { method: "POST", body: { ids, action } }); return; }
  await mockDelay(400);
  const props = agentProps();
  if (action === "delete") setAgentProps(props.filter((p) => !ids.includes(p.id)));
  else {
    const status: PropertyStatus = action === "activate" ? "active" : action === "pause" ? "draft" : action;
    setAgentProps(props.map((p) => (ids.includes(p.id) ? { ...p, status } : p)));
  }
}

export async function getAgentStats(): Promise<AgentDashboardStats> {
  if (!USE_MOCKS) return request<{ data: AgentDashboardStats }>("/agent/stats").then((r) => r.data);
  await mockDelay(350);
  const id = currentAgentId();
  const props = agentProps(id);
  const inquiries = inquiriesByAgent.get(id) ?? [];
  // Traffic proportional to portfolio size; a fresh agent has a flat-zero series
  const scale = props.length === 0 ? 0 : id === DEMO_AGENT.id ? 1 : Math.min(1, props.length / 12);
  return {
    totalProperties: props.length,
    activeCount: props.filter((p) => p.status === "active").length,
    soldCount: props.filter((p) => p.status === "sold").length,
    inquiriesTotal: inquiries.length,
    daily: dailyStats(scale),
  };
}

/** Per-listing views / clicks for the dashboard drill-down. */
export async function getListingTraffic(): Promise<ListingTrafficRow[]> {
  if (!USE_MOCKS) {
    return request<{ data: ListingTrafficRow[] }>("/agent/stats/listings").then((r) => r.data);
  }
  await mockDelay(280);
  return agentProps()
    .map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      city: p.location.city,
      country: p.location.country,
      viewsTotal: p.viewsTotal ?? 0,
      clicksTotal: p.clicksTotal ?? Math.round((p.viewsTotal ?? 0) * 0.12),
    }))
    .sort((a, b) => b.viewsTotal - a.viewsTotal);
}

/* Contact tracking (§3.4.3 "Personal Dashboard") — inquiries received from
   visitors and private users on this agent's listings. */
const inquiryOf = (agentId: number, i: number, data: Omit<Inquiry, "id" | "propertyId" | "propertyTitle">, propIdx: number): Inquiry => {
  const props = agentProps(agentId);
  const p = props[propIdx % props.length];
  return { id: agentId * 100 + i, propertyId: p.id, propertyTitle: p.title, ...data };
};

const inquiriesByAgent = new Map<number, Inquiry[]>([
  [101, [
    inquiryOf(101, 1, { name: "Jonas Weber", email: "jonas.weber@mail.de", phone: "+49 171 2345678", message: "Is a viewing possible this Saturday? We are a family of four relocating from Hamburg.", status: "sent", createdAt: "2026-07-29" }, 0),
    inquiryOf(101, 2, { name: "Claire Dubois", email: "c.dubois@orange.fr", message: "Bonjour — is the price negotiable for a cash purchase without financing contingency?", status: "sent", createdAt: "2026-07-28" }, 1),
    inquiryOf(101, 3, { name: "Martin Novák", email: "m.novak@seznam.cz", phone: "+420 601 234 567", message: "Please send the floor plan and the energy certificate. Is the parking space included?", status: "sent", createdAt: "2026-07-27" }, 2),
    inquiryOf(101, 4, { name: "Amelia Santos", email: "a.santos@sapo.pt", phone: "+351 912 345 678", message: "Is the property still available? We can visit Munich next Thursday afternoon.", status: "sent", createdAt: "2026-07-27" }, 3),
    inquiryOf(101, 5, { name: "Hans Meier", email: "hans.meier@web.de", phone: "+49 160 9876543", message: "Could you confirm the year of the last bathroom renovation?", status: "sent", createdAt: "2026-07-26" }, 0),
    inquiryOf(101, 6, { name: "Lena Fischer", email: "lena.fischer@example.com", message: "I saw the exposé — what are the monthly service charges (Hausgeld)?", status: "replied", createdAt: "2026-07-25" }, 0),
    inquiryOf(101, 7, { name: "Piotr Kowalski", email: "p.kowalski@wp.pl", phone: "+48 512 345 678", message: "Interested as a buy-to-let investment. What is the achievable cold rent?", status: "replied", createdAt: "2026-07-22" }, 3),
    inquiryOf(101, 8, { name: "Sofia Rossi", email: "sofia.rossi@gmail.com", message: "Could you arrange a video viewing? I am currently based in Milan.", status: "replied", createdAt: "2026-07-19" }, 1),
    inquiryOf(101, 9, { name: "Tomáš Horák", email: "t.horak@centrum.cz", message: "Is pet ownership allowed, and is there a lift in the building?", status: "replied", createdAt: "2026-07-17" }, 2),
    inquiryOf(101, 10, { name: "Emma Johansson", email: "emma.j@icloud.com", phone: "+46 70 123 45 67", message: "We need a move-in date in September. Is that realistic for this listing?", status: "replied", createdAt: "2026-07-15" }, 1),
    inquiryOf(101, 11, { name: "Luca Bianchi", email: "l.bianchi@libero.it", message: "Please share the condominium meeting minutes from the last two years.", status: "replied", createdAt: "2026-07-12" }, 0),
    inquiryOf(101, 12, { name: "Nora Bakker", email: "nora.bakker@xs4all.nl", phone: "+31 6 12345678", message: "Is the balcony facing south? Any noise from the nearby tram line?", status: "replied", createdAt: "2026-07-10" }, 2),
  ]],
  [102, [
    inquiryOf(102, 1, { name: "Eva Dvořáková", email: "eva.dvorakova@email.cz", phone: "+420 777 888 123", message: "Dobrý den, is unit 3.02 still available and can I visit the show flat next week?", status: "sent", createdAt: "2026-07-29" }, 0),
    inquiryOf(102, 2, { name: "Thomas Berger", email: "t.berger@gmx.at", message: "Looking for a rental in Brno for a 12-month work assignment starting September.", status: "replied", createdAt: "2026-07-24" }, 1),
  ]],
  [108, []],
]);

export async function getAgentInquiries(): Promise<Inquiry[]> {
  if (!USE_MOCKS) return request<{ data: Inquiry[] }>("/agent/inquiries").then((r) => r.data);
  await mockDelay(300);
  return inquiriesByAgent.get(currentAgentId()) ?? [];
}

export async function markInquiryReplied(id: number): Promise<void> {
  if (!USE_MOCKS) { await request(`/agent/inquiries/${id}/replied`, { method: "PUT" }); return; }
  await mockDelay(300);
  const agentId = currentAgentId();
  const list = inquiriesByAgent.get(agentId) ?? [];
  inquiriesByAgent.set(agentId, list.map((q) => (q.id === id ? { ...q, status: "replied" } : q)));
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  if (!USE_MOCKS) return request<{ data: SubscriptionPlan[] }>("/plans").then((r) => r.data);
  await mockDelay(200);
  return PLANS;
}

export interface PromoResult {
  valid: boolean;
  code: string;
  /** e.g. 25 = 25% off the first billing period */
  discountPercent: number;
  description: string;
}

/** Promo code validation — POST /agent/subscription/promo { code }.
    Applied to the Stripe Checkout session server-side. Demo: EUROPA25. */
export async function applyPromoCode(code: string): Promise<PromoResult> {
  if (!USE_MOCKS) return request<{ data: PromoResult }>("/agent/subscription/promo", { method: "POST", body: { code } }).then((r) => r.data);
  await mockDelay(450);
  // description is intentionally empty: the UI renders localized copy from
  // valid + discountPercent (agent.sub.promoOk / agent.sub.promoInvalid)
  const normalized = code.trim().toUpperCase();
  if (normalized === "EUROPA25") {
    return { valid: true, code: normalized, discountPercent: 25, description: "" };
  }
  return { valid: false, code: normalized, discountPercent: 0, description: "" };
}

export async function getSubscription(): Promise<AgentSubscription> {
  if (!USE_MOCKS) return request<{ data: AgentSubscription }>("/agent/subscription").then((r) => r.data);
  await mockDelay(250);
  const id = currentAgentId();
  const base = SUBSCRIPTION_BASE[id] ?? SUBSCRIPTION_BASE[DEMO_AGENT.id];
  return {
    ...base,
    listingsUsed: agentProps(id).filter((p) => p.status === "active").length,
  };
}

/** Hosted Stripe Customer Portal — all self-service billing goes there (§4.1). */
export async function getStripePortalUrl(): Promise<string> {
  if (!USE_MOCKS) return request<{ url: string }>("/agent/stripe-portal", { method: "POST" }).then((r) => r.url);
  await mockDelay(500);
  return "https://billing.stripe.com/session/mock_demo";
}

export async function getPlacements(): Promise<PlacementProduct[]> {
  if (!USE_MOCKS) return request<{ data: PlacementProduct[] }>("/placements").then((r) => r.data);
  await mockDelay(200);
  return PLACEMENTS;
}

export async function purchasePlacement(productId: number, propertyId: number): Promise<{ checkoutUrl: string }> {
  if (!USE_MOCKS) return request("/agent/placements/purchase", { method: "POST", body: { productId, propertyId } });
  await mockDelay(600);
  const product = PLACEMENTS.find((p) => p.id === productId);
  const tier = product?.tier ?? "featured";
  const days = product?.durationDays ?? 14;
  const today = new Date();
  const ends = new Date(today);
  ends.setDate(ends.getDate() + days);
  const endsAt = ends.toISOString().slice(0, 10);
  const date = today.toISOString().slice(0, 10);

  const listing = agentProps().find((p) => p.id === propertyId);
  setAgentProps(agentProps().map((p) => (
    p.id === propertyId ? { ...p, placement: tier, placementEndsAt: endsAt } : p
  )));

  /* Append a placement invoice so Purchase history stays in sync with the buy */
  const agentId = currentAgentId();
  const prior = INVOICES_BY_AGENT[agentId] ?? [];
  const sample = prior[0];
  const inv: Invoice = {
    id: `INV-${date.replace(/-/g, "")}-${String(prior.length + 1).padStart(3, "0")}`,
    date,
    description: `${product?.label ?? "Placement"} — ${listing?.title ?? `#${propertyId}`}`,
    amountEur: product?.priceEur ?? 0,
    vatRate: sample?.vatRate ?? 19,
    reverseCharge: sample?.reverseCharge ?? false,
    pdfUrl: "#",
    kind: "placement",
    propertyId,
  };
  INVOICES_BY_AGENT[agentId] = [inv, ...prior];

  return { checkoutUrl: "https://checkout.stripe.com/mock_demo" };
}

export async function getInvoices(): Promise<Invoice[]> {
  if (!USE_MOCKS) return request<{ data: Invoice[] }>("/agent/invoices").then((r) => r.data);
  await mockDelay(250);
  return INVOICES_BY_AGENT[currentAgentId()] ?? [];
}

/** Placement purchases only — used by the Placements billing section. */
export async function getPlacementInvoices(): Promise<Invoice[]> {
  const all = await getInvoices();
  return all.filter((inv) => inv.kind === "placement");
}

const AI_LOCALES: Locale[] = ["de", "en", "fr", "es", "pt", "nl", "cs", "pl", "sk"];

/** AI Exposé Optimizer — Gemini generates all 9 languages from one source (§3.4.3). */
export async function generateExpose(req: ExposeRequest): Promise<ExposeResult[]> {
  if (!USE_MOCKS) return request<{ data: ExposeResult[] }>("/agent/ai/expose", { method: "POST", body: req }).then((r) => r.data);
  await mockDelay(1600);
  const headlineBy: Partial<Record<Locale, string>> = {
    de: "Lichtdurchflutete Stadtwohnung mit Südbalkon", en: "Light-filled city apartment with south-facing balcony",
    fr: "Appartement lumineux avec balcon plein sud", es: "Piso luminoso con balcón orientado al sur",
    pt: "Apartamento luminoso com varanda a sul", nl: "Lichtrijk stadsappartement met zonnig balkon",
    cs: "Prosvětlený městský byt s jižním balkonem", pl: "Przestronne mieszkanie z południowym balkonem",
    sk: "Presvetlený mestský byt s južným balkónom",
  };
  return AI_LOCALES.map((language) => ({
    language,
    headline: headlineBy[language] ?? headlineBy.en!,
    keyFeatures: ["86 m² · 3 rooms", "South-facing 9 m² balcony", "Renovated 2022 · oak parquet", "U-Bahn 4 min walk"],
    description:
      `[${language.toUpperCase()}] ` +
      "Professionally optimized exposé generated from your source text: a bright three-room apartment on the third floor, fully renovated in 2022, with open kitchen, oak parquet and a quiet courtyard balcony. Excellent transport links and long-term value in one of the city's most stable districts.",
    callToAction: language === "de" ? "Jetzt Besichtigung vereinbaren" : "Book a viewing today",
  }));
}

export async function getImportJobs(): Promise<ImportJob[]> {
  if (!USE_MOCKS) return request<{ data: ImportJob[] }>("/agent/imports").then((r) => r.data);
  await mockDelay(300);
  return IMPORT_JOBS_BY_AGENT[currentAgentId()] ?? [];
}

export async function uploadImportZip(fileName: string): Promise<ImportJob> {
  if (!USE_MOCKS) return request<{ data: ImportJob }>("/agent/imports/upload", { method: "POST", body: { fileName } }).then((r) => r.data);
  await mockDelay(1200);
  return {
    id: 32, fileName, source: "Manual ZIP", operation: "FULL", status: "processing",
    propertiesProcessed: 0, errors: [], createdAt: "2026-07-30 10:04",
  };
}

export async function getFtpCredentials(): Promise<FtpCredentials> {
  if (!USE_MOCKS) return request<{ data: FtpCredentials }>("/agent/ftp-credentials").then((r) => r.data);
  await mockDelay(200);
  return ftpCredentialsFor(currentAgentId());
}

export async function updateAgentProfile(patch: Partial<AgentProfile>): Promise<AgentProfile> {
  if (!USE_MOCKS) return request<{ data: AgentProfile }>("/agent/profile", { method: "PUT", body: patch }).then((r) => r.data);
  await mockDelay(500);
  // Merge over the live session user so the panel reflects the edit immediately
  try {
    const raw = localStorage.getItem("r24.session");
    const user = raw ? (JSON.parse(raw) as AgentProfile) : DEMO_AGENT;
    return { ...user, ...patch };
  } catch {
    return { ...DEMO_AGENT, ...patch };
  }
}
