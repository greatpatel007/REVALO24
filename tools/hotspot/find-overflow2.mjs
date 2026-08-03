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

const report = await page.evaluate(() => {
  const lines = [];
  const label = (el) => `${el.tagName}.${String(el.className).split(" ").slice(0, 4).join(".")}`;
  // Find the recent inquiries section and chart section and report subtree widths
  for (const sec of document.querySelectorAll("main section, main ul, main li")) {
    const r = sec.getBoundingClientRect();
    if (r.width > 400) lines.push(`${label(sec)} w=${Math.round(r.width)}`);
  }
  // measure min-content of chart + inquiry list
  for (const el of document.querySelectorAll("main section")) {
    const clone = el.cloneNode(true);
    clone.style.position = "absolute"; clone.style.width = "min-content"; clone.style.visibility = "hidden";
    document.body.appendChild(clone);
    lines.push(`min-content ${label(el)} = ${Math.round(clone.getBoundingClientRect().width)}`);
    clone.remove();
  }
  return lines.join("\n");
});
console.log(report);
await browser.close();
