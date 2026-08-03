/* Pinpoints true overflow offenders at 320px, ignoring elements inside
   horizontally scrollable containers (e.g. the mobile nav rail). */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const TARGETS = [
  { email: "anna@kraemer-immo.de", routes: ["/de/agent/inquiries", "/de/agent/placements", "/de/agent/ai", "/de/agent/listings/new"] },
  { email: "sofia@atlantico-imo.pt", routes: ["/de/agent/profile"] },
];

const browser = await chromium.launch();
for (const t of TARGETS) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.fill('input[type="email"]', t.email);
  await page.fill('input[type="password"]', "demo1234");
  await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
  await page.waitForTimeout(1200);

  for (const route of t.routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const report = await page.evaluate(() => {
      const doc = document.documentElement;
      const cw = doc.clientWidth;
      const overflow = doc.scrollWidth - cw;
      if (overflow <= 0) return "clean";
      const inScroller = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden)/.test(s.overflowX)) return true;
        }
        return false;
      };
      const lines = [`overflow +${overflow}px`];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right > cw + 1 && !inScroller(el)) {
          const cls = String(el.className).split(" ").slice(0, 6).join(".");
          const text = (el.textContent || "").trim().slice(0, 40);
          lines.push(`  ${el.tagName}.${cls} right=${Math.round(r.right)} "${text}"`);
          if (lines.length > 10) break;
        }
      }
      return lines.join("\n");
    });
    console.log(`--- ${route}\n${report}`);
  }
  await ctx.close();
}
await browser.close();
