/* Compares translation key coverage: every EN key in dictionaries.ts must
   exist in each locale file (fr/es/pt/nl/cs/pl/sk). ASCII double quotes only
   appear as string delimiters in these files, so a simple regex is safe. */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../frontend/src/shared/i18n");

function keysOf(source, sliceStart, sliceEnd) {
  const text = source.slice(sliceStart, sliceEnd);
  const out = new Set();
  for (const m of text.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)) out.add(m[1]);
  return out;
}

const dict = readFileSync(resolve(root, "dictionaries.ts"), "utf8");
const enStart = dict.indexOf("const en: Dict = {");
const deStart = dict.indexOf("const de: Dict = {");
const enKeys = keysOf(dict, enStart, deStart);
const deKeys = keysOf(dict, deStart, dict.indexOf("export const DICTIONARIES"));

let fail = false;
function report(name, keys) {
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  console.log(`${name}: ${keys.size} keys | missing ${missing.length} | extra ${extra.length}`);
  if (missing.length) { fail = true; console.log("  missing:", missing.join(", ")); }
  if (extra.length) { fail = true; console.log("  extra:", extra.join(", ")); }
}

console.log(`EN baseline: ${enKeys.size} keys`);
report("de", deKeys);
for (const loc of ["fr", "es", "pt", "nl", "cs", "pl", "sk"]) {
  const src = readFileSync(resolve(root, `locales/${loc}.ts`), "utf8");
  report(loc, keysOf(src, 0, src.length));
}
process.exit(fail ? 1 : 0);
