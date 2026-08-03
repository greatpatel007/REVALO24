import { lazy, Suspense, useState, type ReactNode } from "react";
import type { GeoPoint, Property } from "@/shared/types";
import { GMAPS_KEY } from "./googleMapsLoader";

export { shortPrice } from "./mapMarkers";

/* Map engines are dynamically imported so Leaflet (~CSS+JS) and the Google
   marker clusterer never land in the landing/search entry chunk. */

const GoogleMapCanvas = lazy(() =>
  import("./GoogleMapCanvas").then((m) => ({ default: m.GoogleMapCanvas })),
);
const LeafletMapCanvas = lazy(() =>
  import("./LeafletMapCanvas").then((m) => ({ default: m.LeafletMapCanvas })),
);

/* MapCanvas = the one map contract for every screen (browse map, home teaser,
   exposé snippet). Engine selection:
   - VITE_GOOGLE_MAPS_API_KEY set → real Google Maps JS SDK (§4.3)
   - keyless, or the Google SDK fails to load → Leaflet + OSM/Esri tiles,
     equally interactive (pan/zoom/clusters) and free of any API key
   Both engines share the brand pill markers (mapMarkers.ts) and this prop
   contract, so consumers never know which one rendered. */

export interface MapCanvasProps {
  properties: Property[];
  activeId?: number | null;
  onMarkerClick?: (id: number) => void;
  radiusKm?: number;
  /** Focus viewport on a point (e.g. exposé snippet); omit for the results overview */
  center?: GeoPoint;
  zoom?: number;
  /** false renders a locked, decorative map, e.g. the home teaser */
  interactive?: boolean;
  /** kept for API compatibility; both engines always show attribution */
  showAttribution?: boolean;
  children?: ReactNode;
}

function MapFallback() {
  return <div className="h-full min-h-48 w-full animate-pulse rounded-xl bg-slate-200" aria-hidden />;
}

export function MapCanvas(props: MapCanvasProps) {
  const [gmapsFailed, setGmapsFailed] = useState(false);
  return (
    <Suspense fallback={<MapFallback />}>
      {GMAPS_KEY && !gmapsFailed ? (
        <GoogleMapCanvas {...props} onLoadError={() => setGmapsFailed(true)} />
      ) : (
        <LeafletMapCanvas {...props} />
      )}
    </Suspense>
  );
}
