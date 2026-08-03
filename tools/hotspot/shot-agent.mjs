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

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await login(desktop);
await desktop.goto("http://localhost:5173/en/agent", { waitUntil: "networkidle" });
await desktop.waitForTimeout(3500);
await desktop.screenshot({ path: "output/agent-desktop.png", fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await login(mobile);
await mobile.goto("http://localhost:5173/en/agent", { waitUntil: "networkidle" });
await mobile.waitForTimeout(3500);
await mobile.screenshot({ path: "output/agent-mobile.png", fullPage: true });

await browser.close();
console.log("done");
