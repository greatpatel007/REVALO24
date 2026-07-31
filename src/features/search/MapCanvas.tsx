import { useState, type ReactNode } from "react";
import type { GeoPoint, Property } from "@/shared/types";
import { GoogleMapCanvas } from "./GoogleMapCanvas";
import { LeafletMapCanvas } from "./LeafletMapCanvas";
import { GMAPS_KEY } from "./googleMapsLoader";

export { shortPrice } from "./mapMarkers";

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

export function MapCanvas(props: MapCanvasProps) {
  const [gmapsFailed, setGmapsFailed] = useState(false);
  if (GMAPS_KEY && !gmapsFailed) {
    return <GoogleMapCanvas {...props} onLoadError={() => setGmapsFailed(true)} />;
  }
  return <LeafletMapCanvas {...props} />;
}
