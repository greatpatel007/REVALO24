import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://localhost:5173/en/register", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.screenshot({ path: "output/register-private.png", fullPage: true });

await page.getByRole("radio", { name: /agent/i }).or(page.getByRole("button", { name: /agent/i })).first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "output/register-agent.png", fullPage: true });

// mobile sanity
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://localhost:5173/en/register", { waitUntil: "networkidle" });
await mobile.waitForTimeout(1200);
const accept2 = mobile.getByRole("button", { name: /accept all/i }).first();
if (await accept2.isVisible().catch(() => false)) await accept2.click();
await mobile.screenshot({ path: "output/register-mobile.png", fullPage: false });

await browser.close();
console.log("done");
