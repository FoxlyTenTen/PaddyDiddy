import type { OptimizationEvent } from "@/types";
import type { PolygonGeometry } from "@/services/gee";

const DEFAULT_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

export interface StreamOptions {
  startDate?: string;
  endDate?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

export async function streamOptimization(
  geometry: PolygonGeometry,
  opts: StreamOptions,
  onEvent: (event: OptimizationEvent) => void
): Promise<void> {
  const base = opts.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(`${base}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      start_date: opts.startDate ?? null,
      end_date: opts.endDate ?? null,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let detail = `Optimization request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const raw = line.slice(6);
      try {
        const parsed = JSON.parse(raw) as OptimizationEvent;
        onEvent(parsed);
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
