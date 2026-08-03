/* One-off: capture the agent inquiries page for the better-interface review */
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/en/login", { waitUntil: "networkidle" });
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.fill('input[type="email"]', "anna@kraemer-immo.de");
await page.fill('input[type="password"]', "demo1234");
await page.getByRole("button", { name: /log in|sign in|login/i }).first().click();
await page.waitForTimeout(1500);

await page.goto("http://localhost:5173/en/agent/inquiries", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "shots/inq-desktop.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: "shots/inq-mobile.png", fullPage: true });

// keyboard walk: tab 12 times, record focused element + visible focus ring
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(400);
const focusLog = [];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab");
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return "none";
    const s = getComputedStyle(el);
    const ring = s.boxShadow !== "none" || s.outlineStyle !== "none";
    return `${el.tagName}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""} "${(el.textContent || "").trim().slice(0, 30)}" ring=${ring}`;
  });
  focusLog.push(info);
}
console.log(focusLog.join("\n"));
await browser.close();
