import * as React from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { PolygonGeometry } from "@/services/gee";
import { cn } from "@/lib/utils";

interface FieldDrawMapProps {
  onChange: (geom: PolygonGeometry | null) => void;
  initial?: PolygonGeometry | null;
  height?: number | string;
  className?: string;
}

const POLY_STYLE = {
  color: "#15803d",
  weight: 2,
  fillColor: "#22c55e",
  fillOpacity: 0.22,
} as const;

function toGeoJSONFromLayer(layer: L.Polygon): PolygonGeometry {
  const gj = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
  return {
    type: "Polygon",
    coordinates: gj.geometry.coordinates,
  };
}

export function FieldDrawMap({
  onChange,
  initial,
  height = 520,
  className,
}: FieldDrawMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const drawnRef = React.useRef<L.FeatureGroup | null>(null);

  // Keep onChange in a ref so the effect below stays mount-once.
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [3.51, 101.09], // Sekinchan, Selangor — paddy country
      zoom: 14,
      worldCopyJump: true,
    });
    mapRef.current = map;

    const imagery = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Imagery © Esri, Maxar, Earthstar Geographics, USDA, USGS",
        maxZoom: 19,
      }
    );
    const streets = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }
    );
    imagery.addTo(map);
    L.control.layers({ Satellite: imagery, Streets: streets }).addTo(map);

    const drawn = new L.FeatureGroup();
    drawn.addTo(map);
    drawnRef.current = drawn;

    // Localise draw control copy so it reads like "Draw your paddy field".
    (L as any).drawLocal.draw.toolbar.buttons.polygon = "Draw your field";
    (L as any).drawLocal.draw.handlers.polygon.tooltip.start =
      "Click to start drawing your field.";
    (L as any).drawLocal.draw.handlers.polygon.tooltip.cont =
      "Click to add another point to the boundary.";
    (L as any).drawLocal.draw.handlers.polygon.tooltip.end =
      "Click the first point to finish the field shape.";

    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      draw: {
        polyline: false,
        marker: false,
        circle: false,
        circlemarker: false,
        rectangle: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: POLY_STYLE,
        },
      },
      edit: {
        featureGroup: drawn,
        remove: true,
      },
    });
    map.addControl(drawControl);

    const emitCurrent = () => {
      const polys: L.Polygon[] = [];
      drawn.eachLayer((l) => {
        if (l instanceof L.Polygon) polys.push(l);
      });
      if (polys.length === 0) {
        onChangeRef.current(null);
        return;
      }
      onChangeRef.current(toGeoJSONFromLayer(polys[polys.length - 1]));
    };

    map.on("draw:created", (e: any) => {
      // Keep a single active polygon for analysis.
      drawn.clearLayers();
      drawn.addLayer(e.layer);
      if (e.layer instanceof L.Polygon) {
        map.fitBounds(e.layer.getBounds(), { padding: [24, 24] });
      }
      emitCurrent();
    });
    map.on("draw:edited", emitCurrent);
    map.on("draw:deleted", emitCurrent);

    if (initial) {
      const latlngs = initial.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const poly = L.polygon(latlngs, POLY_STYLE);
      drawn.addLayer(poly);
      map.fitBounds(poly.getBounds(), { padding: [24, 24] });
      onChangeRef.current(initial);
    }

    // Nudge leaflet to measure correctly when mounted inside flex containers
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      drawnRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full overflow-hidden rounded-xl ring-1 ring-slate-200",
        className
      )}
      style={{ height }}
    />
  );
}
