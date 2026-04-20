import type { FarmImage } from "@/types";
import type { PolygonGeometry } from "@/services/gee";

const DEFAULT_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

export async function fetchFarmImage(
  geometry: PolygonGeometry,
  opts?: { startDate?: string; endDate?: string; baseUrl?: string }
): Promise<FarmImage> {
  const base = opts?.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(`${base}/api/farm-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      start_date: opts?.startDate ?? null,
      end_date: opts?.endDate ?? null,
    }),
  });
  if (!res.ok) {
    let detail = `Farm image request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as FarmImage;
}
