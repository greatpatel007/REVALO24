/* EU energy-performance class (EPC / EPBD label). Colors follow the official
   EU energy-label ladder — A deep green → G red, with dark text on the yellow
   midtones for contrast. EPBD Art. 12 requires the class in property ads, so
   cards show the compact badge and the exposé shows the full ladder.
   Fill colors are compliance-locked; visibility on white surfaces comes from a
   clip-following pure-black edge (printed labels carry the same dark outline). */

export interface EnergyClassDef {
  cls: string;
  bg: string;
  /** yellow midtones need dark text for WCAG contrast */
  dark?: boolean;
}

/* German GEG certificates extend the EU A–G ladder with A+ and H */
export const ENERGY_CLASSES: EnergyClassDef[] = [
  { cls: "A+", bg: "#00843D" },
  { cls: "A", bg: "#009641" },
  { cls: "B", bg: "#52AE32" },
  { cls: "C", bg: "#C8D400", dark: true },
  { cls: "D", bg: "#FFED00", dark: true },
  { cls: "E", bg: "#FBBA00", dark: true },
  { cls: "F", bg: "#EB690B" },
  { cls: "G", bg: "#E2001A" },
  { cls: "H", bg: "#B81C22" },
];

const byClass = (cls: string) => ENERGY_CLASSES.find((c) => c.cls === cls);

/* Right-pointing label arrow, like the arrows on the printed EU label */
const ARROW = "polygon(0 0, calc(100% - 0.5em) 0, 100% 50%, calc(100% - 0.5em) 100%, 0 100%)";

/* drop-shadow follows clip-path (rectangular outline does not). Pure black only —
   never a tinted neutral — so midtone yellows stay crisp on white cards.
   Applied on a separate fill layer so the letter is not filtered soft. */
const EDGE =
  "drop-shadow(0 0.5px 0 oklch(0 0 0 / 0.28)) drop-shadow(0 -0.5px 0 oklch(0 0 0 / 0.28)) " +
  "drop-shadow(0.5px 0 0 oklch(0 0 0 / 0.28)) drop-shadow(-0.5px 0 0 oklch(0 0 0 / 0.28))";

/** Compact class badge — property cards, facts grid, list rows. */
export function EnergyClassBadge({ rating, size = "md" }: { rating: string; size?: "sm" | "md" }) {
  const def = byClass(rating);
  const label = def?.cls ?? rating;
  const bg = def?.bg ?? "#64748B"; /* slate-500 — unknown rating only; not an EPC color */
  const darkText = def ? !!def.dark : true;
  const sizeCls = size === "sm" ? "h-6 min-w-10 pl-2 pr-3.5 text-xs" : "h-7 min-w-12 pl-2.5 pr-4 text-sm";

  return (
    <span
      role="img"
      aria-label={`Energy class ${label}`}
      /* font-sans (Inter): purpose-built for small UI sizes — the display face
         gets muddy below ~12px. Sizes account for the arrow clip eating ~0.5em
         of the right padding. shrink-0 keeps long prices from squashing the tip. */
      className={`relative inline-flex shrink-0 items-center justify-center font-sans font-extrabold leading-none ${
        darkText ? "text-slate-900" : "text-white"
      } ${sizeCls}`}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: bg, clipPath: ARROW, filter: EDGE }}
      />
      <span className="relative">{label}</span>
    </span>
  );
}

/** Full A+–H ladder with the property's class highlighted — exposé "Energy
    performance" block (IS24 pattern, official label colors). */
export function EnergyScale({ active }: { active: string }) {
  return (
    <div role="img" aria-label={`Energy class ${active} on a scale from A+ (best) to H (worst)`} className="flex items-end gap-1">
      {ENERGY_CLASSES.map((c) => {
        const isActive = c.cls === active;
        return (
          <span key={c.cls} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            {/* marker keeps the row height stable */}
            <span aria-hidden className={`text-[10px] font-bold leading-none ${isActive ? "text-navy" : "text-transparent"}`}>▼</span>
            <span
              aria-hidden
              style={{ backgroundColor: c.bg }}
              className={`flex w-full items-center justify-center rounded font-display font-extrabold leading-none outline outline-1 outline-offset-[-1px] outline-black/10 ${
                c.dark ? "text-slate-900" : "text-white"
              } ${isActive ? "h-9 text-sm ring-2 ring-navy ring-offset-1" : "h-7 text-xs opacity-85"}`}
            >
              {c.cls}
            </span>
          </span>
        );
      })}
    </div>
  );
}
