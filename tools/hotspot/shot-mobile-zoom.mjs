import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

await page.goto("http://localhost:5173/en/agent/listings", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: "output/zoom-listings.png", clip: { x: 0, y: 120, width: 390, height: 620 } });

await page.goto("http://localhost:5173/en/property/2", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const units = page.locator("section", { hasText: "Available units" }).last();
await units.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await units.screenshot({ path: "output/zoom-units.png" });

await browser.close();
