/**
 * FieldMatrixViz — renders the AI recommendation matrix shaped to the real
 * farm polygon drawn by the user.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ZoneStat, ZoneMatrixEntry } from "@/services/gee";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ZoneLevel = "optimal" | "moderate" | "low" | "critical" | "no_data";

interface CellData {
  row: number;
  col: number;
  stat: ZoneStat | null;
  matrix: ZoneMatrixEntry | null;
  /** Whether this cell's centre falls inside the polygon */
  inside: boolean;
}

interface Props {
  /** Outer ring of the field polygon in [lng, lat] pairs */
  fieldPolygon: [number, number][] | null;
  zoneStat: ZoneStat[];
  zonesMatrix: ZoneMatrixEntry[];
  rows?: number;
  cols?: number;
  indexName: string;
  indexMin: number;
  indexMax: number;
  className?: string;
  /** If true, show a JSON export button */
  showExport?: boolean;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<ZoneLevel, { bg: string; text: string; border: string; label: string }> = {
  optimal:  { bg: "#14532d", text: "#bbf7d0", border: "#166534", label: "Optimal"  },
  moderate: { bg: "#854d0e", text: "#fef08a", border: "#a16207", label: "Moderate" },
  low:      { bg: "#c2410c", text: "#fed7aa", border: "#ea580c", label: "Low"      },
  critical: { bg: "#7f1d1d", text: "#fecaca", border: "#b91c1c", label: "Critical" },
  no_data:  { bg: "#1e293b", text: "#94a3b8", border: "#334155", label: "No data"  },
};

const PRIORITY_BADGE: Record<string, { bg: string; text: string }> = {
  high:   { bg: "#ef4444", text: "#fff" },
  medium: { bg: "#f97316", text: "#fff" },
  low:    { bg: "#eab308", text: "#000" },
  none:   { bg: "#22c55e", text: "#fff" },
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Normalise polygon to a 0-1 bounding box, returning [u, v] pairs */
function normalisePoly(pts: [number, number][]): { pts: [number, number][]; aspect: number } {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  return {
    pts: pts.map(([x, y]) => [(x - minX) / w, 1 - (y - minY) / h]),
    aspect: w / h,
  };
}

/** Ray-casting point-in-polygon for normalised coords */
function pointInPoly(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Detect the approximate shape type from vertex count + regularity */
function detectShapeType(pts: [number, number][]): "rect" | "hex" | "pentagon" | "triangle" | "freeform" {
  const n = pts.length;
  if (n === 3) return "triangle";
  if (n === 4 || n === 5) return "rect"; // quads treated as rectangles
  if (n === 6) return "hex";
  if (n === 7 || n === 8) return "pentagon";
  return "freeform";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FieldMatrixViz({
  fieldPolygon,
  zoneStat,
  zonesMatrix,
  rows = 4,
  cols = 4,
  indexName,
  indexMin,
  indexMax,
  className,
  showExport = true,
}: Props) {
  const [tooltip, setTooltip] = React.useState<{
    cell: CellData;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const { normPts, shapeType, aspect } = React.useMemo(() => {
    if (!fieldPolygon || fieldPolygon.length < 3) {
      const rPts: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
      return { normPts: rPts, shapeType: "rect" as const, aspect: 1 };
    }
    const { pts, aspect } = normalisePoly(fieldPolygon);
    return { normPts: pts, shapeType: detectShapeType(fieldPolygon), aspect };
  }, [fieldPolygon]);

  const VW = 200;
  const VH = Math.round(VW / Math.max(0.3, Math.min(3, aspect)));

  const cells = React.useMemo<CellData[]>(() => {
    const result: CellData[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cu = (c + 0.5) / cols;
        const cv = (r + 0.5) / rows;
        const inside = pointInPoly(cu, cv, normPts);
        const stat = zoneStat.find((z) => z.row === r && z.col === c) ?? null;
        const matrix = zonesMatrix.find((z) => z.row === r && z.col === c) ?? null;
        result.push({ row: r, col: c, stat, matrix, inside });
      }
    }
    return result;
  }, [rows, cols, normPts, zoneStat, zonesMatrix]);

  const clipId = React.useId();
  const gradId = React.useId();

  const polyPointsStr = normPts
    .map(([u, v]) => `${(u * VW).toFixed(2)},${(v * VH).toFixed(2)}`)
    .join(" ");

  const cellW = VW / cols;
  const cellH = VH / rows;

  const levelCounts = React.useMemo(() => {
    const counts: Record<ZoneLevel, number> = { optimal: 0, moderate: 0, low: 0, critical: 0, no_data: 0 };
    for (const cell of cells) {
      if (!cell.inside) continue;
      const lv = (cell.stat?.level ?? "no_data") as ZoneLevel;
      counts[lv] = (counts[lv] ?? 0) + 1;
    }
    return counts;
  }, [cells]);

  const matrixPayload = React.useMemo(() => ({
    index: indexName,
    index_range: { min: indexMin, max: indexMax },
    grid: { rows, cols },
    field_shape: shapeType,
    summary: {
      optimal: levelCounts.optimal,
      moderate: levelCounts.moderate,
      low: levelCounts.low,
      critical: levelCounts.critical,
    },
    zones: cells
      .filter((c) => c.inside)
      .map((c) => ({
        row: c.row,
        col: c.col,
        value: c.stat?.value ?? null,
        level: c.stat?.level ?? "no_data",
        norm: c.stat?.norm ?? null,
        status: c.matrix?.status ?? "good",
        priority: c.matrix?.priority ?? "none",
        action: c.matrix?.action_needed ?? "None",
      })),
  }), [cells, indexName, indexMin, indexMax, rows, cols, shapeType, levelCounts]);

  function handleExport() {
    const blob = new Blob([JSON.stringify(matrixPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `field_matrix_${indexName.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCellHover(e: React.MouseEvent, cell: CellData) {
    if (!cell.inside) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      cell,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-800 text-slate-200">
            {shapeType} field
          </span>
          <span className="text-xs text-slate-400">{rows}×{cols} zone matrix</span>
        </div>
        {showExport && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON
          </button>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-2xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full block"
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <polygon points={polyPointsStr} />
            </clipPath>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.06" />
              <stop offset="100%" stopColor="black" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <rect width={VW} height={VH} fill="#0f172a" />

          {cells.map((cell) => {
            const x = cell.col * cellW;
            const y = cell.row * cellH;
            const level = (cell.stat?.level ?? "no_data") as ZoneLevel;
            const colors = LEVEL_COLORS[level];

            if (!cell.inside) {
              return (
                <rect
                  key={`${cell.row}-${cell.col}`}
                  x={x} y={y}
                  width={cellW} height={cellH}
                  fill="#0a0f1a"
                  opacity="0.6"
                />
              );
            }

            const fillOpacity = 0.7 + (cell.stat?.norm ?? 0.5) * 0.3;
            const isAttention = cell.matrix?.status === "attention";
            const priority = cell.matrix?.priority ?? "none";

            return (
              <g
                key={`${cell.row}-${cell.col}`}
                onMouseMove={(e) => handleCellHover(e, cell)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x + 0.8} y={y + 0.8}
                  width={cellW - 1.6} height={cellH - 1.6}
                  rx="2" ry="2"
                  fill={colors.bg}
                  fillOpacity={fillOpacity}
                  stroke={colors.border}
                  strokeWidth="0.4"
                />
                {isAttention && (
                  <rect
                    x={x + 0.8} y={y + 0.8}
                    width={cellW - 1.6} height={cellH - 1.6}
                    rx="2" ry="2"
                    fill="none"
                    stroke={priority === "high" ? "#ef4444" : "#f97316"}
                    strokeWidth="0.6"
                    opacity="0.9"
                  />
                )}
                <text
                  x={x + cellW / 2} y={y + cellH / 2 - 1.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(cellW, cellH) * 0.22}
                  fontFamily="'JetBrains Mono', 'Fira Mono', monospace"
                  fill={colors.text}
                  fontWeight="700"
                >
                  {cell.stat?.value_str ?? "—"}
                </text>
                <text
                  x={x + cellW / 2} y={y + cellH / 2 + Math.min(cellW, cellH) * 0.16}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.min(cellW, cellH) * 0.14}
                  fontFamily="system-ui, sans-serif"
                  fill={colors.text}
                  opacity="0.75"
                >
                  {colors.label}
                </text>
                {priority !== "none" && (
                  <circle
                    cx={x + cellW - 2.5} cy={y + 2.5}
                    r="1.5"
                    fill={PRIORITY_BADGE[priority]?.bg ?? "#6b7280"}
                  />
                )}
              </g>
            );
          })}

          <polygon
            points={polyPointsStr}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.8"
            strokeDasharray="3,2"
          />
          <rect width={VW} height={VH} fill={`url(#${gradId})`} />
          <g clipPath={`url(#${clipId})`} opacity="0.15">
            {Array.from({ length: cols - 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={(i + 1) * cellW} y1="0"
                x2={(i + 1) * cellW} y2={VH}
                stroke="white" strokeWidth="0.3"
              />
            ))}
            {Array.from({ length: rows - 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1="0" y1={(i + 1) * cellH}
                x2={VW} y2={(i + 1) * cellH}
                stroke="white" strokeWidth="0.3"
              />
            ))}
          </g>
          {Array.from({ length: cols }).map((_, c) => (
            <text
              key={`cl${c}`}
              x={c * cellW + cellW / 2} y={VH - 1}
              textAnchor="middle" dominantBaseline="text-after-edge"
              fontSize="3" fill="rgba(255,255,255,0.3)"
              fontFamily="system-ui, sans-serif"
            >
              C{c}
            </text>
          ))}
          {Array.from({ length: rows }).map((_, r) => (
            <text
              key={`rl${r}`}
              x="1.5" y={r * cellH + cellH / 2}
              textAnchor="start" dominantBaseline="middle"
              fontSize="3" fill="rgba(255,255,255,0.3)"
              fontFamily="system-ui, sans-serif"
            >
              R{r}
            </text>
          ))}
        </svg>

        {tooltip && tooltip.cell.inside && (
          <div
            className="pointer-events-none absolute z-50 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md p-3 shadow-2xl text-xs"
            style={{
              left: Math.min(tooltip.x + 12, 200),
              top: Math.max(tooltip.y - 80, 4),
              maxWidth: "200px",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm flex-none"
                style={{ background: LEVEL_COLORS[(tooltip.cell.stat?.level ?? "no_data") as ZoneLevel]?.bg }}
              />
              <span className="font-bold text-white">
                Zone R{tooltip.cell.row} · C{tooltip.cell.col}
              </span>
            </div>
            <div className="text-slate-300 space-y-0.5">
              <div>
                <span className="text-slate-500">Value: </span>
                <span className="font-mono font-bold">{tooltip.cell.stat?.value_str ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500">Level: </span>
                <span className="font-semibold" style={{ color: LEVEL_COLORS[(tooltip.cell.stat?.level ?? "no_data") as ZoneLevel]?.text }}>
                  {LEVEL_COLORS[(tooltip.cell.stat?.level ?? "no_data") as ZoneLevel]?.label}
                </span>
              </div>
              {tooltip.cell.matrix?.status === "attention" && (
                <div className="mt-1 rounded-lg bg-rose-900/50 px-2 py-1 text-rose-200 leading-snug">
                  <span className="font-semibold block">Action needed:</span>
                  {tooltip.cell.matrix.action_needed}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["critical", "low", "moderate", "optimal", "no_data"] as ZoneLevel[]).map((lv) => {
          const cnt = levelCounts[lv];
          if (cnt === 0) return null;
          const c = LEVEL_COLORS[lv];
          return (
            <div
              key={lv}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{ borderColor: c.border, background: c.bg + "33", color: c.text }}
            >
              <span className="h-2 w-2 rounded-sm flex-none" style={{ background: c.bg }} />
              {c.label}
              <span className="ml-0.5 font-mono opacity-70">{cnt}</span>
            </div>
          );
        })}
      </div>

      {zonesMatrix.some((z) => z.priority === "high" || z.priority === "medium") && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
          <div className="text-xs font-semibold text-rose-800 mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
            Action zones requiring attention
          </div>
          <div className="flex flex-col gap-1.5">
            {zonesMatrix
              .filter((z) => z.priority === "high" || z.priority === "medium")
              .sort((a) => (a.priority === "high" ? -1 : 1))
              .map((z) => (
                <div key={`${z.row}-${z.col}`} className="flex items-start gap-2 text-xs">
                  <span
                    className="inline-flex items-center justify-center rounded px-1.5 py-0.5 font-bold text-[10px] flex-none"
                    style={{
                      background: PRIORITY_BADGE[z.priority]?.bg,
                      color: PRIORITY_BADGE[z.priority]?.text,
                    }}
                  >
                    {z.priority.toUpperCase()}
                  </span>
                  <span className="text-slate-600">
                    <strong className="text-slate-800">R{z.row}·C{z.col}</strong> — {z.action_needed}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
