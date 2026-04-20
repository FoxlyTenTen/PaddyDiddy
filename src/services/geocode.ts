const DEFAULT_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
  types: string[];
}

export async function geocode(
  q: string,
  opts?: { signal?: AbortSignal; baseUrl?: string }
): Promise<GeocodeResult[]> {
  const base = opts?.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(
    `${base}/api/geocode?q=${encodeURIComponent(q)}`,
    { signal: opts?.signal }
  );
  if (!res.ok) {
    let detail = `Geocoding failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const body = (await res.json()) as { results: GeocodeResult[] };
  return (body.results ?? []).filter(
    (r) => typeof r.lat === "number" && typeof r.lon === "number"
  );
}
