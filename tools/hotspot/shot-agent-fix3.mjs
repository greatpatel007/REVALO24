import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 950 } });

await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

// Inquiries polish
await page.goto("http://localhost:5173/en/agent/inquiries", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "output/fix-inquiries.png", fullPage: true });

// Dashboard reply button
await page.goto("http://localhost:5173/en/agent", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: "output/fix-dashboard.png", fullPage: true });

// Listings bulk bar with selection + cancel
await page.goto("http://localhost:5173/en/agent/listings", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const boxes = page.locator('tbody input[type="checkbox"]');
await boxes.nth(0).check();
await boxes.nth(1).check();
await boxes.nth(2).check();
await page.waitForTimeout(400);
await page.screenshot({ path: "output/fix-listings.png", fullPage: false });

await browser.close();
console.log("done");
