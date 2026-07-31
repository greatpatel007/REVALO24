/** Runtime font-pair lab — evaluation only. Default tokens stay Jakarta + Inter
    (client / Figma). URLs must stay in sync with the boot script in index.html. */

export const FONT_PAIR_STORAGE_KEY = "r24.fontPair";
export const DEFAULT_FONT_PAIR_ID = "jakarta-inter";
export const FONT_PAIR_LINK_ID = "r24-font-pair";

export type FontPairId = "jakarta-inter" | "noto-sans" | "lato" | "source-sans-3";

export interface FontPair {
  id: FontPairId;
  /** Untranslated typeface names for the Lab select */
  label: string;
  /** Google Fonts CSS2 stylesheet URL */
  href: string;
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: "jakarta-inter",
    label: "Jakarta + Inter (client)",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=Plus+Jakarta+Sans:wght@500..800&display=swap",
  },
  {
    id: "noto-sans",
    label: "Noto Sans (EU/CEE)",
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400..800&display=swap",
  },
  {
    id: "lato",
    /* GF Lato ships 400/700/900 only — no 500/600/800; closest face is used */
    label: "Lato (EU/CEE · PL-native)",
    href: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap",
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3 (EU/CEE)",
    href: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400..800&display=swap",
  },
];

const byId = Object.fromEntries(FONT_PAIRS.map((p) => [p.id, p])) as Record<FontPairId, FontPair>;

export function isFontPairId(value: string | null | undefined): value is FontPairId {
  return !!value && value in byId;
}

export function getFontPair(id: string | null | undefined): FontPair {
  return isFontPairId(id) ? byId[id] : byId[DEFAULT_FONT_PAIR_ID];
}

export function getStoredFontPairId(): FontPairId {
  try {
    const raw = localStorage.getItem(FONT_PAIR_STORAGE_KEY);
    return isFontPairId(raw) ? raw : DEFAULT_FONT_PAIR_ID;
  } catch {
    return DEFAULT_FONT_PAIR_ID;
  }
}

/** Swap the active Google Fonts stylesheet (single link node). */
export function ensureFontStylesheet(id: FontPairId): void {
  const pair = getFontPair(id);
  const link = document.getElementById(FONT_PAIR_LINK_ID) as HTMLLinkElement | null;
  if (link) {
    if (link.href !== pair.href) link.href = pair.href;
    return;
  }
  const created = document.createElement("link");
  created.id = FONT_PAIR_LINK_ID;
  created.rel = "stylesheet";
  created.href = pair.href;
  document.head.appendChild(created);
}

/** Persist pair, set data-font-pair, load stylesheet. Instant whole-app update. */
export function applyFontPair(id: string): FontPairId {
  const pair = getFontPair(id);
  document.documentElement.dataset.fontPair = pair.id;
  try {
    localStorage.setItem(FONT_PAIR_STORAGE_KEY, pair.id);
  } catch {
    /* private mode — still apply for the session */
  }
  ensureFontStylesheet(pair.id);
  return pair.id;
}
