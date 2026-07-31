import { useEffect, useRef, useState } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Property } from "@/shared/types";
import type { MapCanvasProps } from "./MapCanvas";
import { clusterEl, pillEl, shortPrice } from "./mapMarkers";
import { GMAPS_MAP_ID, loadGoogleMaps } from "./googleMapsLoader";

/* Real Google Maps implementation of the MapCanvas contract (§4.3).
   Brand price-pill markers are Advanced Markers with custom DOM content, so
   the visual language matches PropertyCard exactly; dense areas cluster
   into count bubbles (click zooms in). */

const EUROPE_CENTER = { lat: 48.5, lng: 9 };

interface GoogleMapCanvasProps extends MapCanvasProps {
  /** Script/SDK load failure — the wrapper swaps in the demo canvas */
  onLoadError?: () => void;
}

export function GoogleMapCanvas({
  properties, activeId = null, onMarkerClick, radiusKm = 0, center, zoom = 6,
  interactive = true, children, onLoadError,
}: GoogleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, { marker: google.maps.marker.AdvancedMarkerElement; property: Property }>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [ready, setReady] = useState(false);

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;

  /* ---- Boot the SDK and create the map once ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        await Promise.all([google.maps.importLibrary("maps"), google.maps.importLibrary("marker")]);
      } catch {
        if (!cancelled) onLoadErrorRef.current?.();
        return;
      }
      if (cancelled || !containerRef.current || mapRef.current) return;
      mapRef.current = new google.maps.Map(containerRef.current, {
        mapId: GMAPS_MAP_ID,
        center: center ?? EUROPE_CENTER,
        zoom: center ? zoom : 5,
        disableDefaultUI: true,
        zoomControl: interactive,
        mapTypeControl: interactive,
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: ["roadmap", "hybrid"],
        },
        gestureHandling: interactive ? "greedy" : "none",
        keyboardShortcuts: interactive,
        clickableIcons: false,
      });
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Markers + clustering follow the result set ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const entries = new Map<number, { marker: google.maps.marker.AdvancedMarkerElement; property: Property }>();
    const markers = properties.map((p) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: p.location.geo.lat, lng: p.location.geo.lng },
        content: pillEl(p, p.id === activeId),
        title: `${p.title}, ${shortPrice(p)}`,
        zIndex: p.id === activeId ? 30 : 10,
        gmpClickable: interactive,
      });
      if (interactive) marker.addListener("click", () => onMarkerClickRef.current?.(p.id));
      entries.set(p.id, { marker, property: p });
      return marker;
    });
    markersRef.current = entries;

    /* Cluster the browse maps; the exposé snippet pins its single marker */
    if (!center) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) =>
            new google.maps.marker.AdvancedMarkerElement({ position, content: clusterEl(count), zIndex: 20 }),
        },
        ...(interactive ? {} : { onClusterClick: () => undefined }),
      });
    } else {
      markers.forEach((m) => { m.map = map; });
    }

    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      markers.forEach((m) => { m.map = null; });
      markersRef.current = new Map();
    };
    /* activeId is applied in a lighter effect below — rebuilding markers on
       every card hover would make clusters flicker */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, properties, interactive, center?.lat, center?.lng]);

  /* ---- Active highlight (card hover / marker click) ---- */
  const prevActive = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    for (const id of [prevActive.current, activeId]) {
      if (id == null) continue;
      const entry = markersRef.current.get(id);
      if (entry) {
        entry.marker.content = pillEl(entry.property, id === activeId);
        entry.marker.zIndex = id === activeId ? 30 : 10;
      }
    }
    prevActive.current = activeId;
  }, [ready, activeId, properties]);

  /* ---- Fit the viewport to the result set (browse maps only) ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || center || properties.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    properties.forEach((p) => bounds.extend({ lat: p.location.geo.lat, lng: p.location.geo.lng }));
    map.fitBounds(bounds, 56);
    google.maps.event.addListenerOnce(map, "idle", () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15); // single-result guard
    });
  }, [ready, properties, center]);

  /* ---- Radius filter circle ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    circleRef.current?.setMap(null);
    circleRef.current = null;
    if (radiusKm > 0 && properties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      properties.forEach((p) => bounds.extend({ lat: p.location.geo.lat, lng: p.location.geo.lng }));
      circleRef.current = new google.maps.Circle({
        map,
        center: bounds.getCenter(),
        radius: radiusKm * 1000,
        strokeColor: "#3b82f6", // blue-500 — matches the demo canvas ring
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        clickable: false,
      });
    }
  }, [ready, radiusKm, properties]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dbe4ec]">
      {/* z-0 isolates the SDK's internal z-indexes so overlay children
          (results pill z-20, popover z-40) stack above the map */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {!ready && <div aria-hidden className="absolute inset-0 animate-pulse bg-slate-200" />}
      {children}
    </div>
  );
}
