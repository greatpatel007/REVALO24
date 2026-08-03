import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

for (const [slug, path] of [
  ["listings", "/en/agent/listings"],
  ["import", "/en/agent/import"],
]) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const tables = await page.locator("table:visible").count();
  const cards = await page.locator("ul.grid li:visible, section.md\\:hidden li:visible").count();
  console.log(`${slug}: visible tables=${tables}, visible mobile cards=${cards}`);
  await page.screenshot({ path: `output/d-${slug}.png` });
}
await browser.close();
