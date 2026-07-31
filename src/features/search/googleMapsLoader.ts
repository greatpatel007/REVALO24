/* Google Maps JS API bootstrap (§4.3). The SDK renders whenever
   VITE_GOOGLE_MAPS_API_KEY is set; without it MapCanvas falls back to the
   demo raster-tile canvas so the app keeps working keyless. */

export const GMAPS_KEY: string | undefined =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || undefined;

/* Advanced Markers need a map ID; Google's documented demo ID works without
   any Cloud-console styling setup. Override for a custom-styled map. */
export const GMAPS_MAP_ID: string =
  (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() || "DEMO_MAP_ID";

declare global {
  interface Window {
    __revaloGmapsReady?: () => void;
  }
}

let loader: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") {
    return Promise.resolve();
  }
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      window.__revaloGmapsReady = () => resolve();
      const s = document.createElement("script");
      s.async = true;
      s.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(GMAPS_KEY ?? "")}` +
        "&v=weekly&loading=async&callback=__revaloGmapsReady";
      s.onerror = () => {
        loader = null; // allow a retry on the next mount
        reject(new Error("Google Maps SDK failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return loader;
}
