/* HomePage better-interface review — desktop + mobile screenshots + keyboard spot-check */
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:5173/en/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const accept = page.getByRole("button", { name: /accept all/i }).first();
if (await accept.isVisible().catch(() => false)) await accept.click();
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/home-review-desktop.png", fullPage: true });

/* Combobox keyboard */
await page.locator('input[type="search"]').first().fill("Mun");
await page.waitForTimeout(500);
const listbox = await page.locator("#hero-suggestions").isVisible().catch(() => false);
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(200);
const ariaActive = await page.locator('input[type="search"]').getAttribute("aria-activedescendant");
console.log({ listbox, ariaActive });

/* Hit areas on popular city chips */
const chips = await page.evaluate(() => {
  const links = [...document.querySelectorAll("section:first-of-type a")].filter((a) =>
    /München|Berlin|Praha|Warszawa|Amsterdam|Lisboa/i.test(a.textContent || ""),
  );
  return chips_info(links);
  function chips_info(els) {
    return els.slice(0, 3).map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) };
    });
  }
});
console.log("cityChips", chips);

/* Heading outline */
const headings = await page.evaluate(() =>
  [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 50)}`),
);
console.log(headings.join("\n"));

/* Map section: how many links to /map */
const mapLinks = await page.evaluate(() =>
  [...document.querySelectorAll('a[href*="/map"]')].map((a) => ({
    label: a.getAttribute("aria-label") || a.textContent.trim().slice(0, 40),
    tabIndex: a.tabIndex,
    classes: String(a.className).slice(0, 60),
  })),
);
console.log("mapLinks", mapLinks);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/home-review-mobile.png", fullPage: true });

/* overflow at 320 */
await page.setViewportSize({ width: 320, height: 700 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log({ overflow320: overflow });

await browser.close();
