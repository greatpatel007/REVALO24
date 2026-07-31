/** Copy index.html → 404.html so GitHub Pages deep links boot the SPA. */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const index = join(dist, "index.html");
const notFound = join(dist, "404.html");

if (!existsSync(index)) {
  console.error("pages-spa: dist/index.html missing — run vite build first");
  process.exit(1);
}
copyFileSync(index, notFound);
console.log("pages-spa: wrote dist/404.html");
