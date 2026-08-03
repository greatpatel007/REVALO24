/* One-off: 2x close-ups after PriceTag + energy badge changes. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/en/properties", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.waitForTimeout(400);

// a rent card if possible (shows "/ mo" suffix), else first card
const card = page.locator("article").nth(1);
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await card.screenshot({ path: "output/check-price-card.png" });

// exposé price + energy scale
const href = await page.locator('article a[href*="/property/"]').first().getAttribute("href");
await page.goto(`http://localhost:5173${href}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "output/check-detail-price.png", clip: { x: 0, y: 60, width: 1440, height: 560 } });
await browser.close();
console.log("done");
