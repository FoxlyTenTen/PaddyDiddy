import type { IndexKey, IndexStatus } from "@/types";

export interface IndexResult {
  key: IndexKey;
  name: string;
  tileUrl: string;
  palette: string[];
  min: number;
  max: number;
  mean: number | null;
  status: IndexStatus;
}

export interface AnalyzeResponse {
  indices: IndexResult[];
  imageDate: string;
  imageCount: number;
  areaHa: number;
  window: { start: string; end: string };
  bounds: unknown;
}

export type ZoneLevel = "optimal" | "moderate" | "low" | "critical" | "no_data";
export type ZonePriority = "high" | "medium" | "low" | "none";

export interface ZoneStat {
  row: number;
  col: number;
  value: number | null;
  value_str: string;
  level: ZoneLevel;
  norm: number | null; // 0-1 normalized
}

export interface ZoneMatrixEntry {
  row: number;
  col: number;
  status: "good" | "attention";
  action_needed: string;
  priority: ZonePriority;
}

export interface RecommendResponse {
  headline: string;
  severity: "healthy" | "moderate" | "critical";
  whats_happening: string;
  likely_causes: string[];
  prevention_steps: { action: string; when: string; why: string }[];
  simple_explanation: string;
  zones_matrix: ZoneMatrixEntry[];
  // Rich numeric data from GEE zone stats
  zone_stats: ZoneStat[];
  rows: number;
  cols: number;
  field_polygon: [number, number][] | null; // [[lng, lat], ...] outer ring
  index_key: string;
  index_name: string;
  index_min: number;
  index_max: number;
  index_palette: string[];
  mean: number | null;
  status: string;
  image_date: string;
}

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: number[][][]; // [ring][point][lng,lat]
}

const DEFAULT_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

export async function analyzeField(
  geometry: PolygonGeometry,
  opts?: { startDate?: string; endDate?: string; baseUrl?: string }
): Promise<AnalyzeResponse> {
  const base = opts?.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      start_date: opts?.startDate ?? null,
      end_date: opts?.endDate ?? null,
    }),
  });
  if (!res.ok) {
    let detail = `Analyze request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as AnalyzeResponse;
}

export async function recommendIndex(
  geometry: PolygonGeometry,
  indexKey: string,
  opts?: { startDate?: string; endDate?: string; baseUrl?: string }
): Promise<RecommendResponse> {
  const base = opts?.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(`${base}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      index_key: indexKey,
      start_date: opts?.startDate ?? null,
      end_date: opts?.endDate ?? null,
    }),
  });
  if (!res.ok) {
    let detail = `Recommend request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as RecommendResponse;
}

export async function checkHealth(
  baseUrl: string = DEFAULT_BASE
): Promise<{ status: string; gee_project_configured: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
