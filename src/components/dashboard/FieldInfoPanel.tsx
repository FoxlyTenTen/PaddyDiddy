import { MapPin, Ruler, CalendarDays, Sprout, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { field } from "@/data/mockData";

function MiniFieldShape() {
  return (
    <svg viewBox="0 0 120 96" className="h-full w-full">
      <defs>
        <linearGradient id="ff" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="120" height="96" rx="12" fill="#f1f5f9" />
      <polygon
        points="22,20 95,14 108,46 92,80 40,84 14,58"
        fill="url(#ff)"
        stroke="#15803d"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        opacity="0.92"
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={24 + i * 8}
          y1="18"
          x2={20 + i * 8}
          y2="84"
          stroke="#15803d"
          strokeOpacity="0.18"
          strokeWidth="0.6"
        />
      ))}
      <circle cx="70" cy="48" r="3" fill="#f43f5e" />
      <circle cx="70" cy="48" r="6" fill="#f43f5e" fillOpacity="0.25" />
    </svg>
  );
}

export function FieldInfoPanel() {
  const stats = [
    { icon: MapPin, label: "Location", value: field.location },
    { icon: Ruler, label: "Field size", value: `${field.sizeHa} hectares` },
    { icon: Sprout, label: "Crop stage", value: field.stage },
    { icon: CalendarDays, label: "Last monitored", value: field.latestMonitoring },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.6fr_1fr]">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Badge variant="padi" className="gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Boundary {field.boundaryStatus}
            </Badge>
            <Badge variant="outline">{field.crop}</Badge>
            <Badge variant="outline">Planted {field.plantingDate}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {field.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoring the health of your paddy field using the latest
            satellite observations. All values shown are snapshots, not live
            sensors.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/70"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-padi-50 to-emerald-50 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_120%_0%,rgba(22,163,74,0.18),transparent_70%)]" />
          <div className="relative flex h-full flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-padi-800/80">
              Field boundary
            </span>
            <div className="mt-2 flex-1">
              <MiniFieldShape />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Abnormal zone detected
              </span>
              <span className="text-slate-400">1 of 4 zones</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
