/* Public-route overflow sweep after the typography pass — DE and NL
   (longest strings + compound words), narrow widths.
   Usage: node overflow-public.mjs */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const LOCALES = ["de", "nl"];
const ROUTES = ["/", "/properties", "/property/1", "/off-market", "/legal/terms", "/legal/privacy", "/contact", "/register"];
const WIDTHS = [320, 360, 390, 768];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let failures = 0;

await page.goto(`${BASE}/en/`, { waitUntil: "domcontentloaded" });
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/${locale}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      const res = await page.evaluate(() => {
        const doc = document.documentElement;
        const overflow = doc.scrollWidth - doc.clientWidth;
        if (overflow <= 0) return null;
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 40) {
            offenders.push(`${el.tagName}.${String(el.className).split(" ").slice(0, 3).join(".")} right=${Math.round(r.right)}`);
            if (offenders.length >= 4) break;
          }
        }
        return { overflow, offenders };
      });
      if (res) {
        failures++;
        console.log(`FAIL ${locale} ${route} @${width}: +${res.overflow}px`);
        for (const o of res.offenders) console.log(`     ${o}`);
      }
    }
  }
  console.log(`done: ${locale}`);
}

await browser.close();
console.log(failures ? `${failures} overflow failures` : "all clean — no horizontal overflow");
process.exit(failures ? 1 : 0);
