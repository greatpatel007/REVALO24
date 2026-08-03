import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "sofia@atlantico-imo.pt");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1200);
await page.goto("http://localhost:5173/de/agent/profile", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

const report = await page.evaluate(() => {
  const doc = document.documentElement;
  const cw = doc.clientWidth;
  const lines = [`clientWidth=${cw} scrollWidth=${doc.scrollWidth}`];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > cw + 1) {
      const s = getComputedStyle(el);
      const cls = String(el.className).split(" ").slice(0, 6).join(".");
      lines.push(`${el.tagName}.${cls} right=${Math.round(r.right)} w=${Math.round(r.width)} ovX=${s.overflowX} "${(el.textContent || "").trim().slice(0, 30)}"`);
    }
  }
  return lines.join("\n");
});
console.log(report);
await browser.close();
