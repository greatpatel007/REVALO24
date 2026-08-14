/* CMS services — legal & static pages rendered per page/locale (§3.4.1 CMS).
   Real endpoint: GET /cms/{page}?locale={locale}
   Backend returns localeFallback=true when the requested translation
   is missing and EN content is served instead.                      */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import type { CmsContent, CmsPage, Locale } from "@/shared/types";

const EN_CONTENT: Record<CmsPage, Omit<CmsContent, "locale" | "localeFallback">> = {
  about: {
    page: "about", title: "About REVALO24", updatedAt: "2026-06-12",
    blocks: [
      { body: "REVALO24 is a multilingual property marketplace built for the European Economic Area. We connect buyers, tenants and verified agents across borders — one listing, published in nine languages." },
      { heading: "What makes us different", body: "Cross-border radius search, AI-generated exposés reviewed per language, and a secure Off-Market channel for confidential sales. Agents are verified through a 34c GewO onboarding process, so every listing comes from an accountable, licensed professional." },
      { heading: "Built for Europe", body: "Nine languages, EU hosting, privacy-preserving cookie defaults and WCAG AA accessibility are the baseline, not add-ons. Content on this page is CMS-managed and rendered in your locale." },
    ],
  },
  contact: {
    page: "contact", title: "Contact Us", updatedAt: "2026-07-30",
    blocks: [{ body: "Manageer Europe GmbH · Siebenhäusergasse 7, D-35423 Lich, Germany · hello@revalo24.eu · +49 30 1234 5678-0" }],
  },
  /* Official corporate data supplied by the client (email, 2026-07) */
  imprint: {
    page: "imprint", title: "Imprint (Impressum)", updatedAt: "2026-07-30",
    blocks: [
      { heading: "Operator", body: "Manageer Europe GmbH · Siebenhäusergasse 7, D-35423 Lich, Germany" },
      { heading: "Managing Director", body: "Mirko Krampl" },
      { heading: "Commercial Register", body: "Amtsgericht Gießen, HRB 9607" },
      { heading: "Tax ID", body: "020 239 02509" },
      { heading: "VAT ID", body: "DE321662193" },
      { body: "Responsible for content per §18 (2) MStV: Mirko Krampl, address as above." },
    ],
  },
  terms: {
    page: "terms", title: "Terms & Conditions (AGB)", updatedAt: "2026-06-12",
    blocks: [
      { heading: "1. Scope", body: "These terms govern the use of the REVALO24 marketplace by visitors, registered buyers and listing agents." },
      { heading: "2. Listings", body: "Agents are responsible for the accuracy of their listings; REVALO24 verifies agent identity, not individual property claims." },
      { heading: "3. Off-Market access", body: "Access codes are personal, non-transferable and may expire. Dummy legal text for the UI showcase." },
    ],
  },
  privacy: {
    page: "privacy", title: "Privacy Policy (GDPR)", updatedAt: "2026-06-12",
    blocks: [
      { body: "We process personal data under Art. 6 (1) GDPR only for the purposes stated at collection: responding to inquiries, operating your account, and — with consent — analytics." },
      { heading: "Your rights", body: "Access (Art. 15), rectification (Art. 16), erasure (Art. 17), portability (Art. 20), objection (Art. 21). Contact our DPO at privacy@revalo24.example. Data is hosted in the EU (AWS Frankfurt)." },
    ],
  },
  cookies: {
    page: "cookies", title: "Cookie Policy", updatedAt: "2026-06-12",
    blocks: [
      { body: "Essential cookies keep you signed in and remember your language. Non-essential cookies (analytics, marketing) are off by default and load only after you opt in via the consent banner." },
      { body: "You can change your choice at any time under “Manage preferences”. Dummy text for the UI showcase." },
    ],
  },
};

const DE_TITLES: Partial<Record<CmsPage, string>> = {
  about: "Über REVALO24", contact: "Kontakt", imprint: "Impressum",
  terms: "AGB", privacy: "Datenschutzerklärung (DSGVO)", cookies: "Cookie-Richtlinie",
};

/** General contact form (spec Screen 6) — POST /contact. Same inquiry pattern
    as the exposé form, without a property reference. */
export async function sendContactMessage(payload: { name: string; email: string; message: string }): Promise<{ ok: boolean }> {
  if (!USE_MOCKS) return request("/contact", { method: "POST", body: payload });
  await mockDelay(600);
  return { ok: true };
}

export async function getCmsContent(page: CmsPage, locale: Locale): Promise<CmsContent> {
  if (!USE_MOCKS) return request<{ data: CmsContent }>(`/cms/${page}`, { params: { locale } }).then((r) => r.data);
  await mockDelay(250);
  const base = EN_CONTENT[page];
  if (locale === "en") return { ...base, locale, localeFallback: false };
  if (locale === "de") return { ...base, title: DE_TITLES[page] ?? base.title, locale, localeFallback: false };
  /* other locales: demo the fallback state the spec requires */
  return { ...base, locale, localeFallback: true };
}
