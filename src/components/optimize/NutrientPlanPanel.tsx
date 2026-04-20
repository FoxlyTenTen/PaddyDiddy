import { Sprout } from "lucide-react";
import type { NutrientPlan, NutrientZonePlan } from "@/types";
import { cn } from "@/lib/utils";

const UREA_BASELINE = 200;
const NPK_BASELINE = 250;

function ureaClass(kg: number): string {
  if (kg < UREA_BASELINE * 0.85) return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (kg > UREA_BASELINE * 1.1) return "bg-rose-100 text-rose-900 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}
function npkClass(kg: number): string {
  if (kg < NPK_BASELINE * 0.95) return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (kg > NPK_BASELINE * 1.05) return "bg-rose-100 text-rose-900 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function NutrientPlanPanel({ plan }: { plan: NutrientPlan }) {
  const zones = plan.zones ?? [];

  const grid: (NutrientZonePlan | null)[][] = Array.from({ length: 4 }, () =>
    Array(4).fill(null)
  );
  for (const z of zones) {
    if (z.row >= 0 && z.row < 4 && z.col >= 0 && z.col < 4) grid[z.row][z.col] = z;
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-amber-200 shadow-soft">
      <header className="flex flex-wrap items-start gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Sprout className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            Nutrient plan — variable-rate fertiliser
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">{plan.summary}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Baseline: Urea {UREA_BASELINE} kg/ha · NPK 15-15-15 {NPK_BASELINE} kg/ha
          </p>
        </div>
        <div className="flex gap-2">
          {plan.urea_saved_kg_per_ha !== undefined && (
            <SaveTile label="Urea saved" value={plan.urea_saved_kg_per_ha} />
          )}
          {plan.npk_saved_kg_per_ha !== undefined && (
            <SaveTile label="NPK saved" value={plan.npk_saved_kg_per_ha} />
          )}
        </div>
      </header>

      {zones.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Urea heatmap (kg/ha)
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {grid.flatMap((row, r) =>
                row.map((z, c) => (
                  <div
                    key={`u-${r}-${c}`}
                    className={cn(
                      "aspect-square rounded-lg px-1 py-1.5 text-center ring-1",
                      z ? ureaClass(z.urea_kg_per_ha) : "bg-white ring-slate-200"
                    )}
                    title={z?.reason ?? ""}
                  >
                    <div className="text-[9px] font-mono text-slate-500">
                      {r + 1}·{c + 1}
                    </div>
                    <div className="text-sm font-bold tabular-nums">
                      {z ? z.urea_kg_per_ha : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              NPK heatmap (kg/ha)
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {grid.flatMap((row, r) =>
                row.map((z, c) => (
                  <div
                    key={`n-${r}-${c}`}
                    className={cn(
                      "aspect-square rounded-lg px-1 py-1.5 text-center ring-1",
                      z ? npkClass(z.npk_kg_per_ha) : "bg-white ring-slate-200"
                    )}
                    title={z?.reason ?? ""}
                  >
                    <div className="text-[9px] font-mono text-slate-500">
                      {r + 1}·{c + 1}
                    </div>
                    <div className="text-sm font-bold tabular-nums">
                      {z ? z.npk_kg_per_ha : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {zones.length > 0 && (
        <details className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-600">
            Per-zone reasoning ({zones.length})
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {zones.map((z) => (
              <li
                key={`${z.row}-${z.col}`}
                className="rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200"
              >
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                  {z.row + 1}·{z.col + 1}
                </span>
                <span className="ml-1.5 text-slate-800">
                  {z.urea_kg_per_ha}U · {z.npk_kg_per_ha}N
                </span>
                {z.reason && (
                  <span className="ml-1.5 text-slate-500">— {z.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function SaveTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-amber-50 px-3 py-2 text-right ring-1 ring-amber-200">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums text-amber-900">
        {value} kg/ha
      </div>
    </div>
  );
}
