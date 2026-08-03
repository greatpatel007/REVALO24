/* Post-typography-pass eyeball screenshots: DS typography section, home, exposé. */
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const shots = [
  ["typo-ds", "/designsystem#typography"],
  ["typo-home", "/en"],
  ["typo-expose", "/en/property/10"],
];

for (const [slug, path] of shots) {
  await page.goto(`http://localhost:5173${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const accept = page.getByRole("button", { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) await accept.click();
  if (path.includes("#typography")) {
    await page.evaluate(() => document.getElementById("typography")?.scrollIntoView());
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `output/${slug}.png`, fullPage: false });
  console.log(`captured ${slug}`);
}
await browser.close();
