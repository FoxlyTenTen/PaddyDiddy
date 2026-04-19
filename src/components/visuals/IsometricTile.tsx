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
