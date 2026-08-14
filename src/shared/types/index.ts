/* ============================================================
   REVALO24 domain types — mirror the Laravel API v1 resources.
   Backend team: these shapes are the contract the UI consumes;
   they follow Laravel API Resource conventions (snake_case kept
   where the proposal names fields, camelCase for UI-only bits).
   ============================================================ */

export type Locale = "de" | "en" | "fr" | "es" | "pt" | "nl" | "cs" | "pl" | "sk";

export type Role = "visitor" | "private" | "agent";

export type ListingType = "buy" | "rent";
export type PropertyStatus = "active" | "sold" | "rented" | "draft";
export type PlacementTier = "featured" | "top" | null;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PropertyLocation {
  country: string;
  countryCode: string;
  county?: string;
  city: string;
  postalCode: string;
  street?: string;
  geo: GeoPoint;
}

export interface PropertyMedia {
  images: string[];
  videoUrl?: string;
  floorPlanUrl?: string;
  /** Matterport / 3D walkthrough embed URL */
  virtualTourUrl?: string;
}

export interface Property {
  id: number;
  slug: string;
  title: string;
  description: string;
  listingType: ListingType;
  status: PropertyStatus;
  price: number; // EUR — 100% EUR fiscal base per proposal §4.1
  currency: "EUR";
  propertyType: string;
  livingArea: number;
  landArea?: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  /** Storey — number for New Construction sub-units, free text (e.g. "3 of 5") otherwise */
  floor?: number | string;
  yearBuilt?: number;
  energyRating?: string;
  /* GEG §87 energy certificate — German listings must disclose these in
     advertisements: certificate type, final energy value, main energy
     source and certificate issue year. */
  energyCertType?: "demand" | "consumption"; // Bedarfsausweis / Verbrauchsausweis
  energyValue?: number;                      // kWh/(m²·a)
  energySource?: string;                     // e.g. Gas, Fernwärme, Wärmepumpe
  energyCertYear?: number;
  amenities: string[];
  location: PropertyLocation;
  media: PropertyMedia;
  placement: PlacementTier;
  /** ISO date when the active placement expires (null/undefined = none) */
  placementEndsAt?: string | null;
  isNewConstruction?: boolean;
  masterProjectId?: number | null;
  offMarket: boolean;
  crmLinked?: boolean; // manual edits overridden by next CRM sync (§3.4.3)
  agentId: number;
  createdAt: string;
  viewsTotal?: number;
  /** Contact / marker clicks attributed to this listing (agent analytics). */
  clicksTotal?: number;
}

export interface PropertyFilters {
  type?: ListingType;
  q?: string;
  country?: string;
  propertyType?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  bedroomsMin?: number;
  /** Minimum energy-efficiency class — matches this class or better (A–H) */
  energyClass?: string;
  /** Every selected amenity must be present on the listing */
  amenities?: string[];
  radiusKm?: 5 | 10 | 25 | 50;
  sort?: "new" | "price_asc" | "price_desc";
  page?: number;
  perPage?: number;
}

/** Laravel paginator envelope */
export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CityIndexEntry {
  city: string;
  country: string;
  zip: string;
  count: number;
}

/* ---------------- Users & auth ---------------- */

export interface User {
  id: number;
  role: Exclude<Role, "visitor">;
  name: string;
  email: string;
  locale: Locale;
  verified: boolean; // DOI completed
  mfaEnabled: boolean;
  /** §3.2.2 — MFA via authenticator app or SMS OTP */
  mfaMethod?: "app" | "sms";
  createdAt: string;
}

/** Public-facing agent card shown on an exposé (GET /agents/{id}/public) */
export interface ListingAgent {
  id: number;
  name: string;
  company: string;
  verified: boolean;
  /** Languages the agent speaks, as short codes for display (DE, EN, …) */
  languages: string[];
}

/** Uploaded verification document (licence / register extract) on the agent profile */
export interface AgentVerificationDoc {
  name: string;
  /** Preview URL (mock: image; live API may return a signed PDF URL) */
  url: string;
}

export interface AgentProfile extends User {
  role: "agent";
  companyName: string;
  isDeveloper: boolean; // can create New Construction master projects; admin-assigned, never self-service
  vatId?: string;
  vatValidated?: boolean;
  /* Wizard step "Company" (registration spec file 04 §2) */
  contactPerson?: string;
  addressStreet?: string;
  addressPostalCode?: string;
  addressCity?: string;
  addressCountry?: string; // one of the 13 platform countries; drives VAT/compliance
  phone?: string;          // E.164
  logoUrl?: string;
  /* Wizard step "Licence & KYC" — 34c GewO mandatory imprint fields (§5.2) */
  managingDirector?: string;
  regulatoryAuthority?: string;
  commercialRegisterNo?: string;
  /** KYC uploads — licence required, register extract optional */
  documents?: {
    license?: AgentVerificationDoc;
    register?: AgentVerificationDoc;
  };
  /* Admin "Verify Agent" master toggle state */
  verificationState: "incomplete" | "pending" | "approved" | "rejected";
}

export interface AuthSession {
  token: string; // Sanctum bearer token
  user: User | AgentProfile;
}

/* Signup fields per registration spec (file 04): salutation + split name (DACH),
   preferred language defaulting from the URL locale, optional country/phone for
   B2C. Confirm-password is client-side only. Consent timestamp + IP are logged
   server-side on submit — no UI fields. */
export interface RegisterPayload {
  role: "private" | "agent";
  salutation?: "herr" | "frau" | "divers";
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  locale: Locale;          // preferred language (9), defaults from URL prefix
  country?: string;        // B2C optional; agent country captured in wizard
  phone?: string;          // B2C optional — required only for SMS-OTP MFA
  consentTerms: boolean;   // must be explicitly true (GDPR §5.1)
  consentPrivacy: boolean; // must be explicitly true
  companyName?: string;    // agent only, required
}

/* ---------------- Private user ---------------- */

/** Email-alert cadence for saved searches (IS24 Suchauftrag / Sreality alerts) */
export type AlertFrequency = "instant" | "daily" | "weekly" | "off";

export interface SavedSearch {
  id: number;
  label: string;
  filters: PropertyFilters;
  createdAt: string;
  newMatches: number;
  alertFrequency: AlertFrequency;
}

export interface Inquiry {
  id: number;
  propertyId: number;
  propertyTitle: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  /** Buyer asked to schedule a viewing via the contact form */
  wantTour?: boolean;
  tourPreference?: string;
  status: "sent" | "replied";
  createdAt: string;
}

export type LeadKind = "valuation" | "tour";

/** Home valuation / schedule-tour lead capture (mock until backend wires POST /leads). */
export interface LeadRequest {
  id: number;
  kind: LeadKind;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  addressOrListing?: string;
  propertyId?: number;
  locale: Locale;
  createdAt: string;
  consent: true;
}

/* ---------------- Subscriptions & billing ---------------- */

export interface SubscriptionPlan {
  id: number;
  name: string;
  frequency: "monthly" | "yearly";
  priceEur: number;
  listingQuota: number;
  aiCredits: number;
  featuredEligible: boolean;
  notes?: string;
}

export interface AgentSubscription {
  planId: number;
  planName: string;
  status: "active" | "grace" | "inactive";
  startedAt: string;
  renewsAt: string;
  listingsUsed: number;
  listingQuota: number;
  aiCreditsUsed: number;
  aiCredits: number;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  /** NET amount after any promo discount */
  amountEur: number;
  vatRate: number; // 19 DE domestic, 0 reverse-charge B2B, country rate B2C OSS
  reverseCharge: boolean;
  pdfUrl: string;
  /** Promo applied at plan purchase / upgrade checkout, if any */
  promoCode?: string;
  /** Percent off first period when promoCode is set */
  discountPercent?: number;
  /** Distinguishes plan renewals from one-off placement purchases */
  kind?: "subscription" | "placement";
  /** Listing boosted when kind === "placement" */
  propertyId?: number;
}

export interface PlacementProduct {
  id: number;
  tier: "featured" | "top";
  label: string;
  durationDays: number;
  priceEur: number;
}

/* ---------------- AI Exposé Optimizer ---------------- */

export interface ExposeRequest {
  sourceLanguage: Locale;
  rawDescription: string;
  propertyId?: number;
}

export interface ExposeResult {
  language: Locale;
  headline: string;
  keyFeatures: string[];
  description: string;
  callToAction: string;
}

/* ---------------- OpenImmo / CRM import ---------------- */

export interface ImportJob {
  id: number;
  fileName: string;
  source: "onOffice" | "FlowFact" | "Propstack" | "Kyero" | "Green-Acres" | "Manual ZIP" | "REST Bridge";
  operation: "FULL" | "DELTA" | "DELETE";
  status: "queued" | "processing" | "completed" | "failed";
  propertiesProcessed: number;
  errors: string[];
  createdAt: string;
}

export interface FtpCredentials {
  host: string;
  port: number;
  username: string;
  protocol: "SFTP";
  directory: string;
}

/* ---------------- Stats ---------------- */

export interface DailyStat {
  date: string;
  views: number;
  clicks: number;
}

export interface AgentDashboardStats {
  totalProperties: number;
  activeCount: number;
  soldCount: number;
  inquiriesTotal: number;
  daily: DailyStat[]; // last 30 days
}

/** Per-listing traffic row for the analytics drill-down. */
export interface ListingTrafficRow {
  id: number;
  title: string;
  status: PropertyStatus;
  city: string;
  country: string;
  viewsTotal: number;
  clicksTotal: number;
}

/* ---------------- CMS ---------------- */

export type CmsPage = "about" | "contact" | "imprint" | "terms" | "privacy" | "cookies";

export interface CmsContent {
  page: CmsPage;
  locale: Locale;
  localeFallback: boolean; // true when requested locale missing → EN served
  title: string;
  updatedAt: string;
  blocks: { heading?: string; body: string }[];
}
