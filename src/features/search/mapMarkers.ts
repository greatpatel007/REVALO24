import type { Property } from "@/shared/types";

/* Marker DOM shared by both real-map engines (Google / Leaflet). Plain
   elements because neither SDK renders React content; classes mirror the
   PropertyCard/pill design language 1:1. */

export function shortPrice(p: Property): string {
  if (p.offMarket) return "•••";
  if (p.listingType === "rent") return `€${(p.price / 1000).toFixed(1)}k`;
  return p.price >= 1_000_000 ? `€${(p.price / 1_000_000).toFixed(1)}M` : `€${Math.round(p.price / 1000)}k`;
}

/* Phosphor Lock (bold), inlined SVG */
const LOCK_SVG =
  '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208,80H180V56a52,52,0,0,0-104,0V80H48A20,20,0,0,0,28,100V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V100A20,20,0,0,0,208,80ZM100,56a28,28,0,0,1,56,0V80H100Zm104,148H52V104H204Z"/></svg>';

export function pillEl(p: Property, isActive: boolean): HTMLElement {
  const tone = p.offMarket
    ? "bg-premium text-premium-accent"
    : isActive ? "bg-navy text-white"
    : p.placement === "top" ? "bg-action text-white" : "bg-white text-navy";
  const caret = p.offMarket ? "bg-premium" : isActive ? "bg-navy" : p.placement === "top" ? "bg-action" : "bg-white";
  const el = document.createElement("div");
  el.className = "cursor-pointer";
  el.innerHTML =
    `<span class="flex min-h-7 items-center gap-1 rounded-md px-2.5 text-xs font-bold shadow-elevation-md ${tone}">` +
    `${p.offMarket ? LOCK_SVG : ""}${shortPrice(p)}</span>` +
    `<span class="mx-auto block h-2 w-2 -translate-y-1 rotate-45 ${caret}"></span>`;
  return el;
}

export function clusterEl(count: number): HTMLElement {
  const el = document.createElement("div");
  el.className =
    "flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-action text-sm font-extrabold text-white shadow-elevation-md";
  el.textContent = String(count);
  return el;
}
