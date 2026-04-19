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
