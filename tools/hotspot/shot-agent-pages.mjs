import { chromium } from "playwright";

const browser = await chromium.launch();

async function login(page) {
  await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.fill('input[type="email"]', "anna@kraemer-immo.de");
  await page.fill('input[type="password"]', "demo1234");
  await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
  await page.waitForTimeout(1500);
}

const PAGES = [
  ["inquiries", "/en/agent/inquiries"],
  ["ai", "/en/agent/ai"],
  ["import", "/en/agent/import"],
  ["placements", "/en/agent/placements"],
  ["subscription", "/en/agent/subscription"],
  ["profile", "/en/agent/profile"],
];

for (const [w, tag] of [[1920, "desktop"], [390, "mobile"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: w > 500 ? 900 : 844 } });
  await login(page);
  for (const [slug, path] of PAGES) {
    await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `output/ap-${slug}-${tag}.png`, fullPage: true });
    console.log(`captured ap-${slug}-${tag}`);
  }
  await page.close();
}
await browser.close();
