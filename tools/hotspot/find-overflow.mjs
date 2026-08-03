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
await page.goto("http://localhost:5173/en/agent", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

const offenders = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 && r.width > 0) {
      out.push(`${el.tagName}.${String(el.className).slice(0, 90)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
  }
  return out.slice(0, 25);
});
console.log(offenders.join("\n"));
await browser.close();
