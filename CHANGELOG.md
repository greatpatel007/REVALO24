# Changelog

All notable changes to the REVALO24 frontend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-08-14

### Added
- Official brand logo assets under `public/brand/` (mark + lockup) and foundation sources in `Assets/Foundations/`
- Light and on-dark SVG variants for header/footer surfaces; favicon points at the mark

### Changed
- Site `Logo` uses the real REVALO24 mark/lockup instead of the placeholder SVG + text wordmark
- Logo colors follow theme tokens: **action blue** (`#2563EB` / `#3B82F6` on navy) for the mark and wordmark, **champagne gold** (`#A98545`) for the accent squares
- Tighter SVG viewBoxes and header flex alignment so the logo sits flush in nav bars

---

## [0.1.0] — 2026-08-14

First published SPA release on GitHub Pages (`main`), including agent analytics drill-down, mobile agent shell, home performance work, and earlier panel/exposé foundations.

### Added

#### Agent panel
- **Listing traffic analytics** (`/agent/analytics`) — per-listing views and clicks, sort by either metric, open a row to edit the exposé
- Clickable dashboard KPIs: Active → listings, Sold → listings filtered by status, Views → analytics, Inquiries → inbox
- Status filter on **Agent listings** (`?status=sold|active|draft|rented`) for Sold KPI drill-down
- Mobile **bottom tab bar** (Home / Listings / Inbox / More) with **Action sheet** for secondary agent tools
- Compact stepper orientation for narrow listing-editor flows
- Mock `clicksTotal` / `getListingTraffic()` for per-listing traffic

#### Home & discovery
- Split home modules: `HomeHero`, `HeroOmnibox`, `HomeMapTeaser`, `IntegrationTrustStrip`
- Self-hosted responsive hero WebP set under `public/hero/` with preload in `index.html`
- `public/llms.txt` for agentic browsing hints
- Lead capture modal + API stub (`src/features/leads/`)

#### Property & search
- Amenity icon map, FX helper, shared image/`srcset` helpers, price-tier helpers
- Filter bar and exposé polish (facts, financing-adjacent UX, media treatment)

#### Platform
- Motion presets + `LazyMotionRoot`
- `BottomTabBar` and `ActionSheet` shared UI
- Agent 320px overflow audit scripts (`scripts/audit-agent-320.mjs`, `scripts/audit-agent-de-320.mjs`)
- Self-hosted variable fonts (`@fontsource-variable/inter`, `@fontsource-variable/plus-jakarta-sans`)

### Changed

- Dashboard **bar chart**: Y-axis ticks and guides, sparse readable X-axis dates, compact toolbar with labeled **Export CSV**
- Agent layout: remove horizontal mobile nav rail; cookie banner docks above agent tab height (`--r24-agent-tab-h`)
- Home page composition leaner; map teaser loads lazily
- i18n: analytics, listing filters, CSV export, and related strings across EN/DE + FR/ES/PT/NL/CS/PL/SK
- Listing cards/table show views and clicks where relevant
- Marketing copy: remove overstated “GDPR-compliant” claims; keep accurate legal Art. 17 wording

### Fixed

- Mobile hero omnibox sizing / placeholder / Seg width on small viewports
- Chart X-axis labels no longer truncate into unreadable fragments on the 30-day range
- GitHub Pages deploy pipeline (Node 24, `deploy-pages` v5) — prior release notes
- Repository sync scoped to the SPA frontend only

### Performance

- Hero LCP via self-hosted WebP + preload (Lighthouse preview Performance ~99 after change)
- Property card image `srcset`; Phosphor icons code-split; home map deferred

---

## [0.0.2] — 2026-07 / early Aug 2026

Internal / pre-`0.1.0` milestones captured from git history.

### Added
- Design skill, hotspot audit tooling, and product proposal PDF (`16d766b`)
- Panel and exposé UX updates after relocating the SPA (`bbfa745`)

### Changed
- SPA relocated under the repo root used for GitHub Pages publishing
- GitHub sync limited to the SPA frontend (`209732c`)

### Fixed
- GitHub Pages deploy: Node 24 and deploy-pages v5 (`667acd6`)

---

## [0.0.1] — 2026-07

### Added
- Initial REVALO24 frontend for GitHub Pages (`b6ae7b7`)
  - React 19 + Vite + Tailwind v4 SPA
  - Public search, map, exposé, Off-Market gating
  - Agent panel with mock APIs
  - 9-locale i18n (DE EN FR ES PT NL CS PL SK)

---

[0.1.1]: https://github.com/greatpatel007/REVALO24/compare/959f765...134f647
[0.1.0]: https://github.com/greatpatel007/REVALO24/compare/209732c...959f765
[0.0.2]: https://github.com/greatpatel007/REVALO24/compare/b6ae7b7...209732c
[0.0.1]: https://github.com/greatpatel007/REVALO24/commits/b6ae7b7
