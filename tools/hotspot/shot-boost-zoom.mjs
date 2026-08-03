import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in/i }).first().click();
await page.waitForTimeout(1500);
await page.goto("http://localhost:5173/en/agent/placements", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const section = page.locator("section", { hasText: "Currently boosted" }).last();
await section.scrollIntoViewIfNeeded();
await section.screenshot({ path: "output/boosted-zoom.png" });
await browser.close();
console.log("done");
