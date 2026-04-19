import * as React from "react";
import { Droplets, Leaf, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import type { IndexStatus, ZoneAnalysis, ZoneHealth, ZoneWater } from "@/types";
import { useAnalysis } from "@/state/analysis";
import { cn } from "@/lib/utils";
import {
  GRID,
  HEALTH_COLOR,
  HEALTH_LABEL,
  SCENE_SIZE,
  TILE_H,
  TILE_W,
  WATER_LABEL,
  directionLabel,
  tileCenter,
  tileEastPolygon,
  tileSouthPolygon,
  tileTopPolygon,
  zoneKey,
  zoneLookup,
} from "./IsometricTile";

const STATUS_TO_HEALTH: Record<IndexStatus, ZoneHealth> = {
  Healthy: "good",
  Moderate: "moderate",
  "Needs Attention": "poor",
};

function fallbackZones(
  ndviStatus: IndexStatus | undefined,
  ndwiStatus: IndexStatus | undefined
): ZoneAnalysis[] {
  const health: ZoneHealth = STATUS_TO_HEALTH[ndviStatus ?? "Moderate"];
  const water: ZoneWater =
    ndwiStatus === "Healthy"
      ? "ok"
      : ndwiStatus === "Moderate"
        ? "dry"
        : "flooded";
  const tip =
    health === "good"
      ? "Field looks healthy — keep the current routine."
      : health === "moderate"
        ? "Monitor this area over the next visit."
        : "Check this area in person for stress or pests.";
  const out: ZoneAnalysis[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      out.push({ row: r, col: c, health, water, tip, issue: null });
    }
  }
  return out;
}

function WaterRipple({
  row,
  col,
}: {
  row: number;
  col: number;
}) {
  const { x, y } = tileCenter(row, col);
  const id = `ripple-${row}-${col}`;
  return (
    <g clipPath={`url(#${id})`} pointerEvents="none">
      <defs>
        <clipPath id={id}>
          <polygon points={tileTopPolygon(row, col)} />
        </clipPath>
      </defs>
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={TILE_W / 2 - 4 - i * 8}
          ry={TILE_H / 2 - 2 - i * 4}
          fill="none"
          stroke="#bae6fd"
          strokeOpacity={0.7 - i * 0.18}
          strokeWidth={0.9}
        >
          <animate
            attributeName="rx"
            values={`${TILE_W / 2 - 4 - i * 8};${TILE_W / 2 - 1 - i * 8};${TILE_W / 2 - 4 - i * 8}`}
            dur={`${2.4 + i * 0.5}s`}
            repeatCount="indefinite"
          />
        </ellipse>
      ))}
      <polygon
        points={tileTopPolygon(row, col)}
        fill="#38bdf8"
        fillOpacity={0.22}
      />
    </g>
  );
}

function DryPattern({ row, col }: { row: number; col: number }) {
  const { x, y } = tileCenter(row, col);
  const id = `dry-${row}-${col}`;
  const lines: React.ReactNode[] = [];
  for (let i = -2; i <= 2; i++) {
    lines.push(
      <line
        key={`h-${i}`}
        x1={x - TILE_W / 2 + 6}
        y1={y + i * 4}
        x2={x + TILE_W / 2 - 6}
        y2={y + i * 4}
        stroke="#78350f"
        strokeOpacity={0.25}
        strokeWidth={0.7}
        strokeDasharray="2 3"
      />
    );
  }
  return (
    <g clipPath={`url(#${id})`} pointerEvents="none">
      <defs>
        <clipPath id={id}>
          <polygon points={tileTopPolygon(row, col)} />
        </clipPath>
      </defs>
      {lines}
    </g>
  );
}

function PaddyTexture({ row, col }: { row: number; col: number }) {
  const { x, y } = tileCenter(row, col);
  const id = `paddy-${row}-${col}`;
  const rows: React.ReactNode[] = [];
  for (let i = -3; i <= 3; i++) {
    rows.push(
      <line
        key={i}
        x1={x - TILE_W / 2 + 4}
        y1={y + i * 3}
        x2={x + TILE_W / 2 - 4}
        y2={y + i * 3}
        stroke="#000"
        strokeOpacity={0.08}
        strokeWidth={0.5}
      />
    );
  }
  return (
    <g clipPath={`url(#${id})`} pointerEvents="none">
      <defs>
        <clipPath id={id}>
          <polygon points={tileTopPolygon(row, col)} />
        </clipPath>
      </defs>
      {rows}
    </g>
  );
}

function IrrigationChannels() {
  const channels: React.ReactNode[] = [];
  for (let r = 0; r < GRID; r++) {
    const a = tileCenter(r, 1);
    const b = tileCenter(r, 2);
    channels.push(
      <line
        key={`vch-${r}`}
        x1={(a.x + b.x) / 2}
        y1={(a.y + b.y) / 2 - 1}
        x2={(a.x + b.x) / 2}
        y2={(a.y + b.y) / 2 + 1}
        stroke="#0284c7"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  }
  const start = tileCenter(1, 0);
  const end = tileCenter(1, GRID - 1);
  const mid1 = tileCenter(1, 1);
  const mid2 = tileCenter(2, GRID - 1);
  channels.push(
    <path
      key="main-ch"
      d={`M ${start.x - TILE_W / 2} ${start.y + TILE_H / 2} L ${mid1.x} ${mid1.y + TILE_H / 2} L ${mid2.x + TILE_W / 2} ${mid2.y} L ${end.x + TILE_W / 2} ${end.y}`}
      fill="none"
      stroke="#0ea5e9"
      strokeWidth={2.2}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={0.55}
    />
  );
  return <g pointerEvents="none">{channels}</g>;
}

function Pathway() {
  const parts: React.ReactNode[] = [];
  for (let c = 0; c < GRID; c++) {
    const { x, y } = tileCenter(GRID - 1, c);
    parts.push(
      <polygon
        key={`path-${c}`}
        points={`${x},${y + TILE_H / 2 + 1} ${x + TILE_W / 2},${y + 2} ${x + TILE_W / 2 + 3},${y + 4} ${x + 2},${y + TILE_H / 2 + 3}`}
        fill="#a8a29e"
        opacity={0.78}
      />
    );
  }
  return <g pointerEvents="none">{parts}</g>;
}

interface Props {
  className?: string;
}

export function Farm3DView({ className }: Props) {
  const { current, farmView, farmViewLoading, farmViewError, loadFarmView } =
    useAnalysis();
  const [hovered, setHovered] = React.useState<{ row: number; col: number } | null>(
    null
  );

  const ndviStatus = current?.result.indices.find((i) => i.key === "ndvi")
    ?.status as IndexStatus | undefined;
  const ndwiStatus = current?.result.indices.find((i) => i.key === "ndwi")
    ?.status as IndexStatus | undefined;

  const zones = React.useMemo<ZoneAnalysis[]>(() => {
    if (farmView?.zones.length) return farmView.zones;
    return fallbackZones(ndviStatus, ndwiStatus);
  }, [farmView, ndviStatus, ndwiStatus]);

  const lookup = React.useMemo(() => zoneLookup(zones), [zones]);
  const hoveredZone = hovered
    ? lookup.get(zoneKey(hovered.row, hovered.col))
    : null;

  const usingFallback = !farmView;

  const retryDisabled = !current || farmViewLoading;
  const onRetry = () => {
    if (!current) return;
    void loadFarmView(current.geometry);
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-b from-sky-50 via-white to-emerald-50/50 p-5 ring-1 ring-slate-200/80 shadow-soft",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Your field — bird's-eye view
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {farmView?.overallSummary ||
              (usingFallback
                ? "Showing an overview. Hover any tile to see what to do there."
                : "Hover any tile to see what to do there.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {farmViewLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analysing zones…
            </span>
          )}
          {farmViewError && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryDisabled}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-60"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              AI advice unavailable — retry
            </button>
          )}
          {!farmView && !farmViewLoading && !farmViewError && current && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full bg-padi-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-padi-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate AI advice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative flex items-center justify-center rounded-xl bg-[#ecfdf5] p-4 ring-1 ring-emerald-100">
          <svg
            viewBox={`0 0 ${SCENE_SIZE.w} ${SCENE_SIZE.h}`}
            className="block h-auto w-full max-w-[560px]"
            role="img"
            aria-label="Isometric paddy field with 16 zones"
          >
            <defs>
              <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="1.5"
                  stdDeviation="1.2"
                  floodColor="#0f172a"
                  floodOpacity="0.18"
                />
              </filter>
              <linearGradient id="sky-tint" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0" />
              </linearGradient>
            </defs>

            <rect
              x={0}
              y={0}
              width={SCENE_SIZE.w}
              height={SCENE_SIZE.h}
              fill="url(#sky-tint)"
            />

            {/* tiles — render by (row+col) so nearer tiles overlap farther ones */}
            {Array.from({ length: GRID * 2 - 1 }, (_, d) => d).flatMap((d) => {
              const cells: React.ReactNode[] = [];
              for (let r = 0; r < GRID; r++) {
                const c = d - r;
                if (c < 0 || c >= GRID) continue;
                const zone = lookup.get(zoneKey(r, c));
                if (!zone) continue;
                const isHover =
                  hovered?.row === r && hovered?.col === c;
                const colors = HEALTH_COLOR[zone.health];
                const lift = isHover ? -3 : 0;
                cells.push(
                  <g
                    key={`t-${r}-${c}`}
                    transform={`translate(0, ${lift})`}
                    style={{ transition: "transform 120ms ease-out" }}
                    onMouseEnter={() => setHovered({ row: r, col: c })}
                    onMouseLeave={() =>
                      setHovered((h) =>
                        h && h.row === r && h.col === c ? null : h
                      )
                    }
                  >
                    <polygon
                      points={tileSouthPolygon(r, c)}
                      fill={colors.side}
                    />
                    <polygon
                      points={tileEastPolygon(r, c)}
                      fill={colors.side}
                      fillOpacity={0.82}
                    />
                    <polygon
                      points={tileTopPolygon(r, c)}
                      fill={colors.top}
                      stroke={isHover ? "#0f172a" : "#064e3b"}
                      strokeOpacity={isHover ? 0.6 : 0.35}
                      strokeWidth={isHover ? 1 : 0.6}
                      filter={isHover ? "url(#soft-shadow)" : undefined}
                    />
                    <PaddyTexture row={r} col={c} />
                    {zone.water === "flooded" && <WaterRipple row={r} col={c} />}
                    {zone.water === "dry" && <DryPattern row={r} col={c} />}
                    {zone.health === "poor" && (
                      <circle
                        cx={tileCenter(r, c).x + TILE_W / 2 - 6}
                        cy={tileCenter(r, c).y - TILE_H / 2 + 4}
                        r={2.4}
                        fill="#dc2626"
                        stroke="white"
                        strokeWidth={0.6}
                      />
                    )}
                  </g>
                );
              }
              return cells;
            })}

            <IrrigationChannels />
            <Pathway />
          </svg>

          {farmViewLoading && (
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/40" />
          )}
        </div>

        <ZoneInfoPanel
          zone={hoveredZone ?? null}
          usingFallback={usingFallback}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <LegendDot color={HEALTH_COLOR.good.top} label="Healthy" />
        <LegendDot color={HEALTH_COLOR.moderate.top} label="Moderate" />
        <LegendDot color={HEALTH_COLOR.poor.top} label="Needs attention" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
          Irrigation channel
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-stone-400" />
          Pathway
        </span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function ZoneInfoPanel({
  zone,
  usingFallback,
}: {
  zone: ZoneAnalysis | null;
  usingFallback: boolean;
}) {
  if (!zone) {
    return (
      <div className="flex flex-col justify-center rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
        <p className="font-medium text-slate-700">Hover a tile</p>
        <p className="mt-1 text-xs">
          Each tile is roughly 1/16th of your field. Hover one to see what's
          going on there and what to do next.
          {usingFallback && (
            <>
              <br />
              <span className="text-amber-700">
                Tip-quality hover advice needs the AI analysis — click{" "}
                <em>Generate AI advice</em> above.
              </span>
            </>
          )}
        </p>
      </div>
    );
  }

  const issue = zone.issue ?? (zone.health === "good" ? "Looks good" : "Needs a look");
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {directionLabel(zone.row, zone.col)}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          row {zone.row + 1} · col {zone.col + 1}
        </span>
      </div>
      <p className="text-base font-semibold text-slate-900">{issue}</p>
      <p className="text-sm text-slate-600">{zone.tip}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
          <Leaf className="h-3 w-3" />
          {HEALTH_LABEL[zone.health]}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-800 ring-1 ring-sky-200">
          <Droplets className="h-3 w-3" />
          {WATER_LABEL[zone.water]}
        </span>
      </div>
    </div>
  );
}
