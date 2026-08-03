import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

for (const [slug, path] of [
  ["dash", "/en/agent"],
  ["listings", "/en/agent/listings"],
  ["import", "/en/agent/import"],
  ["subscription", "/en/agent/subscription"],
  ["units", "/en/property/2"],
]) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${slug}: horizontal overflow = ${overflow}px`);
  await page.screenshot({ path: `output/m2-${slug}.png`, fullPage: true });
}
await browser.close();
