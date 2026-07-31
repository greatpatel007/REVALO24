import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { Property } from "@/shared/types";
import { useI18n } from "@/shared/i18n/I18nContext";
import type { MapCanvasProps } from "./MapCanvas";
import { clusterEl, pillEl, shortPrice } from "./mapMarkers";

/* Keyless real map: Leaflet + OSM street tiles (Esri World Imagery for the
   satellite layer). Fully interactive — pan, zoom, cluster drill-down —
   with the same brand pill markers as the Google engine. No API key or
   billing account needed; swaps out transparently when a Google key is set. */

const LAYERS = {
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri &middot; Maxar &middot; Earthstar Geographics",
  },
} as const;
type MapLayer = keyof typeof LAYERS;

const EUROPE_CENTER: L.LatLngExpression = [48.5, 9];

function pillIcon(p: Property, isActive: boolean): L.DivIcon {
  /* Zero-size icon anchored at the latlng; the inner wrapper hangs the pill
     bottom-centered above the point (Leaflet owns the outer transform) */
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:absolute;bottom:0;left:0;transform:translateX(-50%);white-space:nowrap;";
  wrap.appendChild(pillEl(p, isActive));
  return L.divIcon({ html: wrap, className: "", iconSize: [0, 0] });
}

export function LeafletMapCanvas({
  properties, activeId = null, onMarkerClick, radiusKm = 0, center, zoom = 6,
  interactive = true, children,
}: MapCanvasProps) {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, { marker: L.Marker; property: Property }>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);
  const [layer, setLayer] = useState<MapLayer>("streets");

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  /* ---- Create the map once ---- */
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const map = L.map(hostRef.current, {
      center: center ? [center.lat, center.lng] : EUROPE_CENTER,
      zoom: center ? zoom : 5,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    if (interactive) L.control.zoom({ position: "bottomleft" }).addTo(map);
    mapRef.current = map;

    /* Split-view resizes (e.g. the card panel collapsing) must re-measure */
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Basemap layer (Map | Satellite) ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tileRef.current?.remove();
    tileRef.current = L.tileLayer(LAYERS[layer].url, {
      attribution: LAYERS[layer].attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [layer]);

  /* ---- Markers + clustering follow the result set ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const entries = new Map<number, { marker: L.Marker; property: Property }>();
    const markers = properties.map((p) => {
      const marker = L.marker([p.location.geo.lat, p.location.geo.lng], {
        icon: pillIcon(p, p.id === activeId),
        interactive,
        riseOnHover: true,
        alt: `${p.title}, ${shortPrice(p)}`,
        zIndexOffset: p.id === activeId ? 1000 : 0,
      });
      if (interactive) marker.on("click", () => onMarkerClickRef.current?.(p.id));
      entries.set(p.id, { marker, property: p });
      return marker;
    });
    markersRef.current = entries;

    /* Cluster the browse maps; the exposé snippet pins its single marker */
    if (!center) {
      clusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: interactive,
        spiderfyOnMaxZoom: interactive,
        iconCreateFunction: (cluster) =>
          L.divIcon({ html: clusterEl(cluster.getChildCount()), className: "", iconSize: [36, 36] }),
      });
      clusterRef.current.addLayers(markers);
      map.addLayer(clusterRef.current);
    } else {
      markers.forEach((m) => m.addTo(map));
    }

    return () => {
      clusterRef.current?.remove();
      clusterRef.current = null;
      markers.forEach((m) => m.remove());
      markersRef.current = new Map();
    };
    /* activeId is applied in a lighter effect below — rebuilding markers on
       every card hover would make clusters flicker */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, interactive, center?.lat, center?.lng]);

  /* ---- Active highlight (card hover / marker click) ---- */
  const prevActive = useRef<number | null>(null);
  useEffect(() => {
    for (const id of [prevActive.current, activeId]) {
      if (id == null) continue;
      const entry = markersRef.current.get(id);
      if (entry) {
        entry.marker.setIcon(pillIcon(entry.property, id === activeId));
        entry.marker.setZIndexOffset(id === activeId ? 1000 : 0);
      }
    }
    prevActive.current = activeId;
  }, [activeId, properties]);

  /* ---- Fit the viewport to the result set (browse maps only) ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || center || properties.length === 0) return;
    const bounds = L.latLngBounds(properties.map((p) => [p.location.geo.lat, p.location.geo.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15 });
  }, [properties, center]);

  /* ---- Radius filter circle ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    circleRef.current?.remove();
    circleRef.current = null;
    if (radiusKm > 0 && properties.length > 0) {
      const bounds = L.latLngBounds(properties.map((p) => [p.location.geo.lat, p.location.geo.lng] as [number, number]));
      circleRef.current = L.circle(bounds.getCenter(), {
        radius: radiusKm * 1000,
        color: "#3b82f6", // blue-500 — radius ring token
        opacity: 0.5,
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map);
    }
  }, [radiusKm, properties]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dbe4ec]">
      {/* z-0 isolates Leaflet's internal pane z-indexes (up to ~800) so the
          overlay children (results pill z-20, popover z-40) stack above */}
      <div ref={hostRef} className="absolute inset-0 z-0" />

      {/* ---- Layer switch (Map / Satellite), Google-Maps style ---- */}
      {interactive && (
        <div role="group" aria-label={t("map.layers")} className="absolute right-3 top-3 z-20 flex overflow-hidden rounded-lg bg-white shadow-elevation-md">
          {([["streets", t("map.layerMap")], ["satellite", t("map.layerSat")]] as [MapLayer, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={layer === value}
              onClick={() => setLayer(value)}
              className={`min-h-9 cursor-pointer px-3.5 text-xs font-bold transition-colors ${
                layer === value ? "bg-navy text-white" : "text-navy hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
