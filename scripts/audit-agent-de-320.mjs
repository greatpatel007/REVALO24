import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync(".tmp-audit", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 320, height: 844 } });
await ctx.addInitScript(() => {
  try {
    localStorage.setItem("r24.cookieChoice", "essential");
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4173/de/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.click('button[type="submit"]');
await page.waitForURL(/\/de\/agent/, { timeout: 15000 });

const routes = [
  "/de/agent",
  "/de/agent/listings",
  "/de/agent/listings/new",
  "/de/agent/inquiries",
  "/de/agent/profile",
];
let fails = 0;
for (const r of routes) {
  await page.goto(`http://127.0.0.1:4173${r}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const rep = await page.evaluate(() => ({
    scrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    vw: innerWidth,
  }));
  const ok = rep.scrollW <= rep.vw + 1;
  if (!ok) fails++;
  console.log(`${ok ? "OK" : "FAIL"} ${r} scrollW=${rep.scrollW}`);
  await page.screenshot({
    path: `.tmp-audit/de${r.replace(/\//g, "_")}.png`,
    fullPage: true,
  });
}

await page.goto("http://127.0.0.1:4173/en/agent", { waitUntil: "networkidle" });
const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const paints = performance.getEntriesByType("paint");
  return {
    domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
    load: Math.round(nav?.loadEventEnd || 0),
    fcp: Math.round(paints.find((p) => p.name === "first-contentful-paint")?.startTime || 0),
  };
});
console.log("EN agent nav timings", perf);
await browser.close();
console.log("DE fails", fails);
process.exit(fails ? 1 : 0);
