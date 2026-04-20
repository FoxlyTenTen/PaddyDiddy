import { Coins, Droplets, Sprout } from "lucide-react";
import type { RoiSummary, ZoneAction } from "@/types";
import { cn } from "@/lib/utils";

function formatRm(v: number | undefined): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "RM 0";
  return `RM ${v.toLocaleString("en-MY", { maximumFractionDigits: 2 })}`;
}

export function RoiSummaryPanel({ roi }: { roi: RoiSummary }) {
  const actions = [...(roi.actions ?? [])].sort(
    (a, b) => b.saving_rm - a.saving_rm
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-padi-600 via-padi-700 to-emerald-700 p-6 text-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Estimated savings this cycle
          </p>
          <p className="mt-1 text-4xl font-bold tracking-tight">
            {formatRm(roi.total_savings_rm)}
          </p>
          {roi.headline && (
            <p className="mt-2 max-w-2xl text-sm text-white/90">
              {roi.headline}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SavingsTile
            icon={<Droplets className="h-4 w-4" />}
            label="Water"
            value={formatRm(roi.water_savings_rm)}
          />
          <SavingsTile
            icon={<Sprout className="h-4 w-4" />}
            label="Nutrient"
            value={formatRm(roi.nutrient_savings_rm)}
          />
        </div>
      </div>

      {actions.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/10 text-[11px] uppercase tracking-wider text-white/70">
              <tr>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2 text-right">Saving</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {actions.map((a) => (
                <ActionRow key={`${a.row}-${a.col}`} action={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SavingsTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/70">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActionRow({ action }: { action: ZoneAction }) {
  const savingsTier =
    action.saving_rm >= 20
      ? "bg-amber-400/20 text-amber-100"
      : action.saving_rm >= 5
      ? "bg-sky-400/15 text-sky-100"
      : "bg-white/10 text-white/80";
  return (
    <tr>
      <td className="px-3 py-2 align-top">
        <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[11px]">
          {action.row + 1}·{action.col + 1}
        </span>
      </td>
      <td className="px-3 py-2 align-top text-white/90">{action.action}</td>
      <td className="px-3 py-2 text-right align-top">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
            savingsTier
          )}
        >
          <Coins className="h-3 w-3" />
          {formatRm(action.saving_rm)}
        </span>
      </td>
    </tr>
  );
}
