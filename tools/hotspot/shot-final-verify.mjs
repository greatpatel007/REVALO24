import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const browser = await chromium.launch();

async function login(page, email) {
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle" });
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "demo1234");
  await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
  await page.waitForTimeout(1500);
}

// Anna desktop dashboard EN + Czech subscription (new locale proof)
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await login(page, "anna@kraemer-immo.de");
  await page.goto(`${BASE}/en/agent`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: "output/final-dash-desktop.png", fullPage: true });
  await page.goto(`${BASE}/cs/agent/subscription`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "output/final-sub-cs.png", fullPage: true });
  await page.close();
}

// Anna mobile dashboard DE + inquiries DE (overflow fix proof)
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page, "anna@kraemer-immo.de");
  await page.goto(`${BASE}/de/agent`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: "output/final-dash-mobile-de.png", fullPage: true });
  await page.goto(`${BASE}/de/agent/inquiries`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "output/final-inq-mobile-de.png", fullPage: true });
  await page.close();
}

// Sofia gate (restricted dashboard) in Portuguese — new locale + gate together
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(page, "sofia@atlantico-imo.pt");
  await page.goto(`${BASE}/pt/agent`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "output/final-gate-pt.png", fullPage: true });
  await page.close();
}

await browser.close();
console.log("screenshots done");
