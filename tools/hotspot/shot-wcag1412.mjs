/* WCAG 1.4.12 text-spacing resilience check: injects the standard user
   override CSS and screenshots key pages — inspect for clipped/overlapping
   text. Content must remain readable with these values applied. */
import { chromium } from "playwright";

const OVERRIDE = `
  * {
    line-height: 1.5em !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`;

const PAGES = [
  ["home", "/en"],
  ["search", "/en/properties"],
  ["expose", "/en/property/10"],
  ["register", "/en/register"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [slug, path] of PAGES) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  await page.addStyleTag({ content: OVERRIDE });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `output/wcag1412-${slug}.png`, fullPage: false });
  console.log(`captured wcag1412-${slug}`);
}
await browser.close();
