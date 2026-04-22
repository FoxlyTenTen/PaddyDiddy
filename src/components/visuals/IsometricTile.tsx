import type { ZoneAnalysis, ZoneHealth, ZoneWater } from "@/types";

export const TILE_W = 90;
export const TILE_H = 45;
export const TILE_DEPTH = 14;
export const GRID = 4;

const SCENE_W = TILE_W * GRID + TILE_W / 2;
const SCENE_H = TILE_H * GRID + TILE_DEPTH + TILE_H;

export const SCENE_SIZE = { w: SCENE_W, h: SCENE_H };
export const SCENE_ORIGIN = {
  x: (TILE_W * GRID) / 2 + TILE_W / 4,
  y: TILE_H / 2 + 4,
};

export const HEALTH_COLOR: Record<ZoneHealth, { top: string; side: string }> = {
  good: { top: "#16a34a", side: "#166534" },
  moderate: { top: "#eab308", side: "#a16207" },
  poor: { top: "#b45309", side: "#7c2d12" },
};

export const WATER_LABEL: Record<ZoneWater, string> = {
  dry: "Dry",
  ok: "OK",
  flooded: "Flooded",
};

export const HEALTH_LABEL: Record<ZoneHealth, string> = {
  good: "Healthy",
  moderate: "Moderate",
  poor: "Needs attention",
};

export interface TileCenter {
  x: number;
  y: number;
}

export function tileCenter(row: number, col: number): TileCenter {
  return {
    x: SCENE_ORIGIN.x + (col - row) * (TILE_W / 2),
    y: SCENE_ORIGIN.y + (col + row) * (TILE_H / 2),
  };
}

export function tileTopPolygon(row: number, col: number): string {
  const { x, y } = tileCenter(row, col);
  const points = [
    [x, y - TILE_H / 2],
    [x + TILE_W / 2, y],
    [x, y + TILE_H / 2],
    [x - TILE_W / 2, y],
  ];
  return points.map((p) => p.join(",")).join(" ");
}

export function tileSouthPolygon(row: number, col: number): string {
  const { x, y } = tileCenter(row, col);
  const points = [
    [x - TILE_W / 2, y],
    [x, y + TILE_H / 2],
    [x, y + TILE_H / 2 + TILE_DEPTH],
    [x - TILE_W / 2, y + TILE_DEPTH],
  ];
  return points.map((p) => p.join(",")).join(" ");
}

export function tileEastPolygon(row: number, col: number): string {
  const { x, y } = tileCenter(row, col);
  const points = [
    [x, y + TILE_H / 2],
    [x + TILE_W / 2, y],
    [x + TILE_W / 2, y + TILE_DEPTH],
    [x, y + TILE_H / 2 + TILE_DEPTH],
  ];
  return points.map((p) => p.join(",")).join(" ");
}

export function zoneKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function zoneLookup(zones: ZoneAnalysis[] | null): Map<string, ZoneAnalysis> {
  const m = new Map<string, ZoneAnalysis>();
  if (!zones) return m;
  for (const z of zones) m.set(zoneKey(z.row, z.col), z);
  return m;
}

export function directionLabel(row: number, col: number): string {
  const ns = row < 2 ? "North" : "South";
  const ew = col < 2 ? "west" : "east";
  const nsNarrow = row === 1 || row === 2;
  const ewNarrow = col === 1 || col === 2;
  if (nsNarrow && ewNarrow) return "Central area";
  if (nsNarrow) return `Central ${ew}`;
  if (ewNarrow) return `Central ${ns.toLowerCase()}`;
  return `${ns}-${ew}`;
}

export interface PolygonProjection {
  top: [number, number][];
  bottom: [number, number][];
  walls: string[];
  topPoints: string;
  bottomPoints: string;
  outlineD: string;
}

/**
 * Project a lng/lat polygon ring onto the isometric SVG scene.
 * The polygon's bounding box is scaled to fill the 4x4 grid's outer diamond,
 * so the tile grid and the polygon share one coordinate system.
 */
export function projectPolygon(
  ring: number[][] | undefined | null
): PolygonProjection | null {
  if (!ring || ring.length < 4) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const pt of ring) {
    const [lng, lat] = pt;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const lngSpan = maxLng - minLng;
  const latSpan = maxLat - minLat;
  if (lngSpan <= 0 || latSpan <= 0) return null;

  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (const [lng, lat] of ring) {
    const u = (lng - minLng) / lngSpan;
    const v = (maxLat - lat) / latSpan;
    const colPos = -0.5 + u * GRID;
    const rowPos = -0.5 + v * GRID;
    const x = SCENE_ORIGIN.x + (colPos - rowPos) * (TILE_W / 2);
    const y = SCENE_ORIGIN.y + (colPos + rowPos) * (TILE_H / 2);
    top.push([x, y]);
    bottom.push([x, y + TILE_DEPTH]);
  }

  const walls: string[] = [];
  for (let i = 0; i < top.length - 1; i++) {
    const p1 = top[i];
    const p2 = top[i + 1];
    const p1b = bottom[i];
    const p2b = bottom[i + 1];
    walls.push(
      `${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p2b[0]},${p2b[1]} ${p1b[0]},${p1b[1]}`
    );
  }

  const topPoints = top.map((p) => p.join(",")).join(" ");
  const bottomPoints = bottom.map((p) => p.join(",")).join(" ");
  const outlineD =
    "M " +
    top.map((p) => p.join(",")).join(" L ") +
    " Z";

  return { top, bottom, walls, topPoints, bottomPoints, outlineD };
}

/** Inverse of projectPolygon — map lng/lat into grid (row, col) coords. */
export function lngLatToGridCell(
  lng: number,
  lat: number,
  bbox: { minLng: number; maxLng: number; minLat: number; maxLat: number }
): { row: number; col: number } {
  const u = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng);
  const v = (bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat);
  return {
    row: Math.max(0, Math.min(GRID - 1, Math.floor(v * GRID))),
    col: Math.max(0, Math.min(GRID - 1, Math.floor(u * GRID))),
  };
}
