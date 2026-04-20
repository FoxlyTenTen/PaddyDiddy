import { CloudRain, Droplets, Droplet, CloudOff } from "lucide-react";
import type { WaterPlan, WaterScheduleEntry } from "@/types";
import { cn } from "@/lib/utils";

function actionStyle(action: string) {
  const a = action.toLowerCase();
  if (a.includes("skip"))
    return {
      pill: "bg-sky-50 text-sky-700 ring-sky-200",
      Icon: CloudRain,
    };
  if (a.includes("drain"))
    return {
      pill: "bg-amber-50 text-amber-800 ring-amber-200",
      Icon: CloudOff,
    };
  return {
    pill: "bg-padi-50 text-padi-800 ring-padi-200",
    Icon: Droplets,
  };
}

export function WaterPlanPanel({ plan }: { plan: WaterPlan }) {
  const schedule = plan.schedule ?? [];
  const forecast = plan.rain_forecast ?? [];
  const maxRain = forecast.reduce((m, d) => Math.max(m, d.rain_mm ?? 0), 0) || 1;

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-sky-200 shadow-soft">
      <header className="flex flex-wrap items-start gap-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200">
          <Droplet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            Water plan — 7-day irrigation
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">{plan.summary}</p>
        </div>
        {plan.water_saved_mm !== undefined && (
          <div className="rounded-xl bg-sky-50 px-3 py-2 text-right ring-1 ring-sky-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">
              Water saved
            </div>
            <div className="text-xl font-bold tabular-nums text-sky-800">
              {plan.water_saved_mm} mm
            </div>
          </div>
        )}
      </header>

      {forecast.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Rain forecast (Google Maps Weather API)
          </p>
          <div className="flex items-end gap-2 rounded-xl bg-sky-50/60 p-3 ring-1 ring-sky-100">
            {forecast.map((d) => {
              const pct = ((d.rain_mm ?? 0) / maxRain) * 100;
              return (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-medium tabular-nums text-sky-800">
                    {d.rain_mm ?? 0}mm
                  </span>
                  <div className="flex h-16 w-full items-end rounded-md bg-white/70 ring-1 ring-sky-100">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-sky-500 to-sky-300"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {d.date?.slice(5) ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {schedule.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Schedule ({schedule.length} entries)
          </p>
          <ul className="flex flex-col gap-1.5">
            {schedule.map((s, i) => (
              <ScheduleRow key={`${s.day}-${s.zone}-${i}`} entry={s} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ScheduleRow({ entry }: { entry: WaterScheduleEntry }) {
  const s = actionStyle(entry.action);
  const { Icon } = s;
  return (
    <li className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <div
        className={cn(
          "grid h-7 w-7 flex-none place-items-center rounded-lg ring-1",
          s.pill
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {entry.day}
          </span>
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200">
            zone {entry.zone}
          </span>
          <span className={cn("text-sm font-medium", "text-slate-800")}>
            {entry.action}
          </span>
        </div>
        {entry.reason && (
          <p className="mt-0.5 text-xs text-slate-500">{entry.reason}</p>
        )}
      </div>
    </li>
  );
}
