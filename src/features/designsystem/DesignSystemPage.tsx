import { useState } from "react";
import { ArrowsDownUp, BellRinging, Heart, House, ListBullets, LockKey, MagnifyingGlass, MapPin, MapTrifold, Sparkle } from "@phosphor-icons/react";
import { Logo } from "@/features/chrome/Header";
import { PropertyFacts } from "@/features/property/PropertyCard";
import { EnergyClassBadge, EnergyScale } from "@/features/property/EnergyClass";
import type { Property } from "@/shared/types";
import { Button } from "@/shared/ui/Button";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { Input, Select, Textarea, Consent } from "@/shared/ui/Field";
import { Seg, RADIUS_OPTIONS } from "@/shared/ui/Seg";
import { Tabs } from "@/shared/ui/Tabs";
import { Pagination } from "@/shared/ui/Pagination";
import { Skeleton, CardSkeleton } from "@/shared/ui/Skeleton";
import { Stepper } from "@/shared/ui/Stepper";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { useToast } from "@/shared/ui/Toast";
import { LOCALES } from "@/shared/i18n/dictionaries";

/* ============================================================
   REVALO24 Design System — living reference.
   Hidden route: /designsystem (not linked anywhere).
   Single source of truth: the Tailwind @theme tokens in
   src/app/index.css — every swatch/component below renders
   from the real tokens, so this page can never drift.
   ============================================================ */

interface Swatch { name: string; hex: string; cls: string; role?: string; darkText?: boolean }

const RAMPS: { title: string; swatches: Swatch[] }[] = [
  {
    title: "Brand / Navy & Slate",
    swatches: [
      { name: "navy", hex: "#0F172A", cls: "bg-navy", role: "brand, header, dominant structure" },
      { name: "slate-900", hex: "#1E293B", cls: "bg-slate-900" },
      { name: "slate-800", hex: "#334155", cls: "bg-slate-800" },
      { name: "slate-700", hex: "#475569", cls: "bg-slate-700" },
      { name: "slate-600", hex: "#64748B", cls: "bg-slate-600", role: "text/muted — AA 4.5:1" },
      { name: "slate-450", hex: "#7D8CA1", cls: "bg-slate-450", role: "border/strong — 3.3:1" },
      { name: "slate-500", hex: "#94A3B8", cls: "bg-slate-500", role: "decorative only", darkText: true },
      { name: "slate-400", hex: "#CBD5E1", cls: "bg-slate-400", darkText: true },
      { name: "slate-300", hex: "#E2E8F0", cls: "bg-slate-300", role: "card borders / dividers", darkText: true },
      { name: "slate-200", hex: "#F1F5F9", cls: "bg-slate-200", darkText: true },
      { name: "canvas", hex: "#F8FAFC", cls: "bg-canvas", role: "page background", darkText: true },
    ],
  },
  {
    title: "Action / Royal Blue",
    swatches: [
      { name: "blue-700", hex: "#1D4ED8", cls: "bg-blue-700", role: "action hover, link text" },
      { name: "blue-600", hex: "#2563EB", cls: "bg-blue-600", role: "CTAs, active states (color/action)" },
      { name: "blue-500", hex: "#3B82F6", cls: "bg-blue-500" },
      { name: "blue-100", hex: "#DBEAFE", cls: "bg-blue-100", darkText: true },
      { name: "blue-50", hex: "#EFF6FF", cls: "bg-blue-50", role: "action badge bg", darkText: true },
    ],
  },
  {
    title: "Success / Emerald",
    swatches: [
      { name: "emerald-700", hex: "#047857", cls: "bg-emerald-700", role: "success text" },
      { name: "emerald-600", hex: "#059669", cls: "bg-emerald-600", role: "success fills, Verified" },
      { name: "emerald-500", hex: "#10B981", cls: "bg-emerald-500" },
      { name: "emerald-100", hex: "#D1FAE5", cls: "bg-emerald-100", darkText: true },
      { name: "emerald-50", hex: "#ECFDF5", cls: "bg-emerald-50", darkText: true },
    ],
  },
  {
    title: "Premium / Champagne (Off-Market & luxury only)",
    swatches: [
      { name: "champagne-800", hex: "#7A5A24", cls: "bg-champagne-800", role: "bg/premium" },
      { name: "champagne-700", hex: "#8A6D2F", cls: "bg-champagne-700", role: "premium hover / icon on light" },
      { name: "champagne-600", hex: "#A98545", cls: "bg-champagne-600" },
      { name: "champagne-100", hex: "#F3E8CF", cls: "bg-champagne-100", role: "text/premium-accent", darkText: true },
      { name: "champagne-50", hex: "#FBF6EA", cls: "bg-champagne-50", darkText: true },
    ],
  },
  {
    title: "Status",
    swatches: [
      { name: "warn-700", hex: "#C2410C", cls: "bg-warn-700", role: "warning text" },
      { name: "warn-600", hex: "#EA580C", cls: "bg-warn-600", role: "warning fills" },
      { name: "err-700", hex: "#B91C1C", cls: "bg-err-700", role: "error text" },
      { name: "err-600", hex: "#DC2626", cls: "bg-err-600", role: "error fills" },
      { name: "info-700", hex: "#0E7490", cls: "bg-info-700", role: "info text" },
      { name: "info-600", hex: "#0891B2", cls: "bg-info-600", role: "info fills" },
    ],
  },
];

const TEXT_STYLES: { name: string; cls: string; spec: string; sample?: string }[] = [
  { name: "Display / XL", cls: "font-display text-5xl font-extrabold leading-tight", spec: "48/1.25 · 800 · −0.015em" },
  { name: "Heading / H1", cls: "font-display text-3xl font-extrabold", spec: "30/1.2 · 800 · −0.015em" },
  { name: "Heading / H2", cls: "font-display text-2xl font-extrabold", spec: "24/1.33 · 700 optical · −0.015em" },
  { name: "Heading / H3", cls: "font-display text-lg font-bold", spec: "18/1.56 · 700 · −0.015em" },
  { name: "Body / Default", cls: "text-base text-slate-800", spec: "16/1.5 · 400" },
  { name: "Body / Small", cls: "text-sm text-slate-800", spec: "14/1.5 · 400" },
  { name: "Body / Small Strong", cls: "text-sm font-semibold text-slate-800", spec: "14/1.5 · 600" },
  { name: "Caption / Default", cls: "text-xs text-muted", spec: "12/1.45 · 400" },
  { name: "UI / Button", cls: "text-sm font-semibold", spec: "14/1.5 · 600" },
  { name: "UI / Label", cls: "text-sm font-semibold text-slate-900", spec: "14/1.5 · 600" },
  { name: "UI / Badge", cls: "text-[11px] font-bold uppercase tracking-wide", spec: "11/1 · 700 · +0.025em · caps" },
  { name: "UI / Price", cls: "font-display text-2xl font-extrabold tabular", spec: "24/1.33 · 700 optical · tabular", sample: "€ 485.000" },
  { name: "Overline", cls: "t-overline text-blue-700", spec: "12/1 · 700 · +0.08em · caps" },
];

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-14 scroll-mt-20">
      <h2 className="mb-1 font-display text-2xl font-extrabold">{title}</h2>
      {note && <p className="mb-5 max-w-2xl text-sm text-muted">{note}</p>}
      {!note && <div className="mb-5" />}
      {children}
    </section>
  );
}

const NAV = [
  ["colors", "Colors"], ["typography", "Typography"], ["elevation", "Elevation & radius"],
  ["icons", "Icons"], ["buttons", "Buttons"], ["badges", "Badges"], ["forms", "Forms"],
  ["controls", "Controls"], ["patterns", "Patterns"], ["feedback", "Feedback"], ["i18n", "Localization"],
] as const;

/* Minimal fixture for the PropertyFacts demo — only the fields it reads. */
const FACTS_DEMO = { livingArea: 86, rooms: 3, bedrooms: 2, bathrooms: 1 } as Property;

export function DesignSystemPage() {
  const toast = useToast();
  const [seg, setSeg] = useState<"buy" | "rent">("buy");
  const [radius, setRadius] = useState<5 | 10 | 25 | 50>(10);
  const [tab, setTab] = useState("a");
  const [page, setPage] = useState(2);
  const [consent, setConsent] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Minimal standalone chrome — this page is intentionally unlinked */}
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge tone="info">Design System</Badge>
          </div>
          <nav aria-label="Sections" className="hidden gap-1 overflow-x-auto lg:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="t-overline mb-2 text-blue-700">REVALO24 · internal reference</p>
        <h1 className="mb-2 font-display text-3xl font-extrabold sm:text-4xl">Design System</h1>
        <p className="mb-12 max-w-2xl text-muted">
          Living style guide rendered from the production tokens in <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">src/app/index.css</code> and
          the shared UI kit — what you see here is exactly what ships. Fonts: Inter (body/UI) + Plus Jakarta Sans (display).
          Icons: Phosphor. WCAG AA audited.
        </p>

        {/* ---- Colors ---- */}
        <Section id="colors" title="Color tokens"
          note="600 = fills/badges, 700 = text (AA). Champagne is reserved for Premium / Off-Market. slate-500 is decorative only.">
          {RAMPS.map((ramp) => (
            <div key={ramp.title} className="mb-6">
              <h3 className="mb-2.5 font-display text-sm font-bold text-slate-800">{ramp.title}</h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                {ramp.swatches.map((s) => (
                  <div key={s.name} className="overflow-hidden rounded-lg border border-slate-300 bg-white">
                    <div className={`flex h-14 items-end px-2.5 pb-1.5 ${s.cls}`}>
                      <span className={`text-[11px] font-bold ${s.darkText ? "text-navy" : "text-white"}`}>{s.hex}</span>
                    </div>
                    <div className="px-2.5 py-1.5">
                      <p className="text-xs font-bold">{s.name}</p>
                      {s.role && <p className="text-[11px] leading-snug text-muted">{s.role}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* ---- Typography ---- */}
        <Section id="typography" title="Typography"
          note="13 text styles mirroring the Figma library. Plus Jakarta Sans for display/headings, Inter for everything else; tabular numerals for prices. Both families load as variable fonts (wght 400–800) and font-synthesis is disabled — every weight class used in the UI is a real face, never a browser-faked bold. Jakarta reads optically heavier than Inter at the same numeric weight, so mid-size display extrabold (below text-3xl) soft-caps to 700 in CSS while hero sizes keep true 800. Readability rules (EU/WCAG-aligned): body-size copy keeps a ≥1.5 line height (text-sm 1.5, text-xs 1.45 via theme tokens), display headings get −0.015em tracking, 11px is the hard content floor and only for short bold tokens (badges, overlines) — never sentences, and long-form copy stays ≤75ch (legal/CMS prose uses max-w-2xl). The UI must survive WCAG 1.4.12 text-spacing overrides without clipping: heights on text containers are min-h, never fixed. 9-locale wrapping rules: h1–h3 get text-wrap:balance at the base layer (DE/PT/NL headings run ~30% longer), key descriptions use text-pretty, long-form prose gets hyphens-auto + break-words (html lang follows the locale, so German compounds hyphenate; emails/URLs break instead of overflowing). Links pull underline metrics from the font (text-underline-position/thickness: from-font). Inputs render at 16px on mobile (text-base sm:text-sm) so iOS Safari never zooms the page. Units and prefixes join with a no-break space — '86 m²', the '≈' CZK/PLN estimate prefix and the rent '/ mo' suffix never split across lines. Truncated values that aren't visible in full elsewhere carry a title tooltip.">
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-300 bg-white">
            {TEXT_STYLES.map((tst) => (
              <div key={tst.name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-3.5">
                <span className="w-40 shrink-0 text-xs font-semibold text-muted">
                  {tst.name}
                  <span className="block font-normal tabular text-slate-400">{tst.spec}</span>
                </span>
                <span className={tst.cls}>{tst.sample ?? "Find your place in Europe"}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---- Elevation, radius, focus ---- */}
        <Section id="elevation" title="Elevation, radius & focus">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["elevation-sm", "shadow-elevation-sm"],
              ["elevation-md", "shadow-elevation-md"],
              ["elevation-lg", "shadow-elevation-lg"],
            ].map(([name, cls]) => (
              <div key={name} className={`rounded-xl bg-white p-5 ${cls}`}>
                <p className="text-sm font-bold">{name}</p>
                <p className="text-xs text-muted">shadow token</p>
              </div>
            ))}
            <div className="rounded-xl bg-white p-5" style={{ boxShadow: "var(--shadow-focus-ring)" }}>
              <p className="text-sm font-bold">focus-ring</p>
              <p className="text-xs text-muted">every interactive element</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {[["sm", "4px", "rounded-sm"], ["md", "6px", "rounded-md"], ["lg", "8px", "rounded-lg"], ["xl", "12px", "rounded-xl"], ["full", "badges only", "rounded-full"]].map(([n, px, cls]) => (
              <div key={n} className="text-center">
                <div className={`mb-1.5 h-14 w-20 border-2 border-action bg-blue-50 ${cls}`} />
                <p className="text-xs font-bold">{n} <span className="font-normal text-muted">{px}</span></p>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-2xl text-xs text-muted">
            <strong>Radius rule:</strong> full radius is reserved for <strong>Badges &amp; status</strong> (Badge kit, count
            bubbles, progress meters, step dots) and functional circles (spinner, toggle knob, map radius ring, avatars).
            Everything interactive — buttons, links, chips, filter pills, segmented controls, icon buttons — uses
            <code className="mx-1 rounded bg-slate-200 px-1">lg</code> (containers <code className="mx-1 rounded bg-slate-200 px-1">xl</code>/<code className="mx-1 rounded bg-slate-200 px-1">2xl</code>).
            Avoid pill-shaped UI.
          </p>
          <p className="mt-3 max-w-2xl text-xs text-muted">
            <strong>Content shell:</strong> public pages use <code className="mx-1 rounded bg-slate-200 px-1">max-w-shell</code> (1440px / 90rem).
            Figma primary roots stay 1280; 1440 is the large-desktop QA frame for EU viewports (1536/1920). Long-form prose stays
            <code className="mx-1 rounded bg-slate-200 px-1">max-w-2xl</code> (~65ch). Property card grids: 3 columns at <code className="mx-1 rounded bg-slate-200 px-1">lg</code>, 4 at <code className="mx-1 rounded bg-slate-200 px-1">2xl</code>.
          </p>
        </Section>

        {/* ---- Icons ---- */}
        <Section id="icons" title="Icons — Phosphor"
          note="Named imports from @phosphor-icons/react (tree-shaken). Regular weight for UI, Fill for emphasis/toggles, Duotone for accent tiles — champagne Duotone LockKey is the Off-Market register.">
          <div className="flex flex-wrap gap-3">
            {[
              { el: <MagnifyingGlass className="size-6" />, label: "Regular — UI controls" },
              { el: <Heart weight="fill" className="size-6 text-err-600" />, label: "Fill — active states" },
              { el: <Sparkle weight="duotone" className="size-6 text-blue-600" />, label: "Duotone — accents" },
              { el: <MapPin weight="duotone" className="size-6 text-emerald-600" />, label: "Duotone — success" },
              { el: <House weight="duotone" className="size-6 text-champagne-700" />, label: "Duotone — premium on light" },
            ].map((i) => (
              <div key={i.label} className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3">
                <span aria-hidden>{i.el}</span>
                <span className="text-xs font-semibold text-muted">{i.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl bg-navy px-4 py-3">
              <LockKey weight="duotone" className="size-6 text-champagne-100" aria-hidden />
              <span className="text-xs font-semibold text-champagne-100">Off-Market lock — champagne on navy</span>
            </div>
          </div>
        </Section>

        {/* ---- Buttons ---- */}
        <Section id="buttons" title="Buttons"
          note="44px minimum touch target on md/lg (WCAG 2.5.8). Premium variant only for Off-Market / luxury CTAs.">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="premium"><LockKey weight="duotone" className="size-4.5" aria-hidden /> Premium</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </Section>

        {/* ---- Badges ---- */}
        <Section id="badges" title="Badges & status">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="action">Top</Badge>
              <Badge tone="success">Verified</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge tone="danger">Rejected</Badge>
              <Badge tone="info">New build</Badge>
              <Badge tone="premium">Featured</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {["active", "draft", "sold", "approved", "pending", "failed"].map((s) => <StatusBadge key={s} status={s} />)}
            </div>
          </div>
        </Section>

        {/* ---- Forms ---- */}
        <Section id="forms" title="Form fields"
          note="border/strong (slate-450) boundaries for 3:1 contrast; GDPR consents are never pre-selected. Selects use appearance-none with a Phosphor CaretDown — native browser arrows are banned (they bleed over the padded box).">
          <div className="grid gap-4 rounded-xl border border-slate-300 bg-white p-5 sm:grid-cols-2">
            <Input label="Label" placeholder="Placeholder" hint="Helper text" />
            <Input label="Required with error" required error="This field is required" defaultValue="" />
            <Select label="Select">
              <option>Apartment</option>
              <option>House</option>
              <option>Villa</option>
            </Select>
            <Textarea label="Textarea" placeholder="Message…" />
            <div className="sm:col-span-2">
              <Consent checked={consent} onChange={setConsent}>
                I agree to the processing of my data per the <span className="font-semibold text-blue-700 underline">Privacy Policy</span>. (unchecked by default — §5.1)
              </Consent>
            </div>
          </div>
        </Section>

        {/* ---- Controls ---- */}
        <Section id="controls" title="Controls"
          note="The segmented snap control replaced the radius slider at DS level (2026-07-29) — used for radius, Buy/Rent and other discrete choices.">
          <div className="flex flex-col gap-5 rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Seg ariaLabel="Listing type" options={[{ value: "buy", label: "Buy" }, { value: "rent", label: "Rent" }]} value={seg} onChange={setSeg} />
              <Seg ariaLabel="Search radius" size="sm" options={RADIUS_OPTIONS} value={radius} onChange={setRadius} />
            </div>
            <Tabs tabs={[{ id: "a", label: "Photos (5)" }, { id: "b", label: "Video" }, { id: "c", label: "Floor plan" }]} active={tab} onChange={setTab} />
            <Pagination page={page} lastPage={5} onChange={setPage} />
            <Stepper steps={["Company & imprint", "Documents", "Review & submit"]} current={1} />
          </div>
        </Section>

        {/* ---- Patterns ---- */}
        <Section id="patterns" title="Search & card patterns"
          note="One search, two views: /properties and /map share the URL query string, so switching never loses filters. Favorites require a signed-in account — guests who tap the heart get an info toast and are routed to login.">
          <div className="flex flex-col gap-6 rounded-xl border border-slate-300 bg-white p-5">
            <div>
              <p className="mb-2 text-sm font-bold">Property facts — <code className="rounded bg-slate-200 px-1 text-xs">PropertyFacts</code></p>
              <PropertyFacts property={FACTS_DEMO} />
              <p className="mt-1.5 text-xs text-muted">
                Exactly three facts — Duotone Ruler / Door / Bathtub (area · rooms · baths) in action blue with tabular
                values — replaces plain-text meta on every property card (md on cards, sm in the map panel). Rooms, not
                beds, is the EU headline figure; the full fact set lives only in the exposé Key facts grid. Labels stay
                screen-reader visible. Card grids are 3 columns at lg, 4 at 2xl (home featured follows the same scale as search).
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">Floating view switch — <code className="rounded bg-slate-200 px-1 text-xs">FloatingViewSwitch</code></p>
              {/* Static replica — the real component is position:fixed and router-bound */}
              <div className="inline-flex items-center rounded-xl bg-navy p-1 shadow-elevation-lg" aria-hidden>
                <span className="flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-bold text-navy">
                  <ListBullets weight="bold" className="size-4.5" /> List
                </span>
                <span className="flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-bold text-slate-300">
                  <MapTrifold weight="bold" className="size-4.5" /> Map
                </span>
                <span className="flex min-h-10 items-center gap-1.5 rounded-lg border-l border-white/20 px-4 text-sm font-bold text-slate-300">
                  <ArrowsDownUp weight="bold" className="size-4.5" /> Sort
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Fixed bottom-center on both search views (Zillow pattern); carries the full query string. The Sort
                segment appears on the mobile list view only and opens a bottom sheet — desktop keeps the header sort
                select. Hidden on the map while a marker popover is open.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">Save-search bell — FilterBar CTA</p>
              {/* Static replica — the real button is guest-gated and opens the save dialog.
                  Demoted to a quiet outline (audit 2026-07-29) so it doesn't compete with filter pills. */}
              <span className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-800" aria-hidden>
                <BellRinging weight="duotone" className="size-4.5 text-blue-600" /> Save search
              </span>
              <p className="mt-1.5 text-xs text-muted">
                Lives in the shared FilterBar so it appears on the list and map views alike (IS24 “Suchauftrag”).
                Guests get an info toast and are routed to login; signed-in users get a Modal with an editable name,
                read-only filter chips and an Instant / Daily / Weekly / Off alert-frequency Seg. The cadence is
                editable per search on Account → Saved searches via an inline sm Seg.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">
                Energy class (EU EPC) — <code className="rounded bg-slate-200 px-1 text-xs">EnergyClassBadge</code> / <code className="rounded bg-slate-200 px-1 text-xs">EnergyScale</code>
              </p>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((c) => <EnergyClassBadge key={c} rating={c} />)}
              </div>
              <div className="max-w-md"><EnergyScale active="C" /></div>
              <p className="mt-2 text-xs text-muted">
                Official EU energy-label colors (A deep green → G/H red; dark text on the yellow C–E midtones).
                EPBD requires the class in property ads: cards anchor the sm badge to the <em>right of the price row</em>
                (never inline with the PropertyFacts icons — it reads as a fifth fact and wraps raggedly); the exposé
                shows the badge in Key facts plus the full ladder with a marker. Arrow shape mirrors the printed label.
                Letters are Inter extrabold at 12px minimum (h-6 sm / h-7 md) — the display face goes muddy smaller,
                and the arrow clip eats ~0.5em of right padding.
              </p>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>Placement is communicated by badges only (Top / Featured) — featured cards keep the standard slate border, no champagne outline.</li>
              <li>Exposé Key facts use duotone icons per fact (Ruler / Tree / Door / Bed / Bathtub / Stairs / CalendarBlank / Lightning) in action blue — same language as PropertyFacts on cards.</li>
              <li>Top nav uses rounded-lg links with query-aware active states (Buy vs Rent differ only in <code>?type=</code>); the sticky header swaps its border for an elevation-md shadow after 8px of scroll; the drawer opens with a logo header, duotone link icons and a signed-in identity card on mobile.</li>
              <li><strong>Mobile logo is mark-only</strong> (hotspot test 2026-07-29): the header renders <code>{"<Logo compact />"}</code> — the wordmark lockup is hidden below <code>sm</code> because the full logo was the #1 predicted-attention hotspot on every mobile first view. Assets live in <code>public/brand/</code> (<code>logo-mark.svg</code> / <code>logo-lockup.svg</code>, plus <code>-on-dark</code> for navy surfaces). The wrapping link keeps <code>aria-label="REVALO24 home"</code>; footer uses <code>{"<Logo onDark />"}</code>.</li>
              <li>Hero-band CTAs on mobile go full-width (<code>w-full sm:w-auto</code>, e.g. the Off-Market “Enter access code” button) so the action reads as a strong bar under the headline instead of a small island the headline out-competes.</li>
              <li>Prices are always plain <code>Intl</code>-formatted text (<code>fmtPrice</code>) — the € stays a text glyph. An icon-based € was evaluated and rejected; don’t reintroduce it.</li>
              <li>Full radius appears only on Badges &amp; status — nav links, filter pills, chips, Seg controls and icon buttons are all rounded-lg (see the radius rule above).</li>
              <li>Off-Market cards keep the photo visible but blurred, with the champagne Duotone lock on top.</li>
              <li><strong>Off-Market gated detail</strong> (spec 4B, 2026-07-29): opening an Off-Market exposé without access shows the padlock hero, region-level location, a 3-fact non-identifying summary and blurred placeholder bars (real price/address/description never reach the DOM). The dismissible unlock Modal offers two paths — a 6-digit agent access code, or sign-in (verified <em>private</em> buyers unlock instantly; signed-in agents get distinct “not approved” messaging). Grants persist per property in <code>useOffMarketAccess</code>.</li>
              <li>Map side panel renders standard PropertyCards (1-col at lg, 2-col at xl); hovering a card highlights its marker with a 2px action ring.</li>
              <li>Exposé media is a 5-image mosaic (1 hero + 4 tiles, “Show all photos” pill) opening a lightbox Modal with photo/video/floor-plan tabs; mobile gets a snap carousel with a photo counter.</li>
              <li>Buy exposés add a collapsible Purchase-costs card (per-country transfer-tax rates from <code>PURCHASE_COSTS</code>), a sidebar Financing-estimate card (equity input + term Seg + rate slider) and a €/m²-vs-city-average chip beside the price (emerald when below average).</li>
              <li>The filter “More” panel stacks Country (select) and minimum Living area (m² input) above radius, minimum energy class (A–D Seg, matches the class or better) and amenity toggle chips (Balcony / Garden / Parking / Elevator) — completing the spec Screen 2 filter set.</li>
              <li>Home entry points: inventory trust line under the hero omnibox plus four category tiles (Apartments / Houses / New Construction / Off-Market) with live counts linking into pre-filtered search.</li>
              <li><strong>Maps are real and interactive</strong> (2026-07-29): <code>MapCanvas</code> renders the Google Maps JS SDK when <code>VITE_GOOGLE_MAPS_API_KEY</code> is set, and a keyless Leaflet map (OSM streets / Esri satellite, Map | Satellite toggle top-right) otherwise — both fully pannable/zoomable with the brand pill markers shared via <code>mapMarkers.ts</code>.</li>
              <li><strong>Marker clustering + focus viewports</strong> (2026-07-29): dense areas collapse into an action-blue count bubble; clicking zooms into the cluster (spiderfies at max zoom on Leaflet). The viewport auto-fits the result set (zoom clamped ≤15) and <code>MapCanvas</code> accepts <code>center</code> + <code>zoom</code> for city-level snippets — the exposé’s Location section uses a z13 non-interactive instance with one marker.</li>
              <li><strong>Inactive listings</strong>: sold/rented exposés show a warn-toned status banner with a “Browse similar” link, disable the inquiry form and hide the mobile sticky contact bar. Search results only ever contain active listings.</li>
              <li>List-view empty state pairs the “broaden your filters” hint with a Clear-all-filters button (parity with the map empty state); the Contact CMS page appends a general contact form (name / email / message + GDPR consent) reusing the inquiry pattern.</li>
              <li><strong>Return-path auth gates</strong>: every guest gate (favorites heart, save-search bell, guarded layouts) passes <code>state.from</code> to /login, and login/social/registration all navigate back to it — filters included.</li>
              <li><strong>Exposé conversion set</strong>: heart + share actions in the title row, “Back to results” breadcrumb when arriving from search, a mobile sticky contact bar (price + Contact agent, <code>sm:hidden</code>), and a post-inquiry register nudge for guests. The contact card binds to the listing’s real agent (<code>getListingAgent</code>).</li>
              <li><strong>CZK/PLN display estimates</strong> (§4.1, 2026-07-29): <code>fmtLocalEstimate(amountEur, locale)</code> returns “≈ 12 040 000 Kč” for <code>cs</code>/<code>pl</code> and <code>null</code> for EUR locales. Shown under the exposé price, plan prices (B2B landing + subscription) and placement prices, always with the <code>fx.note</code> suffix (“at today’s rate — billed in EUR”). Fiscal base stays EUR; production feeds daily ECB rates via <code>GET /fx/daily</code>.</li>
              <li><strong>Agent inquiries (contact tracking)</strong>: <code>/agent/inquiries</code> is an inbox — one bordered list surface with divider rows (never a card mosaic: unequal card heights read as clutter), sorted new-first then newest. Row anatomy at lg+: fixed 14rem sender column (avatar, name, date) | message column (listing link → quote capped at <code>max-w-prose</code> → mailto/tel contact row) | right-aligned status badge + actions, so all rows share edges. New rows get a 3px <em>inset</em> action-blue accent (absolute span, not <code>border-l</code>, so content never shifts between states) on white; replied rows drop to muted canvas. Badge tone is <code>action</code> for New — same blue family as the accent and avatar. All | New | Replied Seg filter with live counts; mailto actions use <code>ButtonLink</code> (anchor styled as a button — never nest a button inside an anchor).</li>
              <li><strong>Listing-editor media order</strong>: thumbnails carry a Cover tag on the first image plus caret move-left/right buttons (44px hit targets, disabled at the ends) and X delete — first image is the cover everywhere.</li>
              <li><strong>MFA enrollment</strong> (§3.2.2): enabling MFA opens an inline enrollment panel — Seg choice between Authenticator app (QR placeholder + setup key) and SMS code (phone input), confirmed with a 6-digit code before the switch flips. Disabling still routes through ConfirmDialog.</li>
              <li><strong>DOI dual method</strong> (§3.2.2): the verify step offers the 6-digit OTP inputs <em>and</em>, below an “or” divider, an “Open the activation link” secondary button simulating the one-click email link — the active method is admin-configurable.</li>
              <li><strong>No tables on mobile</strong> (2026-07-29): every data table (agent listings, CRM import history, invoices, exposé sub-units) renders as a stacked card list below its breakpoint (<code>lg</code> for the 760px listings table, <code>md</code> elsewhere) — never a horizontally-scrolling table. Cards keep the full row data: header line + status/amount on the right, meta line of badges and tabular figures, actions last. Bulk selection survives via per-card checkboxes plus a standalone “Select all” toggle above the list.</li>
              <li><strong>Grid min-width discipline</strong>: any grid/flex column that contains <code>truncate</code> (nowrap) text needs <code>grid-cols-1</code> / <code>minmax(0,1fr)</code> tracks and <code>min-w-0</code> on the items — otherwise the nowrap text sets the page’s intrinsic min width and the layout bleeds past the mobile viewport (the dashboard’s recent-inquiry previews once forced a 390px screen to 670px). Corollary (2026-07-30): a template-less <code>grid</code> gets an implicit <em>auto</em> track with a min-content floor — always declare <code>grid-cols-1</code> at the base breakpoint, not just at <code>sm:</code>/<code>xl:</code>. Verified by <code>tools/hotspot/overflow-matrix.mjs</code> (3 demo agents × all agent routes × 8 widths from 320 to 1920 × EN/DE).</li>
              <li><strong>Agent dashboard anatomy</strong> (2026-07-30): header (greeting + localized date + verification chip + one primary “New listing” CTA) → “Needs attention” strip (renders only when actionable: unanswered inquiries, quota ≥85% or full, verification pending — <code>auto-fit</code> columns so a lone card spans full width, CTAs wrap to their own line) → 4 KPI cards with vs-previous-7-days deltas → chart card (metric + range Segs, icon-only CSV export, zero-data empty state) → recent inquiries with quick Reply, plan usage and gated quick actions.</li>
              <li><strong>Verification Gate</strong> (client flow, 2026-07-30): agent registration asks only email + password; after DOI the agent lands restricted. <code>useAgentGate</code> + <code>GateNotice</code> (features/agent/gate.tsx) gate New listing, publish, AI generation, placements and CRM upload until the profile form (company, managing director, register number, VAT ID) <em>plus a mandatory Real-Estate-License upload</em> is submitted — badge then shows “Pending review”, and admin approval flips it to the blue “Verified agent” check and unlocks everything. Rejected state gets distinct copy.</li>
              <li><strong>Demo agents</strong> (password <code>demo1234</code>): <code>anna@kraemer-immo.de</code> (approved, Professional, rich data, DE 19% VAT invoices), <code>petr@vltava-reality.cz</code> (approved, Starter at full quota, reverse-charge invoices, CZK estimates), <code>sofia@atlantico-imo.pt</code> (unverified — walks the full gate with all empty states). All mock data is scoped by <code>agentId</code>.</li>
              <li><strong>Germany/EU compliance in the panel</strong> (2026-07-30): GEG §87 energy-certificate fieldset in the listing editor (certificate type, kWh/(m²·a) value, energy source, year) — required before a German listing can go active and surfaced on the public exposé; invoices show net + VAT + gross (19% domestic for DE, reverse-charge 0% for VIES-validated EU firms); the agent shell links Imprint / Privacy / Terms / Cookie settings on desktop sidebar and in the mobile account menu; the inquiries page carries a GDPR purpose-limitation + 12-month-retention note.</li>
              <li><strong>Agent shell chrome</strong>: the language picker lives in the desktop top bar (next to the verification chip) so its dropdown opens into the viewport — never in the sidebar footer; logout stays in the sidebar footer. On mobile the top bar keeps the globe bottom-sheet and adds a compact account menu (agent identity, logout, legal links); the active nav tab auto-scrolls into view in the mobile rail.</li>
            </ul>
          </div>
        </Section>

        {/* ---- Feedback ---- */}
        <Section id="feedback" title="Feedback & loading">
          <div className="flex flex-col gap-5 rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => toast("Saved successfully")}>Success toast</Button>
              <Button variant="secondary" onClick={() => toast("Something went wrong", "error")}>Error toast</Button>
              <Button variant="secondary" onClick={() => toast("Heads up — informational", "info")}>Info toast</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
              <CardSkeleton />
            </div>
            <EmptyState title="No results found">Adjust your filters or widen the search radius.</EmptyState>
            <ErrorState message="Something went wrong while loading — demo." onRetry={() => toast("Retried", "info")} />
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li><code>ErrorState</code> pairs with <code>useApi().error + reload</code> — used on search, map and home featured sections.</li>
              <li><code>ConfirmDialog</code> (Modal-based) guards destructive actions: saved-search delete, bulk listing delete, MFA disable, account deletion.</li>
              <li>The shared <code>Modal</code> is portal-rendered with a focus trap (initial focus, Tab cycle, Escape, focus restore) and a Phosphor X close at 44px.</li>
              <li><code>Input type="password"</code> ships a show/hide toggle; <code>Field</code> renders hint and error together.</li>
              <li>Unknown routes render a real 404 page (<code>NotFoundPage</code>) inside the public shell; route changes scroll to top.</li>
            </ul>
          </div>
        </Section>

        {/* ---- Localization ---- */}
        <Section id="i18n" title="Localization (i18n)"
          note="Locale-prefixed URLs (/de/…, /en/…) drive the whole page: switching the language in the header or footer re-renders every visible string, resets <html lang> and keeps the current path + query.">
          <div className="flex flex-col gap-5 rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex flex-wrap gap-1.5">
              {LOCALES.map((l) => (
                <span key={l.code} className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800">
                  <span className="t-overline text-[10px] text-muted">{l.code}</span> {l.label}
                </span>
              ))}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li><strong>Coverage (2026-07-30):</strong> all 9 locales are fully translated — ~784 keys each, verified for 1:1 key parity with EN (<code>tools/hotspot/i18n-parity.mjs</code>). EN + DE live inline in <code>dictionaries.ts</code>; FR/ES/PT/NL/CS/PL/SK live in <code>shared/i18n/locales/*</code>. EN fallback remains only as a safety net for keys added before their translations land.</li>
              <li><strong>Status labels:</strong> <code>StatusBadge</code> translates every workflow status through the <code>status.*</code> namespace (active/sold/draft/approved/queued/failed/…) — never render raw status strings.</li>
              <li><strong>API:</strong> <code>t(key)</code> with <code>{"{placeholder}"}</code> interpolation — e.g. <code>{`t("detail.showAllPhotos", { n: 8 })`}</code> → “Show all 8 photos” / “Alle 8 Fotos anzeigen”. Never concatenate sentence fragments; word order differs per language.</li>
              <li><strong>Data labels:</strong> enum-like data values are translated through key namespaces — <code>cat.*</code> (category tiles), <code>kind.*</code> (property types), <code>amen.*</code> (amenities). Listing titles/descriptions stay source-language (translated later by the AI exposé pipeline).</li>
              <li><strong>Selector:</strong> the header <code>LanguageSelector</code> (dropdown grid on desktop, bottom sheet on mobile) and the footer select both call <code>switchLocale</code>, which swaps the URL prefix and preserves path + query.</li>
              <li><strong>Brand terms</strong> stay untranslated in every locale: REVALO24, Off-Market, Top, Exposé (DE), OpenImmo, Stripe.</li>
            </ul>
          </div>
        </Section>

        <footer className="border-t border-slate-300 pt-6 text-xs text-muted">
          REVALO24 Design System · tokens in <code>frontend/src/app/index.css</code> · components in <code>frontend/src/shared/ui</code> · Figma library “REVALO 24”
        </footer>
      </main>
    </div>
  );
}
