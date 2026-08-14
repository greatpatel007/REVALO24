/**
 * Agent panel 320px overflow + smoke audit (Playwright + system Chrome).
 * Usage: node scripts/audit-agent-320.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:4173";
const WIDTH = 320;
const HEIGHT = 844;
const OUT = join(process.cwd(), ".tmp-audit");

const ROUTES = [
  "/en/agent",
  "/en/agent/listings",
  "/en/agent/inquiries",
  "/en/agent/listings/new",
  "/en/agent/ai",
  "/en/agent/import",
  "/en/agent/placements",
  "/en/agent/subscription",
  "/en/agent/profile",
];

mkdirSync(OUT, { recursive: true });

function overflowReport() {
  const doc = document.documentElement;
  const body = document.body;
  const vw = window.innerWidth;
  const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
  const offenders = [];
  const all = document.querySelectorAll("body *");
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && typeof el.className === "string" ? el.className : "").slice(0, 120);
      offenders.push({
        tag,
        cls,
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        text: (el.textContent || "").trim().slice(0, 60),
      });
      if (offenders.length >= 25) break;
    }
  }
  return {
    vw,
    scrollW,
    overflowPx: scrollW - vw,
    hasOverflow: scrollW > vw + 1,
    bottomNav: !!document.querySelector('nav[aria-label]'),
    offenders,
  };
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
await context.addInitScript(() => {
  try {
    localStorage.setItem("r24.cookieChoice", "essential");
  } catch {
    /* ignore */
  }
});
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

/* Login as approved demo agent */
await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"], input[name="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"], input[name="password"]', "demo1234");
await page.click('button[type="submit"]');
await page.waitForURL(/\/en\/agent/, { timeout: 15000 });

const results = [];
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(400);
  const report = await page.evaluate(overflowReport);
  const shot = join(OUT, `${route.replace(/\//g, "_").slice(1)}.png`);
  await page.screenshot({ path: shot, fullPage: true });

  /* More sheet only on shell routes with bottom tabs */
  let moreOk = null;
  if (!route.includes("/listings/new") && !route.match(/\/listings\/\d+/)) {
    try {
      const moreBtn = page.getByRole("button", { name: /^more$/i });
      if (await moreBtn.count()) {
        await moreBtn.first().click({ timeout: 5000 });
        await page.waitForTimeout(200);
        moreOk = (await page.locator('[role="dialog"]').count()) > 0;
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
    } catch (e) {
      moreOk = false;
      console.log(`MORE_FAIL ${route}: ${e}`);
    }
  }

  results.push({
    route,
    ...report,
    moreOk,
    shot,
  });
  console.log(
    `${report.hasOverflow ? "FAIL" : "OK  "} ${route} scrollW=${report.scrollW} overflow=${report.overflowPx} more=${moreOk}`,
  );
}

await browser.close();

const summary = {
  width: WIDTH,
  consoleErrors: [...new Set(consoleErrors)].slice(0, 40),
  fails: results.filter((r) => r.hasOverflow),
  results,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(summary, null, 2));
console.log("\n--- summary ---");
console.log(`routes: ${results.length}, overflow fails: ${summary.fails.length}`);
console.log(`console errors: ${summary.consoleErrors.length}`);
if (summary.fails.length) {
  for (const f of summary.fails) {
    console.log(`\nOVERFLOW ${f.route} (+${f.overflowPx}px)`);
    for (const o of f.offenders.slice(0, 8)) {
      console.log(`  <${o.tag}.${o.cls}> L${o.left} R${o.right} "${o.text}"`);
    }
  }
  process.exitCode = 1;
}
