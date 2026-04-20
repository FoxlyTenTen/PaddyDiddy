import { AlertTriangle, CheckCircle2, CircleAlert, Stethoscope } from "lucide-react";
import type { FarmView, ZoneAnalysis, ZoneHealth } from "@/types";
import { cn } from "@/lib/utils";

const HEALTH_STYLE: Record<
  ZoneHealth,
  { bg: string; ring: string; text: string; dot: string; label: string }
> = {
  good: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
  moderate: {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
    label: "Moderate",
  },
  poor: {
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    text: "text-rose-800",
    dot: "bg-rose-500",
    label: "Needs attention",
  },
};

export function DiagnosisPanel({ diagnosis }: { diagnosis: FarmView }) {
  const zones = diagnosis.zones ?? [];
  const counts = zones.reduce(
    (acc, z) => {
      acc[z.health] = (acc[z.health] ?? 0) + 1;
      return acc;
    },
    { good: 0, moderate: 0, poor: 0 } as Record<ZoneHealth, number>
  );

  const attention = zones
    .filter((z) => z.health !== "good" && (z.issue || z.tip))
    .sort(
      (a, b) =>
        (a.health === "poor" ? 0 : 1) - (b.health === "poor" ? 0 : 1)
    );

  const grid: (ZoneAnalysis | null)[][] = Array.from({ length: 4 }, () =>
    Array(4).fill(null)
  );
  for (const z of zones) {
    if (z.row >= 0 && z.row < 4 && z.col >= 0 && z.col < 4) {
      grid[z.row][z.col] = z;
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-soft">
      <header className="flex items-start gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            Diagnosis — field health
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {diagnosis.overallSummary}
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatTile color="emerald" label="Healthy" value={counts.good} />
        <StatTile color="amber" label="Moderate" value={counts.moderate} />
        <StatTile color="rose" label="Poor" value={counts.poor} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Zone grid
          </p>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
            {grid.flatMap((row, r) =>
              row.map((z, c) => {
                const s = z ? HEALTH_STYLE[z.health] : HEALTH_STYLE.good;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={cn(
                      "aspect-square rounded-md ring-1 transition-colors",
                      z ? s.bg : "bg-white",
                      z ? s.ring : "ring-slate-200"
                    )}
                    title={
                      z
                        ? `${r + 1}·${c + 1} — ${s.label}${
                            z.issue ? `: ${z.issue}` : ""
                          }`
                        : undefined
                    }
                  />
                );
              })
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
            {(Object.keys(HEALTH_STYLE) as ZoneHealth[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", HEALTH_STYLE[k].dot)} />
                {HEALTH_STYLE[k].label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Zones needing attention ({attention.length})
          </p>
          {attention.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Every zone looks good — no intervention needed.
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {attention.map((z) => (
                <ZoneAttentionRow key={`${z.row}-${z.col}`} zone={z} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function StatTile({
  color,
  label,
  value,
}: {
  color: "emerald" | "amber" | "rose";
  label: string;
  value: number;
}) {
  const cls =
    color === "emerald"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : color === "amber"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-rose-50 text-rose-800 ring-rose-200";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1",
        cls
      )}
    >
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function ZoneAttentionRow({ zone }: { zone: ZoneAnalysis }) {
  const s = HEALTH_STYLE[zone.health];
  const Icon = zone.health === "poor" ? CircleAlert : AlertTriangle;
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2 ring-1",
        s.bg,
        s.ring
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 flex-none", s.text)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1",
              s.ring,
              s.text
            )}
          >
            {zone.row + 1}·{zone.col + 1}
          </span>
          <span className={cn("text-xs font-semibold uppercase tracking-wider", s.text)}>
            {s.label}
          </span>
        </div>
        {zone.issue && (
          <p className={cn("mt-0.5 text-sm", s.text)}>{zone.issue}</p>
        )}
        {zone.tip && (
          <p className="mt-0.5 text-xs text-slate-600">→ {zone.tip}</p>
        )}
      </div>
    </li>
  );
}
