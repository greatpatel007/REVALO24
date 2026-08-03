/* Visual hotspot test — step 1: capture.
   Screenshots the first viewport of the six key conversion pages (desktop +
   mobile) against the running dev server, and exports the bounding boxes of
   each page's conversion targets so hotspot.py can score how much predicted
   attention they receive. Output goes to ./output (gitignored). */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.HOTSPOT_BASE_URL ?? "http://localhost:5173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "output");

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900, isMobile: false },
  { id: "mobile", width: 390, height: 844, isMobile: true },
];

/* Conversion targets per page. Selectors resolve against the EN locale.
   Missing/hidden targets are skipped (e.g. desktop-only controls on mobile). */
const PAGES = [
  {
    slug: "home",
    path: "/en",
    targets: [
      { name: "Search button", sel: 'form button[type="submit"]' },
      { name: "Search input", sel: 'input[type="search"]' },
      { name: "Register (header)", sel: 'header a[href*="/register"]' },
    ],
  },
  {
    slug: "search-list",
    path: "/en/properties",
    targets: [
      { name: "First property card", sel: "article" },
      { name: "Save search", sel: 'button:has-text("Save search")' },
    ],
  },
  {
    slug: "map",
    path: "/en/map",
    targets: [
      { name: "First result card", sel: "article" },
      { name: "Save search", sel: 'button:has-text("Save search")' },
    ],
  },
  {
    slug: "detail",
    path: null, // resolved from the first card on /en/properties
    targets: [
      { name: "Price", sel: "text=/^€/" },
      { name: "Contact agent CTA", sel: 'button:has-text("Contact agent")' },
      { name: "Title", sel: "h1" },
    ],
  },
  {
    slug: "off-market",
    path: "/en/off-market",
    targets: [
      { name: "Enter access code CTA", sel: 'button:has-text("Enter access code")' },
      { name: "First off-market card", sel: "article" },
    ],
  },
  {
    slug: "agents",
    path: "/en/agents",
    targets: [
      { name: "Create agent account", sel: 'a[href*="register?role=agent"]' },
      { name: "View plans", sel: 'a[href="#plans"]' },
    ],
  },
];

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // lazy images inside the first viewport
  await page
    .evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((i) => !i.complete)
          .map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
      ),
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
}

async function dismissCookies(page) {
  const btn = page.getByRole("button", { name: /accept all/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(400);
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function targetBoxes(page, targets, vp) {
  const boxes = [];
  for (const t of targets) {
    const loc = page.locator(t.sel).first();
    const box = await loc.boundingBox().catch(() => null);
    if (!box) continue;
    // keep only the part visible in the first viewport
    const x1 = clamp(box.x, 0, vp.width);
    const y1 = clamp(box.y, 0, vp.height);
    const x2 = clamp(box.x + box.width, 0, vp.width);
    const y2 = clamp(box.y + box.height, 0, vp.height);
    if (x2 - x1 < 4 || y2 - y1 < 4) continue; // off-screen
    boxes.push({ name: t.name, x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) });
  }
  return boxes;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });
  const page = await context.newPage();

  // resolve the detail exposé URL from the first search result once per context
  await page.goto(`${BASE}/en/properties`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await dismissCookies(page); // persists in this context from here on
  const detailHref = await page
    .locator('article a[href*="/property/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  for (const p of PAGES) {
    const path = p.path ?? detailHref;
    if (!path) {
      console.warn(`skip ${p.slug}-${vp.id}: no URL`);
      continue;
    }
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await dismissCookies(page);

    const file = `${p.slug}-${vp.id}`;
    await page.screenshot({ path: join(OUT, `${file}.png`) });
    const boxes = await targetBoxes(page, p.targets, vp);
    writeFileSync(
      join(OUT, `${file}.json`),
      JSON.stringify({ page: p.slug, url: `${BASE}${path}`, viewport: { w: vp.width, h: vp.height }, targets: boxes }, null, 2),
    );
    console.log(`captured ${file} (${boxes.length} targets)`);
  }
  await context.close();
}

await browser.close();
console.log(`done → ${OUT}`);
