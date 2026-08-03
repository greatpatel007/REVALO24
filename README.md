# REVALO24 Frontend — React SPA + Tailwind CSS

Frontend implementation of the OpenXcell proposal (V2.0) scope for the **Public Frontend** (incl. the
Private User dashboard) and the **Agent Panel**. The Admin Panel is Laravel + Filament per the proposal
and is not part of this codebase.

Everything runs on **dummy services** — no backend required — but the whole app talks to a typed
services layer that mirrors the Laravel REST API v1, so backend integration is a config switch.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # strict tsc + production bundle
```

## Demo credentials

| What | Value |
|---|---|
| Private user | `lena@example.eu` / `demo1234` |
| Agent | `anna@kraemer-immo.de` / `demo1234` |
| Registration OTP (double opt-in) | `123456` |
| Off-Market unlock code | `492810` |

## Stack

- **React 19 + TypeScript (strict)** on Vite 6
- **Tailwind CSS v4** — design tokens from the Figma library exposed via `@theme` in `src/app/index.css`
  (colors, elevation, radius, focus ring). Living style guide at the hidden **`/designsystem`** route
  (unlinked by design — type the URL)
- **react-router v7** with locale-prefixed URLs (`/de/...`, `/en/...`) per proposal §3.5.2; all
  non-landing routes are lazy-loaded (route-level code splitting)
- **@phosphor-icons/react** — the DS icon set (Regular for UI, Duotone accents, champagne Duotone
  lock for Off-Market); tree-shaken named imports only
- No other runtime dependencies — charts, modals, toasts, i18n are all in-repo

## Architecture — feature-based

```
src/
  app/              Entry + composition root
    main.tsx        providers (Auth, Toast, Router), index.css (Tailwind @theme tokens)
    App.tsx         locale-gated route trees: public /:locale/*, account, agent
    layouts/        PublicLayout · AccountLayout (private users) · AgentLayout (sidebar panel)
  shared/           Cross-feature building blocks (no feature imports here)
    api/http.ts     fetch client, Sanctum bearer token, VITE_USE_MOCKS switch
    ui/             kit: Button, Field, Seg, Badge, Modal, Tabs, Toast, Skeleton, Pagination, …
    lib/            format helpers, useApi hook
    i18n/           9 locales (DE EN FR ES PT NL CS PL SK); EN fallback for missing keys
    types/          Domain models = the API contract (Property, AgentProfile, Invoice, ImportJob, …)
    mock/db.ts      dummy data + curated Unsplash photo pool (deleted at integration time)
  features/         One folder per domain; `api.ts` documents the real Laravel endpoint per function
    auth/           AuthContext, Login (social + demo accounts), Register (GDPR consents, OTP), api
    home/           HomePage: photo hero + omnibox, featured grid, map teaser, off-market, value props
    search/         SearchPage (filter pills / bottom sheet), MapPage (split view), shared MapCanvas
    property/       PropertyCard (+ OffMarketCover lock treatment), PropertyDetailPage, api
    off-market/     OffMarketPage + access-code unlock modal
    cms/            CMS/legal pages with locale fallback, api
    account/        Overview, Favorites, Saved searches, My listings (max 3), Profile, api
    agent/          Dashboard, Listings, Editor, AI Optimizer, CRM Import, Subscription (promo codes),
                    Placements, Agent profile & 34c verification wizard, Agents landing, api
    chrome/         Header (portal drawer), Footer, CookieBanner, LanguageSelector
    designsystem/   Living style guide — hidden /designsystem route (unlinked)
```

Rules: features may import from `shared/` and other features' public files; `shared/` never imports
from `features/`; routing composes everything in `app/App.tsx`.

## Backend integration guide

1. Copy `.env.example` → `.env`, set `VITE_API_BASE_URL` to the Laravel API and `VITE_USE_MOCKS=false`.
2. Every service function in `src/features/*/api.ts` already contains the real `request()` call with
   the endpoint path and payload shape — the mock branch is simply skipped.
3. Response envelopes follow Laravel conventions: single resources as `{ data: … }`, lists as the
   Laravel paginator (`{ data, meta: { current_page, last_page, per_page, total } }`).
4. Auth: `POST /auth/login` returns `{ token, user }`; the Sanctum token is attached as a Bearer
   header by `http.ts`. Social login and DOI/OTP endpoints are stubbed in `services/auth.ts`.
5. Replace `src/shared/i18n/dictionaries.ts` with the AI Translation Manager JSON export (same key format).
6. The map renders a demo canvas — swap the internals of `src/features/search/MapCanvas.tsx` for the
   Google Maps JS SDK; the map page and home teaser both consume it, and markers/radius/popover
   already work off the filtered dataset.

## Proposal coverage (frontend scope)

- §3.4.5 Public Visitor — search + filters (country/type/price/area/beds), map + radius (5/10/25/50 km
  segmented control), sort, hero autocomplete, Buy/Rent toggle, detail w/ media tabs + inquiry, CMS pages
- §3.4.4 Private User — GDPR registration (mandatory unchecked consents), DOI/OTP, favorites, saved
  searches, max-3 manual listings, profile + MFA toggle + GDPR deletion request
- §3.4.3 Agent — dashboard stats (7/30-day charts, CSV), full listing CRUD + bulk actions + status
  workflow, New Construction master/sub-units (Developer designation), CRM-sync override warnings,
  media management, AI Exposé Optimizer (9 languages, credit-tracked), OpenImmo/SFTP import + manual
  ZIP fallback + history/retry, subscription w/ hosted Stripe portal, Featured/Top placements,
  34c GewO verification gate with admin-approval states
- §3.5.2 — 9-language selector (dropdown grid / bottom sheet), locale-prefixed routing
- §4 — Stripe (EUR-only, reverse charge, DATEV note), VIES-validated VAT badge, Gemini AI slots,
  Google Maps slot documented

Out of scope here (backend/Filament): admin panel, real payments/webhooks, actual AI + VIES calls.
