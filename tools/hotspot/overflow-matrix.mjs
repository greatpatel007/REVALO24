/* Multi-viewport overflow sweep for the agent panel (plan §2 + §8).
   For each demo account: log in, open every agent route in EN and DE,
   resize through 8 viewport widths and assert scrollWidth === clientWidth.
   Usage: node overflow-matrix.mjs [--quick] */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const QUICK = process.argv.includes("--quick");

const ACCOUNTS = [
  { name: "anna", email: "anna@kraemer-immo.de", routes: ["/agent", "/agent/listings", "/agent/listings/new", "/agent/inquiries", "/agent/ai", "/agent/import", "/agent/placements", "/agent/subscription", "/agent/profile"] },
  { name: "petr", email: "petr@vltava-reality.cz", routes: ["/agent", "/agent/listings", "/agent/subscription"] },
  { name: "sofia", email: "sofia@atlantico-imo.pt", routes: ["/agent", "/agent/listings", "/agent/profile"] },
];
const LOCALES = QUICK ? ["de"] : ["en", "de"];
const WIDTHS = QUICK ? [320, 390, 1440] : [320, 360, 390, 768, 1024, 1280, 1440, 1920];

const browser = await chromium.launch();
let failures = 0;

for (const acct of ACCOUNTS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.fill('input[type="email"]', acct.email);
  await page.fill('input[type="password"]', "demo1234");
  await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
  await page.waitForTimeout(1200);

  for (const locale of LOCALES) {
    for (const route of acct.routes) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/${locale}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1800);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(250);
        const res = await page.evaluate(() => {
          const doc = document.documentElement;
          const overflow = doc.scrollWidth - doc.clientWidth;
          if (overflow <= 0) return null;
          // find widest offenders
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
          console.log(`FAIL ${acct.name} ${locale} ${route} @${width}: +${res.overflow}px`);
          for (const o of res.offenders) console.log(`     ${o}`);
        }
      }
    }
  }
  await ctx.close();
  console.log(`done: ${acct.name}`);
}

await browser.close();
console.log(failures ? `${failures} overflow failures` : "all clean — no horizontal overflow");
process.exit(failures ? 1 : 0);
