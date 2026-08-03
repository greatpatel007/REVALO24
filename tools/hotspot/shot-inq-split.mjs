import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

await page.goto("http://localhost:5173/en/agent/inquiries", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots/inq-split-desktop.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/inq-split-mobile.png", fullPage: true });

/* Expand first card on mobile */
const first = page.locator("ul.lg\\:hidden li button").first();
if (await first.isVisible()) {
  await first.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "shots/inq-split-mobile-open.png", fullPage: true });
}

await browser.close();
console.log("ok");
