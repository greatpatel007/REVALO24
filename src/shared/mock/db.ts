/* Mock database — dummy data for the UI showcase. Replaced entirely by the Laravel API. */
import type {
  AgentProfile, CityIndexEntry, DailyStat, ImportJob, Invoice, ListingAgent,
  PlacementProduct, Property, SavedSearch, SubscriptionPlan, User,
} from "@/shared/types";
import { COUNTRIES } from "@/shared/lib/constants";

/* Curated Unsplash real-estate photography (DS §07: Unsplash + Pexels imagery). */
const U = (id: string, w = 1000, q = 70) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;

// Client-approved direction "Mediterranean & Sunny": light-flooded modern
// villa, bright blue sky and pool — conveys quality of life + premium
// properties. Calm sky upper-center keeps the headline legible (DS hero rule).
// Self-hosted WebP under /public/hero (Unsplash photo-1600596542815-ffad4c1539a9)
// so LCP is same-origin — Unsplash RTT was the Lighthouse score killer.
const HERO_ASSET = (w: number) => `${import.meta.env.BASE_URL}hero/hero-${w}.webp`;

export const HERO_PHOTO = HERO_ASSET(1280);

/** Responsive hero sources for LCP — local WebP, no third-party CDN. */
export const HERO_PHOTO_SRCSET = [
  `${HERO_ASSET(640)} 640w`,
  `${HERO_ASSET(960)} 960w`,
  `${HERO_ASSET(1280)} 1280w`,
  `${HERO_ASSET(1600)} 1600w`,
].join(", ");

export const HERO_PHOTO_SIZES = "100vw";

const EXTERIORS = [
  U("1600585154340-be6161a56a0c"), // modern family house
  U("1512917774080-9991f1c4c750"), // white contemporary villa
  U("1568605114967-8130f3a36994"), // suburban house with lawn
  U("1570129477492-45c003edd2be"), // classic white house
  U("1580587771525-78b9dba3b914"), // detached house at dusk
  U("1564013799919-ab600027ffc6"), // luxury residence
  U("1600596542815-ffad4c1539a9"), // pool villa
  U("1613490493576-7fde63acd811"), // large modern villa
  U("1613977257363-707ba9348227"), // villa at twilight
  U("1522708323590-d24dbb6b0267"), // city apartment living space
  U("1502672260266-1c1ef2d93688"), // loft apartment
  U("1493809842364-78817add7ffb"), // bright living room
];
const INTERIORS = [
  U("1600607687939-ce8a6c25118c"), // living room
  U("1600566753190-17f0baa2a6c3"), // lounge interior
  U("1556912998-c57cc6b63cd7"),    // kitchen
  U("1484154218962-a197022b5858"), // kitchen / dining
  U("1540518614846-7eded433c457"), // bedroom
  U("1552321554-5fefe8c9ef14"),    // bathroom
];

/** Deterministic gallery per property: one exterior lead + four interiors. */
function gallery(id: number): string[] {
  const lead = EXTERIORS[id % EXTERIORS.length];
  const rest = [0, 1, 2, 3].map((o) => INTERIORS[(id + o) % INTERIORS.length]);
  return [lead, ...rest];
}

/** City imagery for the home "Explore by city" cards; exteriors used as fallback. */
export const CITY_PHOTOS: Record<string, string> = {
  Berlin: U("1560969184-10fe8719e047", 800),
  Paris: U("1502602898657-3e91760cbb34", 800),
  Praha: U("1541849546-216549ae216d", 800),
  Amsterdam: U("1534351590666-13e3e96b5017", 800),
  Madrid: U("1539037116277-4db20889f2d4", 800),
};
export const cityPhoto = (city: string, i: number): string =>
  CITY_PHOTOS[city] ?? EXTERIORS[i % EXTERIORS.length];

export const CITIES: CityIndexEntry[] = [
  { city: "München", country: "Germany", zip: "80331", count: 214 },
  { city: "Berlin", country: "Germany", zip: "10115", count: 348 },
  { city: "Hamburg", country: "Germany", zip: "20095", count: 167 },
  { city: "Praha", country: "Czechia", zip: "110 00", count: 189 },
  { city: "Brno", country: "Czechia", zip: "602 00", count: 74 },
  { city: "Warszawa", country: "Poland", zip: "00-001", count: 231 },
  { city: "Kraków", country: "Poland", zip: "30-001", count: 118 },
  { city: "Amsterdam", country: "Netherlands", zip: "1011", count: 142 },
  { city: "Paris", country: "France", zip: "75001", count: 305 },
  { city: "Madrid", country: "Spain", zip: "28001", count: 198 },
  { city: "Lisboa", country: "Portugal", zip: "1100", count: 121 },
  { city: "Bratislava", country: "Slovakia", zip: "811 01", count: 66 },
  /* Full 13-market coverage (proposal §2: pre-loaded EU markets) */
  { city: "Wien", country: "Austria", zip: "1010", count: 176 },
  { city: "Salzburg", country: "Austria", zip: "5020", count: 41 },
  { city: "Bruxelles", country: "Belgium", zip: "1000", count: 88 },
  { city: "Antwerpen", country: "Belgium", zip: "2000", count: 57 },
  { city: "Roma", country: "Italy", zip: "00184", count: 203 },
  { city: "Milano", country: "Italy", zip: "20121", count: 174 },
  { city: "Budapest", country: "Hungary", zip: "1061", count: 132 },
  { city: "Zagreb", country: "Croatia", zip: "10000", count: 71 },
  { city: "Split", country: "Croatia", zip: "21000", count: 44 },
  { city: "Porto", country: "Portugal", zip: "4050", count: 83 },
  { city: "Barcelona", country: "Spain", zip: "08009", count: 165 },
  { city: "Lyon", country: "France", zip: "69002", count: 96 },
  { city: "Nice", country: "France", zip: "06000", count: 54 },
  { city: "Rotterdam", country: "Netherlands", zip: "3011", count: 78 },
  { city: "Gdańsk", country: "Poland", zip: "80-831", count: 62 },
  { city: "Košice", country: "Slovakia", zip: "040 01", count: 28 },
  { city: "Valencia", country: "Spain", zip: "46004", count: 89 },
];

/** Aggregate inventory index for the home entry points (Sreality pattern) —
    real backend: GET /properties/counts returns these totals. */
export const INVENTORY_TOTAL = CITIES.reduce((sum, c) => sum + c.count, 0);
export const CATEGORY_INDEX: { label: string; kind?: string; href?: string; count: number }[] = [
  { label: "Apartments", kind: "Apartment", count: 1214 },
  { label: "Houses", kind: "House", count: 486 },
  { label: "New Construction", kind: "New Construction", count: 97 },
  { label: "Off-Market", href: "/off-market", count: 38 },
];

export const AMENITIES = ["Balcony", "Garden", "Parking", "Elevator", "AC", "Pool", "Fitted kitchen", "Cellar", "Fibre internet", "Quiet courtyard"];
/** Countries with live inventory — powers the search Country filter.
    All 13 platform markets (constants.ts) carry demo listings, each with its
    own purchase-cost rules (PURCHASE_COSTS). Real backend: GET /locations/countries. */
export const COUNTRY_OPTIONS: string[] = [...COUNTRIES].sort();
export const PROPERTY_TYPES = ["Apartment", "House", "Villa", "Penthouse", "Loft", "New Construction", "Estate", "Commercial"];

function prop(p: Partial<Property> & Pick<Property, "id" | "title" | "listingType" | "price" | "propertyType" | "livingArea" | "rooms" | "bedrooms" | "bathrooms">): Property {
  return {
    slug: `p-${p.id}`,
    description:
      "Bright, well-maintained property in a sought-after location. Renovated with quality materials, excellent transport links and local amenities within walking distance. Energy-efficient heating and a sensible, family-friendly layout.",
    status: "active",
    currency: "EUR",
    amenities: ["Balcony", "Fitted kitchen", "Elevator", "Cellar"],
    location: {
      country: "Germany", countryCode: "DE", city: "München", postalCode: "80331",
      geo: { lat: 48.14, lng: 11.58 },
    },
    media: { images: gallery(p.id!) },
    placement: null,
    offMarket: false,
    agentId: 101,
    createdAt: `2026-07-${String(2 + (p.id! % 24)).padStart(2, "0")}`,
    viewsTotal: 400 + p.id! * 137,
    clicksTotal: 40 + p.id! * 17,
    ...p,
  } as Property;
}

export const PROPERTIES: Property[] = [
  prop({
    id: 1, title: "3-room apartment with balcony", listingType: "buy", price: 485000, propertyType: "Apartment",
    livingArea: 86, rooms: 3, bedrooms: 2, bathrooms: 1, placement: "featured", placementEndsAt: "2026-08-03",
    yearBuilt: 1964, energyRating: "B", energyCertType: "demand", energyValue: 68.4, energySource: "Fernwärme",
    energyCertYear: 2023, floor: "3 of 5",
    media: {
      images: gallery(1),
      /* Demo tour + floor plan so the exposé media strip shows Available */
      videoUrl: "https://www.youtube.com/embed/EngW7tLk6R8",
      floorPlanUrl: U("1503387762-592deb58ef4e", 1400),
      virtualTourUrl: "https://my.matterport.com/show/?m=Zh14WDtkjdC&play=1",
    },
    location: { country: "Germany", countryCode: "DE", county: "Bavaria", city: "München", postalCode: "80804", street: "Schwabing", geo: { lat: 48.16, lng: 11.58 } },
  }),
  prop({
    id: 2, title: "Riverside Residences · 14 units", listingType: "buy", price: 312000, propertyType: "New Construction",
    livingArea: 52, rooms: 2, bedrooms: 1, bathrooms: 1, placement: "top", isNewConstruction: true, energyRating: "A",
    agentId: 102, amenities: ["Balcony", "Elevator", "Parking", "Fitted kitchen"],
    media: {
      images: gallery(2),
      floorPlanUrl: U("1503387762-592deb58ef4e", 1400),
      virtualTourUrl: "https://my.matterport.com/show/?m=SxQL3iGyvQk&play=1",
    },
    location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.09, lng: 14.45 } },
  }),
  prop({ id: 3, title: "Canal-view 2-room apartment", listingType: "rent", price: 1650, propertyType: "Apartment", livingArea: 64, rooms: 2, bedrooms: 1, bathrooms: 1, placement: "featured", energyRating: "C", location: { country: "Netherlands", countryCode: "NL", city: "Amsterdam", postalCode: "1015", street: "Jordaan", geo: { lat: 52.37, lng: 4.88 } } }),
  prop({ id: 4, title: "Private villa · Secret Sale", listingType: "buy", price: 2400000, propertyType: "Villa", livingArea: 340, rooms: 8, bedrooms: 5, bathrooms: 4, offMarket: true, location: { country: "Portugal", countryCode: "PT", city: "Lisboa district", postalCode: "—", geo: { lat: 38.72, lng: -9.14 } } }),
  prop({ id: 5, title: "Sunny 4-room family apartment", listingType: "buy", price: 379000, propertyType: "Apartment", livingArea: 98, rooms: 4, bedrooms: 3, bathrooms: 2, placement: "featured", energyRating: "C", location: { country: "Poland", countryCode: "PL", city: "Warszawa", postalCode: "02-511", street: "Mokotów", geo: { lat: 52.19, lng: 21.02 } } }),
  prop({ id: 6, title: "Industrial loft near Alexanderplatz", listingType: "rent", price: 2100, propertyType: "Loft", livingArea: 84, rooms: 2, bedrooms: 1, bathrooms: 1, placement: "top", placementEndsAt: "2026-08-13", crmLinked: true, energyRating: "D", location: { country: "Germany", countryCode: "DE", city: "Berlin", postalCode: "10178", street: "Mitte", geo: { lat: 52.52, lng: 13.41 } } }),
  prop({ id: 7, title: "Townhouse with garden", listingType: "buy", price: 545000, propertyType: "House", livingArea: 142, rooms: 5, bedrooms: 4, bathrooms: 2, placement: "featured", energyRating: "D", amenities: ["Garden", "Parking", "Fitted kitchen"], location: { country: "Poland", countryCode: "PL", city: "Kraków", postalCode: "30-302", street: "Podgórze", geo: { lat: 50.05, lng: 19.95 } } }),
  prop({ id: 8, title: "Renovated 2+kk near the centre", listingType: "rent", price: 1240, propertyType: "Apartment", livingArea: 58, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "C", agentId: 102, location: { country: "Czechia", countryCode: "CZ", city: "Brno", postalCode: "602 00", street: "Veveří", geo: { lat: 49.2, lng: 16.6 } } }),
  prop({
    id: 9, title: "Penthouse · Salamanca district", listingType: "buy", price: 1150000, propertyType: "Penthouse",
    livingArea: 165, rooms: 5, bedrooms: 3, bathrooms: 3, placement: "featured", energyRating: "B", agentId: 103,
    amenities: ["AC", "Pool", "Elevator", "Parking"],
    media: {
      images: gallery(9),
      videoUrl: "https://www.youtube.com/embed/EngW7tLk6R8",
      virtualTourUrl: "https://my.matterport.com/show/?m=Zh14WDtkjdC&play=1",
    },
    location: { country: "Spain", countryCode: "ES", city: "Madrid", postalCode: "28006", street: "Salamanca", geo: { lat: 40.43, lng: -3.68 } },
  }),
  prop({ id: 10, title: "Haussmann apartment · 6th arr.", listingType: "buy", price: 890000, propertyType: "Apartment", livingArea: 92, rooms: 3, bedrooms: 2, bathrooms: 1, placement: "top", energyRating: "E", agentId: 103, location: { country: "France", countryCode: "FR", city: "Paris", postalCode: "75006", street: "Saint-Germain", geo: { lat: 48.85, lng: 2.33 } } }),
  prop({ id: 11, title: "Wine estate · confidential sale", listingType: "buy", price: 3900000, propertyType: "Estate", livingArea: 620, rooms: 12, bedrooms: 7, bathrooms: 5, offMarket: true, location: { country: "France", countryCode: "FR", city: "Bordeaux region", postalCode: "—", geo: { lat: 44.84, lng: -0.58 } } }),
  prop({ id: 12, title: "Old-town 2-room with river view", listingType: "rent", price: 980, propertyType: "Apartment", livingArea: 55, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "D", location: { country: "Slovakia", countryCode: "SK", city: "Bratislava", postalCode: "811 01", street: "Staré Mesto", geo: { lat: 48.14, lng: 17.11 } } }),
  /* agent's own drafts / sub-units */
  prop({ id: 13, title: "Riverside Residences · Unit 3.02", listingType: "buy", price: 329000, propertyType: "New Construction", livingArea: 58, rooms: 2, bedrooms: 1, bathrooms: 1, floor: 3, masterProjectId: 2, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.091, lng: 14.452 } } }),
  prop({ id: 14, title: "Garden maisonette (draft)", listingType: "buy", price: 610000, propertyType: "House", livingArea: 128, rooms: 4, bedrooms: 3, bathrooms: 2, status: "draft", location: { country: "Germany", countryCode: "DE", city: "Hamburg", postalCode: "20095", geo: { lat: 53.55, lng: 9.99 } } }),
  prop({ id: 15, title: "Sold: 2-room investment flat", listingType: "buy", price: 298000, propertyType: "Apartment", livingArea: 49, rooms: 2, bedrooms: 1, bathrooms: 1, status: "sold", location: { country: "Germany", countryCode: "DE", city: "Berlin", postalCode: "10245", geo: { lat: 52.5, lng: 13.45 } } }),
  /* Riverside Residences (master id 2) sub-units — public new-construction table */
  prop({ id: 16, title: "Riverside Residences · Unit 1.01", listingType: "buy", price: 289000, propertyType: "New Construction", livingArea: 46, rooms: 1, bedrooms: 1, bathrooms: 1, floor: 1, masterProjectId: 2, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.0905, lng: 14.451 } } }),
  prop({ id: 17, title: "Riverside Residences · Unit 2.04", listingType: "buy", price: 355000, propertyType: "New Construction", livingArea: 64, rooms: 3, bedrooms: 2, bathrooms: 1, floor: 2, masterProjectId: 2, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.0908, lng: 14.4515 } } }),
  prop({ id: 18, title: "Riverside Residences · Unit 5.01 · Penthouse", listingType: "buy", price: 498000, propertyType: "New Construction", livingArea: 92, rooms: 4, bedrooms: 3, bathrooms: 2, floor: 5, masterProjectId: 2, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.0912, lng: 14.4525 } } }),
  prop({ id: 19, title: "Riverside Residences · Unit 1.02", listingType: "buy", price: 302000, propertyType: "New Construction", livingArea: 51, rooms: 2, bedrooms: 1, bathrooms: 1, floor: 1, status: "sold", masterProjectId: 2, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "186 00", street: "Karlín", geo: { lat: 50.0906, lng: 14.4512 } } }),

  /* ============================================================
     Extended demo inventory (ids 20+): fills the map (~50 active
     listings), covers all 13 platform countries — each exercising
     its own PURCHASE_COSTS rules — and stresses the UI edge cases:
     full EPC ladder A+→H + missing rating, price extremes, long
     titles, 1-photo galleries, 0/10 amenities, rented status,
     unverified agent, extra off-market, dense city clusters.
     ============================================================ */

  /* ---- Germany (DE: 5% transfer tax + 3.57% buyer commission) ---- */
  prop({ id: 20, title: "Bright 2-room flat near Englischer Garten", listingType: "rent", price: 1850, propertyType: "Apartment", livingArea: 61, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "D", floor: "4 of 6", location: { country: "Germany", countryCode: "DE", city: "München", postalCode: "80802", street: "Schwabing-Ost", geo: { lat: 48.155, lng: 11.594 } } }),
  prop({ id: 21, title: "Family house with south-facing garden", listingType: "buy", price: 725000, propertyType: "House", livingArea: 136, rooms: 5, bedrooms: 4, bathrooms: 2, energyRating: "B", yearBuilt: 2009, landArea: 420, amenities: ["Garden", "Parking", "Fitted kitchen", "Cellar"], location: { country: "Germany", countryCode: "DE", county: "Bavaria", city: "München", postalCode: "81245", street: "Pasing", geo: { lat: 48.148, lng: 11.462 } } }),
  /* Long-title + worst-but-one EPC class + pre-war Altbau edge */
  prop({ id: 22, title: "Charming Altbau apartment with stucco ceilings, original hardwood floors and a west-facing balcony near Boxhagener Platz", listingType: "buy", price: 425000, propertyType: "Apartment", livingArea: 78, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "F", energyCertType: "consumption", energyValue: 192.7, energySource: "Gas", energyCertYear: 2021, yearBuilt: 1905, floor: "2 of 5", location: { country: "Germany", countryCode: "DE", city: "Berlin", postalCode: "10245", street: "Friedrichshain", geo: { lat: 52.509, lng: 13.46 } } }),
  /* Minimal-data edge: one photo, no amenities, short description */
  prop({ id: 23, title: "Compact studio for students", listingType: "rent", price: 780, propertyType: "Apartment", livingArea: 28, rooms: 1, bedrooms: 1, bathrooms: 1, energyRating: "C", amenities: [], description: "Compact, efficient studio close to the U-Bahn.", media: { images: [U("1522708323590-d24dbb6b0267")] }, location: { country: "Germany", countryCode: "DE", city: "Berlin", postalCode: "12047", street: "Neukölln", geo: { lat: 52.489, lng: 13.425 } } }),
  prop({ id: 24, title: "Waterfront flat in HafenCity", listingType: "buy", price: 810000, propertyType: "Apartment", livingArea: 104, rooms: 3, bedrooms: 2, bathrooms: 2, placement: "featured", energyRating: "A", energyCertType: "demand", energyValue: 32.1, energySource: "Wärmepumpe", energyCertYear: 2024, yearBuilt: 2018, amenities: ["Balcony", "Elevator", "Parking", "Fitted kitchen"], location: { country: "Germany", countryCode: "DE", city: "Hamburg", postalCode: "20457", street: "HafenCity", geo: { lat: 53.541, lng: 9.997 } } }),
  prop({ id: 25, title: "Courtyard maisonette in Prenzlauer Berg", listingType: "buy", price: 660000, propertyType: "Apartment", livingArea: 96, rooms: 4, bedrooms: 3, bathrooms: 1, energyRating: "E", crmLinked: true, location: { country: "Germany", countryCode: "DE", city: "Berlin", postalCode: "10405", street: "Prenzlauer Berg", geo: { lat: 52.536, lng: 13.424 } } }),

  /* ---- Austria (AT: 3.5% Grunderwerbsteuer + 3% buyer commission) ---- */
  prop({ id: 26, title: "Altbau 3-room flat by the Naschmarkt", listingType: "buy", price: 590000, propertyType: "Apartment", livingArea: 88, rooms: 3, bedrooms: 2, bathrooms: 1, placement: "featured", energyRating: "C", yearBuilt: 1902, agentId: 104, location: { country: "Austria", countryCode: "AT", city: "Wien", postalCode: "1060", street: "Mariahilf", geo: { lat: 48.198, lng: 16.357 } } }),
  prop({ id: 27, title: "Ringstraße apartment with box windows", listingType: "rent", price: 1450, propertyType: "Apartment", livingArea: 72, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "D", agentId: 104, location: { country: "Austria", countryCode: "AT", city: "Wien", postalCode: "1010", street: "Innere Stadt", geo: { lat: 48.21, lng: 16.372 } } }),
  prop({ id: 28, title: "Chalet-style house with Alps view", listingType: "buy", price: 980000, propertyType: "House", livingArea: 168, rooms: 6, bedrooms: 4, bathrooms: 3, energyRating: "E", landArea: 650, agentId: 104, amenities: ["Garden", "Parking", "Cellar"], location: { country: "Austria", countryCode: "AT", city: "Salzburg", postalCode: "5020", street: "Aigen", geo: { lat: 47.79, lng: 13.07 } } }),

  /* ---- Netherlands (NL: 2% overdrachtsbelasting, no buyer fee) ---- */
  prop({ id: 29, title: "Canal house on the Prinsengracht", listingType: "buy", price: 1280000, propertyType: "House", livingArea: 158, rooms: 5, bedrooms: 3, bathrooms: 2, placement: "top", energyRating: "C", yearBuilt: 1885, location: { country: "Netherlands", countryCode: "NL", city: "Amsterdam", postalCode: "1016", street: "Grachtengordel", geo: { lat: 52.369, lng: 4.884 } } }),
  /* Amenity-max edge: 10 chips wrap on the exposé */
  prop({ id: 30, title: "High-rise 2-room with skyline view", listingType: "rent", price: 1390, propertyType: "Apartment", livingArea: 68, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "A", yearBuilt: 2022, amenities: ["Balcony", "Garden", "Parking", "Elevator", "AC", "Pool", "Fitted kitchen", "Cellar", "Fibre internet", "Quiet courtyard"], location: { country: "Netherlands", countryCode: "NL", city: "Rotterdam", postalCode: "3011", street: "Kop van Zuid", geo: { lat: 51.905, lng: 4.488 } } }),

  /* ---- Belgium (BE: 12.5% registration duty — highest cost caveat) ---- */
  prop({ id: 31, title: "Maison de maître near Parc Léopold", listingType: "buy", price: 640000, propertyType: "House", livingArea: 182, rooms: 6, bedrooms: 4, bathrooms: 2, energyRating: "D", yearBuilt: 1911, agentId: 107, location: { country: "Belgium", countryCode: "BE", city: "Bruxelles", postalCode: "1000", street: "Quartier européen", geo: { lat: 50.842, lng: 4.377 } } }),
  prop({ id: 32, title: "Converted warehouse loft at Het Eilandje", listingType: "rent", price: 1150, propertyType: "Loft", livingArea: 89, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "C", agentId: 107, location: { country: "Belgium", countryCode: "BE", city: "Antwerpen", postalCode: "2000", street: "Eilandje", geo: { lat: 51.229, lng: 4.407 } } }),

  /* ---- France (FR: 5.8% frais de notaire incl. droits) ---- */
  prop({ id: 33, title: "Apartment facing the Champ-de-Mars", listingType: "buy", price: 1650000, propertyType: "Apartment", livingArea: 118, rooms: 4, bedrooms: 3, bathrooms: 2, placement: "featured", energyRating: "C", agentId: 103, location: { country: "France", countryCode: "FR", city: "Paris", postalCode: "75007", street: "7e arr.", geo: { lat: 48.856, lng: 2.298 } } }),
  /* Luxury-rent edge: five-digit monthly rent formatting */
  prop({ id: 34, title: "Furnished duplex · Place Vendôme", listingType: "rent", price: 8500, propertyType: "Penthouse", livingArea: 210, rooms: 5, bedrooms: 3, bathrooms: 3, energyRating: "B", agentId: 103, amenities: ["AC", "Elevator", "Fitted kitchen", "Fibre internet"], location: { country: "France", countryCode: "FR", city: "Paris", postalCode: "75001", street: "1er arr.", geo: { lat: 48.867, lng: 2.329 } } }),
  prop({ id: 35, title: "Presqu'île 3-room with Rhône view", listingType: "buy", price: 430000, propertyType: "Apartment", livingArea: 84, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "C", location: { country: "France", countryCode: "FR", city: "Lyon", postalCode: "69002", street: "Presqu'île", geo: { lat: 45.757, lng: 4.832 } } }),
  /* Price-ceiling edge: 8-digit price, €12.5M pill on the map */
  prop({ id: 36, title: "Belle Époque villa above the Baie des Anges", listingType: "buy", price: 12500000, propertyType: "Villa", livingArea: 540, rooms: 11, bedrooms: 7, bathrooms: 6, placement: "top", energyRating: "A", landArea: 2100, agentId: 103, amenities: ["Pool", "Garden", "Parking", "AC"], description: "Restored Belle Époque villa on the hill of Cimiez: seven suites, panoramic sea terraces, a heated infinity pool and a self-contained guest house set in 2,100 m² of mature Mediterranean gardens. Full staff quarters, a wine cellar and gated grounds complete a rare Riviera estate.", location: { country: "France", countryCode: "FR", city: "Nice", postalCode: "06000", street: "Cimiez", geo: { lat: 43.717, lng: 7.272 } } }),

  /* ---- Spain (ES: 8% ITP) ---- */
  prop({ id: 37, title: "Modernista flat on the Eixample grid", listingType: "buy", price: 595000, propertyType: "Apartment", livingArea: 102, rooms: 4, bedrooms: 3, bathrooms: 2, placement: "featured", energyRating: "D", yearBuilt: 1920, agentId: 103, location: { country: "Spain", countryCode: "ES", city: "Barcelona", postalCode: "08009", street: "Eixample", geo: { lat: 41.394, lng: 2.166 } } }),
  prop({ id: 38, title: "Terrace flat in the Gothic Quarter", listingType: "rent", price: 1750, propertyType: "Apartment", livingArea: 76, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "C", agentId: 103, location: { country: "Spain", countryCode: "ES", city: "Barcelona", postalCode: "08002", street: "Barri Gòtic", geo: { lat: 41.382, lng: 2.176 } } }),
  prop({ id: 39, title: "Penthouse by the Turia gardens", listingType: "buy", price: 340000, propertyType: "Penthouse", livingArea: 95, rooms: 3, bedrooms: 2, bathrooms: 2, energyRating: "B", amenities: ["Balcony", "AC", "Elevator", "Parking"], location: { country: "Spain", countryCode: "ES", city: "Valencia", postalCode: "46004", street: "Ruzafa", geo: { lat: 39.465, lng: -0.372 } } }),

  /* ---- Portugal (PT: 6% IMT) ---- */
  prop({ id: 40, title: "Azulejo townhouse flat in Alfama", listingType: "buy", price: 520000, propertyType: "Apartment", livingArea: 85, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "D", yearBuilt: 1930, location: { country: "Portugal", countryCode: "PT", city: "Lisboa", postalCode: "1100", street: "Alfama", geo: { lat: 38.712, lng: -9.13 } } }),
  prop({ id: 41, title: "Douro riverfront 2-bedroom", listingType: "buy", price: 385000, propertyType: "Apartment", livingArea: 92, rooms: 3, bedrooms: 2, bathrooms: 2, placement: "featured", energyRating: "B", location: { country: "Portugal", countryCode: "PT", city: "Porto", postalCode: "4050", street: "Ribeira", geo: { lat: 41.141, lng: -8.615 } } }),
  prop({ id: 42, title: "Studio in the Bolhão district", listingType: "rent", price: 950, propertyType: "Apartment", livingArea: 41, rooms: 1, bedrooms: 1, bathrooms: 1, energyRating: "E", location: { country: "Portugal", countryCode: "PT", city: "Porto", postalCode: "4000", street: "Bolhão", geo: { lat: 41.15, lng: -8.606 } } }),

  /* ---- Italy (IT: 4% registration + 3% buyer commission) ---- */
  prop({ id: 43, title: "Trastevere apartment with roof terrace", listingType: "buy", price: 780000, propertyType: "Apartment", livingArea: 110, rooms: 4, bedrooms: 3, bathrooms: 2, energyRating: "E", yearBuilt: 1898, agentId: 105, location: { country: "Italy", countryCode: "IT", city: "Roma", postalCode: "00153", street: "Trastevere", geo: { lat: 41.888, lng: 12.47 } } }),
  /* Rented-status edge: inactive exposé banner, excluded from search */
  prop({ id: 44, title: "Design 2-room by the Navigli canals", listingType: "rent", price: 2300, propertyType: "Apartment", livingArea: 74, rooms: 2, bedrooms: 1, bathrooms: 1, status: "rented", energyRating: "B", agentId: 105, location: { country: "Italy", countryCode: "IT", city: "Milano", postalCode: "20144", street: "Navigli", geo: { lat: 45.451, lng: 9.174 } } }),
  prop({ id: 45, title: "Brera 3-room with concierge", listingType: "buy", price: 690000, propertyType: "Apartment", livingArea: 89, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "C", agentId: 105, amenities: ["Elevator", "AC", "Fitted kitchen"], location: { country: "Italy", countryCode: "IT", city: "Milano", postalCode: "20121", street: "Brera", geo: { lat: 45.472, lng: 9.188 } } }),
  prop({ id: 46, title: "Monti district 2-room near the Colosseum", listingType: "rent", price: 1600, propertyType: "Apartment", livingArea: 66, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "D", agentId: 105, location: { country: "Italy", countryCode: "IT", city: "Roma", postalCode: "00184", street: "Monti", geo: { lat: 41.895, lng: 12.494 } } }),

  /* ---- Czechia (CZ: transfer tax abolished 2020 — cheapest buy-side) ---- */
  /* Best-class edge: A+ passive house tops the EPC ladder */
  prop({ id: 47, title: "A+ passive townhouse in Vinohrady", listingType: "buy", price: 685000, propertyType: "House", livingArea: 148, rooms: 5, bedrooms: 4, bathrooms: 2, energyRating: "A+", yearBuilt: 2026, isNewConstruction: true, agentId: 102, amenities: ["Garden", "Parking", "Fitted kitchen", "Fibre internet"], location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "120 00", street: "Vinohrady", geo: { lat: 50.075, lng: 14.445 } } }),
  prop({ id: 48, title: "Žižkov 2+1 with TV-tower view", listingType: "rent", price: 1100, propertyType: "Apartment", livingArea: 59, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "C", agentId: 102, location: { country: "Czechia", countryCode: "CZ", city: "Praha", postalCode: "130 00", street: "Žižkov", geo: { lat: 50.083, lng: 14.451 } } }),

  /* ---- Slovakia (SK: no transfer tax) ---- */
  /* Low-rent edge: three-digit monthly price pill */
  prop({ id: 49, title: "Student studio by the university", listingType: "rent", price: 350, propertyType: "Apartment", livingArea: 24, rooms: 1, bedrooms: 1, bathrooms: 1, energyRating: "F", amenities: ["Fibre internet"], location: { country: "Slovakia", countryCode: "SK", city: "Košice", postalCode: "040 01", street: "Staré Mesto", geo: { lat: 48.72, lng: 21.258 } } }),
  prop({ id: 50, title: "Panelák 3-room after full renovation", listingType: "buy", price: 295000, propertyType: "Apartment", livingArea: 71, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "C", location: { country: "Slovakia", countryCode: "SK", city: "Bratislava", postalCode: "821 08", street: "Ružinov", geo: { lat: 48.153, lng: 17.156 } } }),

  /* ---- Poland (PL: 2% PCC) ---- */
  prop({ id: 51, title: "Praga loft in a converted vodka factory", listingType: "buy", price: 415000, propertyType: "Loft", livingArea: 88, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "C", crmLinked: true, location: { country: "Poland", countryCode: "PL", city: "Warszawa", postalCode: "03-736", street: "Praga-Północ", geo: { lat: 52.253, lng: 21.036 } } }),
  prop({ id: 52, title: "Seaside apartment near the Old Crane", listingType: "buy", price: 465000, propertyType: "Apartment", livingArea: 82, rooms: 3, bedrooms: 2, bathrooms: 1, placement: "featured", energyRating: "B", yearBuilt: 2019, location: { country: "Poland", countryCode: "PL", city: "Gdańsk", postalCode: "80-831", street: "Główne Miasto", geo: { lat: 54.35, lng: 18.653 } } }),
  prop({ id: 53, title: "2-room flat by Łazienki Park", listingType: "rent", price: 1150, propertyType: "Apartment", livingArea: 54, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "B", location: { country: "Poland", countryCode: "PL", city: "Warszawa", postalCode: "00-460", street: "Śródmieście", geo: { lat: 52.215, lng: 21.035 } } }),

  /* ---- Hungary (HU: 4% duty) ---- */
  /* Worst-class edge: H closes the EPC ladder */
  prop({ id: 54, title: "Andrássy-side flat awaiting renovation", listingType: "buy", price: 450000, propertyType: "Apartment", livingArea: 124, rooms: 4, bedrooms: 3, bathrooms: 1, energyRating: "H", yearBuilt: 1896, agentId: 106, location: { country: "Hungary", countryCode: "HU", city: "Budapest", postalCode: "1061", street: "Terézváros", geo: { lat: 47.503, lng: 19.06 } } }),
  prop({ id: 55, title: "Danube-view 2-room in the Jewish Quarter", listingType: "rent", price: 890, propertyType: "Apartment", livingArea: 58, rooms: 2, bedrooms: 1, bathrooms: 1, energyRating: "D", agentId: 106, location: { country: "Hungary", countryCode: "HU", city: "Budapest", postalCode: "1074", street: "Erzsébetváros", geo: { lat: 47.498, lng: 19.066 } } }),
  /* Extra off-market: gated detail + hub card */
  prop({ id: 56, title: "Buda Castle district residence · discreet sale", listingType: "buy", price: 5600000, propertyType: "Estate", livingArea: 480, rooms: 10, bedrooms: 6, bathrooms: 5, offMarket: true, agentId: 106, location: { country: "Hungary", countryCode: "HU", city: "Budapest district I", postalCode: "—", geo: { lat: 47.496, lng: 19.037 } } }),

  /* ---- Croatia (HR: 3% RETT) ---- */
  prop({ id: 57, title: "Upper Town 3-room with loggia", listingType: "buy", price: 385000, propertyType: "Apartment", livingArea: 90, rooms: 3, bedrooms: 2, bathrooms: 1, energyRating: "C", agentId: 106, location: { country: "Croatia", countryCode: "HR", city: "Zagreb", postalCode: "10000", street: "Gornji Grad", geo: { lat: 45.816, lng: 15.973 } } }),
  /* Near-worst EPC edge: G-rated heritage stone build */
  prop({ id: 58, title: "Stone villa inside Diocletian's Palace walls", listingType: "buy", price: 1350000, propertyType: "Villa", livingArea: 240, rooms: 7, bedrooms: 5, bathrooms: 3, energyRating: "G", yearBuilt: 1899, landArea: 310, agentId: 106, location: { country: "Croatia", countryCode: "HR", city: "Split", postalCode: "21000", street: "Stari Grad", geo: { lat: 43.508, lng: 16.44 } } }),
  /* Missing-EPC edge: card and exposé render without a class badge */
  prop({ id: 59, title: "Sea-view flat a short walk from Bačvice beach", listingType: "rent", price: 1500, propertyType: "Apartment", livingArea: 77, rooms: 3, bedrooms: 2, bathrooms: 1, agentId: 106, amenities: ["Balcony", "AC", "Parking"], location: { country: "Croatia", countryCode: "HR", city: "Split", postalCode: "21000", street: "Bačvice", geo: { lat: 43.504, lng: 16.451 } } }),
];

/* ---------------- Users ---------------- */

export const DEMO_PRIVATE: User = {
  id: 201, role: "private", name: "Lena Novak", email: "lena@example.eu",
  locale: "en", verified: true, mfaEnabled: false, createdAt: "2026-05-11",
};

export const DEMO_AGENT: AgentProfile = {
  id: 101, role: "agent", name: "Anna Krämer", email: "anna@kraemer-immo.de",
  locale: "de", verified: true, mfaEnabled: true, createdAt: "2026-03-02",
  companyName: "Krämer Immobilien GmbH", isDeveloper: true,
  vatId: "DE812345678", vatValidated: true,
  contactPerson: "Anna Krämer",
  addressStreet: "Leopoldstraße 12",
  addressPostalCode: "80802",
  addressCity: "München",
  addressCountry: "Germany",
  phone: "+49 89 1234 5678",
  managingDirector: "Anna Krämer",
  regulatoryAuthority: "IHK München (34c GewO)",
  commercialRegisterNo: "HRB 234561",
  verificationState: "approved",
  /* Completed verified-agent assets — profile must not look like an empty onboarding form */
  logoUrl: U("1560518883-ce09059eeffa", 400),
  documents: {
    license: { name: "34c-GewO-Erlaubnis.pdf", url: U("1586281380349-632531db7ed4", 900) },
    register: { name: "HRB-234561-Auszug.pdf", url: U("1450101499163-c8848c66ca85", 900) },
  },
};

/* Second approved agent — Starter plan over quota, CZ reverse-charge billing,
   CZK display estimates. Owns the Praha/Brno listings (agentId 102). */
export const DEMO_AGENT_PETR: AgentProfile = {
  id: 102, role: "agent", name: "Petr Svoboda", email: "petr@vltava-reality.cz",
  locale: "cs", verified: true, mfaEnabled: false, createdAt: "2026-04-18",
  companyName: "Vltava Reality s.r.o.", isDeveloper: true,
  vatId: "CZ27082440", vatValidated: true,
  contactPerson: "Petr Svoboda",
  addressStreet: "Rohanské nábřeží 23",
  addressPostalCode: "186 00",
  addressCity: "Praha",
  addressCountry: "Czechia",
  phone: "+420 601 555 214",
  managingDirector: "Petr Svoboda",
  regulatoryAuthority: "Živnostenský úřad Praha 8",
  commercialRegisterNo: "C 145632, Městský soud v Praze",
  verificationState: "approved",
  logoUrl: U("1486406146926-c627a92ad1ab", 400),
  documents: {
    license: { name: "zivnostensky-list.pdf", url: U("1586281380349-632531db7ed4", 900) },
    register: { name: "vypis-OR.pdf", url: U("1450101499163-c8848c66ca85", 900) },
  },
};

/* Fresh agent who has completed DOI but NOT the Verification Gate — restricted
   dashboard, mandatory profile form + licence upload before any listing.
   Also the profile a newly registered agent adopts after verification. */
export const DEMO_AGENT_SOFIA: AgentProfile = {
  id: 108, role: "agent", name: "Sofia Almeida", email: "sofia@atlantico-imo.pt",
  locale: "pt", verified: true, mfaEnabled: false, createdAt: "2026-07-28",
  companyName: "",
  isDeveloper: false,
  verificationState: "incomplete",
};

export const DEMO_AGENTS: AgentProfile[] = [DEMO_AGENT, DEMO_AGENT_PETR, DEMO_AGENT_SOFIA];

/* Public listing-agent directory — the card a visitor sees on an exposé.
   Bound via Property.agentId so contact blocks never show made-up people. */
export const LISTING_AGENTS: Record<number, ListingAgent> = {
  101: { id: 101, name: "Anna Krämer", company: "Krämer Immobilien GmbH", verified: true, languages: ["DE", "EN"] },
  102: { id: 102, name: "Petr Svoboda", company: "Vltava Reality s.r.o.", verified: true, languages: ["CS", "EN", "DE"] },
  103: { id: 103, name: "María Ferrer", company: "Ferrer & Partners Estates", verified: true, languages: ["ES", "EN", "FR"] },
  104: { id: 104, name: "Lukas Steiner", company: "Steiner Wohnen GmbH", verified: true, languages: ["DE", "EN"] },
  105: { id: 105, name: "Giulia Bellini", company: "Bellini Immobiliare S.r.l.", verified: true, languages: ["IT", "EN"] },
  106: { id: 106, name: "Márton Kovács", company: "Danubia Estates Kft.", verified: true, languages: ["HU", "EN", "DE"] },
  107: { id: 107, name: "Sofie Peeters", company: "Peeters Vastgoed BV", verified: false, languages: ["NL", "FR", "EN"] },
};

/* ---------------- Private user data ---------------- */

export const FAVORITES_SEED = [1, 5, 9];

export const SAVED_SEARCHES: SavedSearch[] = [
  { id: 1, label: "Buy · München · up to €550k", filters: { type: "buy", q: "München", priceMax: 550000 }, createdAt: "2026-06-20", newMatches: 3, alertFrequency: "daily" },
  { id: 2, label: "Rent · Praha · 2+ rooms", filters: { type: "rent", q: "Praha", bedroomsMin: 1 }, createdAt: "2026-07-02", newMatches: 0, alertFrequency: "weekly" },
];

/* ---------------- Subscription & billing ---------------- */

export const PLANS: SubscriptionPlan[] = [
  { id: 1, name: "Starter", frequency: "monthly", priceEur: 49, listingQuota: 3, aiCredits: 10, featuredEligible: false, notes: "For independent agents" },
  { id: 2, name: "Professional", frequency: "monthly", priceEur: 149, listingQuota: 25, aiCredits: 60, featuredEligible: true, notes: "For growing agencies" },
  { id: 3, name: "Enterprise", frequency: "monthly", priceEur: 399, listingQuota: 200, aiCredits: 300, featuredEligible: true, notes: "Agencies & developers" },
];

export const PLACEMENTS: PlacementProduct[] = [
  { id: 1, tier: "featured", label: "Featured · 14 days", durationDays: 14, priceEur: 29 },
  { id: 2, tier: "featured", label: "Featured · 30 days", durationDays: 30, priceEur: 49 },
  { id: 3, tier: "top", label: "Top · 14 days", durationDays: 14, priceEur: 59 },
  { id: 4, tier: "top", label: "Top · 30 days", durationDays: 30, priceEur: 99 },
];

/* Invoices per agent. Anna is a DE company billed by Manageer Europe GmbH (DE)
   → domestic 19% USt. Petr is a VIES-validated CZ company → §13b reverse
   charge, 0% on the invoice. amountEur is the NET amount. */
export const INVOICES_BY_AGENT: Record<number, Invoice[]> = {
  101: [
    { id: "INV-2026-0107", date: "2026-07-01", description: "Professional plan — July 2026", amountEur: 149, vatRate: 19, reverseCharge: false, pdfUrl: "#", kind: "subscription" },
    { id: "INV-2026-0093", date: "2026-06-14", description: "Top placement · 30 days — Industrial loft near Alexanderplatz", amountEur: 99, vatRate: 19, reverseCharge: false, pdfUrl: "#", kind: "placement", propertyId: 6 },
    { id: "INV-2026-0088", date: "2026-05-20", description: "Featured · 14 days — 3-room apartment with balcony", amountEur: 29, vatRate: 19, reverseCharge: false, pdfUrl: "#", kind: "placement", propertyId: 1 },
    { id: "INV-2026-0061", date: "2026-06-01", description: "Professional plan — June 2026", amountEur: 149, vatRate: 19, reverseCharge: false, pdfUrl: "#", kind: "subscription" },
    /* First Professional period after upgrade — EUROPA25 applied at checkout */
    { id: "INV-2026-0031", date: "2026-03-02", description: "Professional plan — March 2026 (upgrade)", amountEur: 111.75, vatRate: 19, reverseCharge: false, pdfUrl: "#", kind: "subscription", promoCode: "EUROPA25", discountPercent: 25 },
  ],
  102: [
    { id: "INV-2026-0102", date: "2026-07-01", description: "Starter plan — July 2026", amountEur: 49, vatRate: 0, reverseCharge: true, pdfUrl: "#", kind: "subscription" },
    { id: "INV-2026-0071", date: "2026-06-01", description: "Starter plan — June 2026", amountEur: 49, vatRate: 0, reverseCharge: true, pdfUrl: "#", kind: "subscription" },
    /* Initial Starter purchase — EUROPA25 applied at checkout */
    { id: "INV-2026-0048", date: "2026-04-18", description: "Starter plan — April 2026", amountEur: 36.75, vatRate: 0, reverseCharge: true, pdfUrl: "#", kind: "subscription", promoCode: "EUROPA25", discountPercent: 25 },
  ],
  108: [],
};

/* Subscription base per agent — listingsUsed is computed live in the API
   from the agent's active listings. Petr: Starter with 4 active listings
   against a quota of 3 (over-quota edge). Sofia: fresh Starter, untouched. */
export const SUBSCRIPTION_BASE: Record<number, { planId: number; planName: string; status: "active" | "grace" | "inactive"; startedAt: string; renewsAt: string; listingQuota: number; aiCreditsUsed: number; aiCredits: number }> = {
  101: { planId: 2, planName: "Professional", status: "active", startedAt: "2026-03-02", renewsAt: "2026-08-01", listingQuota: 25, aiCreditsUsed: 14, aiCredits: 60 },
  102: { planId: 1, planName: "Starter", status: "active", startedAt: "2026-04-18", renewsAt: "2026-08-18", listingQuota: 3, aiCreditsUsed: 10, aiCredits: 10 },
  108: { planId: 1, planName: "Starter", status: "active", startedAt: "2026-07-28", renewsAt: "2026-08-28", listingQuota: 3, aiCreditsUsed: 0, aiCredits: 10 },
};

/* ---------------- Imports ---------------- */

export const IMPORT_JOBS_BY_AGENT: Record<number, ImportJob[]> = {
  101: [
    { id: 31, fileName: "openimmo_full_2026-07-27.zip", source: "onOffice", operation: "FULL", status: "completed", propertiesProcessed: 18, errors: [], createdAt: "2026-07-27 04:12" },
    { id: 30, fileName: "delta_2026-07-25.zip", source: "onOffice", operation: "DELTA", status: "completed", propertiesProcessed: 3, errors: [], createdAt: "2026-07-25 04:10" },
    { id: 29, fileName: "kyero_export.zip", source: "Kyero", operation: "FULL", status: "failed", propertiesProcessed: 0, errors: ["Image ref missing for object ES-2214", "Schema fallback used (v1.2.5)"], createdAt: "2026-07-22 11:47" },
  ],
  102: [
    { id: 27, fileName: "vltava_full_2026-07-20.zip", source: "Manual ZIP", operation: "FULL", status: "completed", propertiesProcessed: 4, errors: [], createdAt: "2026-07-20 09:31" },
  ],
  108: [],
};

export function ftpCredentialsFor(agentId: number) {
  return { host: "import.revalo24.eu", port: 22, username: `agent_${agentId}`, protocol: "SFTP" as const, directory: "/inbox" };
}

/* ---------------- Stats ---------------- */

/** scale 1 = Anna's traffic; smaller portfolios get proportionally less.
    scale 0 yields an all-zero series (fresh agent → chart empty state). */
export function dailyStats(scale = 1): DailyStat[] {
  const out: DailyStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 6, 29 - i);
    const wave = Math.round(40 + 30 * Math.sin(i / 4) + (i % 7 === 0 ? 25 : 0));
    out.push({
      date: d.toISOString().slice(0, 10),
      views: scale === 0 ? 0 : Math.max(1, Math.round(scale * Math.max(8, wave + ((i * 13) % 17)))),
      clicks: scale === 0 ? 0 : Math.max(0, Math.round(scale * Math.max(2, Math.round(wave / 4) + ((i * 7) % 9)))),
    });
  }
  return out;
}
