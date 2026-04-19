import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PolygonGeometry } from "@/services/gee";
import { cn } from "@/lib/utils";

interface IndexTileMapProps {
  geometry: PolygonGeometry;
  tileUrl: string;
  height?: number | string;
  className?: string;
  /** Opacity of the index tile layer (0–1). Default 0.92. */
  opacity?: number;
  /** When false, disables pan/zoom/attribution and hides controls — good for small previews. */
  interactive?: boolean;
}

const OUTLINE_STYLE = {
  color: "#ffffff",
  weight: 2,
  fillColor: "#000000",
  fillOpacity: 0,
  dashArray: "6 4",
} as const;

export function IndexTileMap({
  geometry,
  tileUrl,
  height = 460,
  className,
  opacity = 0.92,
  interactive = true,
}: IndexTileMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const tileLayerRef = React.useRef<L.TileLayer | null>(null);
  const polyLayerRef = React.useRef<L.Polygon | null>(null);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [3.51, 101.09],
      zoom: 14,
      worldCopyJump: true,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
      attributionControl: interactive,
    });
    mapRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: interactive ? "Imagery © Esri" : "",
        maxZoom: 19,
      }
    ).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      polyLayerRef.current = null;
    };
  }, [interactive]);

  // Sync polygon
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (polyLayerRef.current) {
      map.removeLayer(polyLayerRef.current);
      polyLayerRef.current = null;
    }
    const latlngs = geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    const poly = L.polygon(latlngs, OUTLINE_STYLE);
    poly.addTo(map);
    polyLayerRef.current = poly;
    map.fitBounds(poly.getBounds(), { padding: [28, 28] });
  }, [geometry]);

  // Sync tile layer
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const layer = L.tileLayer(tileUrl, {
      opacity,
      maxZoom: 19,
      attribution: "Indices © Google Earth Engine · Copernicus Sentinel-2",
    });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [tileUrl, opacity]);

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
