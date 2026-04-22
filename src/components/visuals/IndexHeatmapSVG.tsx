import * as React from "react";
import type { IndexKey } from "@/types";
import { cn } from "@/lib/utils";

type Ramp = [string, string, string];

const RAMPS: Record<IndexKey, Ramp> = {
  ndvi: ["#7f1d1d", "#eab308", "#15803d"],
  ndre: ["#991b1b", "#f97316", "#16a34a"],
  lswi: ["#78350f", "#14b8a6", "#1d4ed8"],
  gci: ["#ecfccb", "#65a30d", "#14532d"],
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLattice(seed: number, n: number): number[][] {
  const rand = mulberry32(seed || 1);
  const grid: number[][] = [];
  for (let y = 0; y < n; y++) {
    const row: number[] = [];
    for (let x = 0; x < n; x++) {
      row.push(rand());
    }
    grid.push(row);
  }
  return grid;
}

function sampleLattice(grid: number[][], n: number, u: number, v: number) {
  const x = u * (n - 1);
  const y = v * (n - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, n - 1);
  const y1 = Math.min(y0 + 1, n - 1);
  const fx = x - x0;
  const fy = y - y0;
  // smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = grid[y0][x0];
  const b = grid[y0][x1];
  const c = grid[y1][x0];
  const d = grid[y1][x1];
  const ab = a + (b - a) * sx;
  const cd = c + (d - c) * sx;
  return ab + (cd - ab) * sy;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ] as [number, number, number];
}
function rampColor(ramp: Ramp, t: number) {
  const A = hexToRgb(ramp[0]);
  const B = hexToRgb(ramp[1]);
  const C = hexToRgb(ramp[2]);
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    const u = clamped * 2;
    const [r, g, b] = mix(A, B, u);
    return rgbToHex(r, g, b);
  }
  const u = (clamped - 0.5) * 2;
  const [r, g, b] = mix(B, C, u);
  return rgbToHex(r, g, b);
}

interface HeatmapProps {
  indexKey: IndexKey;
  seed: number;
  /** Target bias of the overall field (0 poor, 1 lush). Default 0.62 */
  healthBias?: number;
  /** Number of visual cells per side. Higher = smoother but heavier. */
  resolution?: number;
  /** Show dashed boundary polygon overlay */
  showBoundary?: boolean;
  className?: string;
  rounded?: boolean;
}

export function IndexHeatmapSVG({
  indexKey,
  seed,
  healthBias = 0.62,
  resolution = 28,
  showBoundary = true,
  className,
  rounded = true,
}: HeatmapProps) {
  const ramp = RAMPS[indexKey];
  const lattice = React.useMemo(() => buildLattice(seed, 6), [seed]);

  const cells: React.ReactNode[] = [];
  const size = 100; // viewBox
  const cell = size / resolution;

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1);
      const v = y / (resolution - 1);
      // base noise 0..1
      const n = sampleLattice(lattice, 6, u, v);
      // edge falloff so corners appear slightly different
      const cx = u - 0.5;
      const cy = v - 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const edge = 1 - Math.min(1, dist * 1.4);
      const raw = n * 0.75 + edge * 0.25;
      // nudge toward healthBias so each index reads correctly
      const biased = raw * 0.55 + healthBias * 0.45;
      const t = Math.max(0.02, Math.min(0.98, biased));
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell + 0.6}
          height={cell + 0.6}
          fill={rampColor(ramp, t)}
        />
      );
    }
  }

  // Boundary polygon — a hand-drawn-ish field shape derived deterministically.
  const boundaryPts = React.useMemo(() => {
    const rand = mulberry32(seed * 7 + 3);
    const N = 10;
    const pts: string[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const jitter = 0.82 + rand() * 0.14;
      const x = 50 + Math.cos(a) * 42 * jitter;
      const y = 50 + Math.sin(a) * 34 * jitter;
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(" ");
  }, [seed]);

  const maskId = `mask-${indexKey}-${seed}`;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      className={cn(
        "block h-full w-full",
        rounded && "rounded-xl",
        className
      )}
      role="img"
      aria-label={`${indexKey.toUpperCase()} satellite heatmap preview`}
    >
      <defs>
        <mask id={maskId}>
          <rect width={size} height={size} fill="black" />
          <polygon points={boundaryPts} fill="white" />
        </mask>
        <linearGradient id={`sheen-${maskId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="55%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Outside boundary: soft dark earth */}
      <rect width={size} height={size} fill="#1f2937" opacity="0.78" />

      {/* Inside boundary: clipped heatmap */}
      <g mask={showBoundary ? `url(#${maskId})` : undefined}>{cells}</g>

      {/* Sheen */}
      <rect width={size} height={size} fill={`url(#sheen-${maskId})`} />

      {showBoundary && (
        <polygon
          points={boundaryPts}
          fill="none"
          stroke="white"
          strokeOpacity="0.85"
          strokeWidth="0.6"
          strokeDasharray="1.8 1.2"
        />
      )}
    </svg>
  );
}
