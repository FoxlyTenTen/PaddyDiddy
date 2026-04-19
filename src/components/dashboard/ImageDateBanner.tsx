import { Satellite, Radar, Clock3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { imageDates } from "@/data/mockData";

function Item({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-900">
          {value}
          <span className="ml-2 text-xs font-normal text-slate-500">
            {hint}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ImageDateBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-soft md:flex-nowrap">
      <Item
        icon={Satellite}
        label="Latest Sentinel-2 Image"
        value={imageDates.sentinel2}
        hint="optical · 10 m"
        accent="bg-padi-50 text-padi-700"
      />
      <Separator orientation="vertical" className="hidden h-10 md:block" />
      <Item
        icon={Radar}
        label="Latest Sentinel-1 Image"
        value={imageDates.sentinel1}
        hint="radar · all-weather"
        accent="bg-sky-50 text-sky-700"
      />
      <Separator orientation="vertical" className="hidden h-10 md:block" />
      <Item
        icon={Clock3}
        label="Field Condition"
        value="Updated"
        hint="snapshot · not live"
        accent="bg-amber-50 text-amber-700"
      />
      <div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 lg:flex">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        All indices refreshed from latest pass
      </div>
    </div>
  );
}
