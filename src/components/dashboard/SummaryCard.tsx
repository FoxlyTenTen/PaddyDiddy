import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Droplets,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
import type { IndexStatus, IndexKey } from "@/types";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: string;
  sub: string;
  trend: string;
  status: IndexStatus;
  indexKey: IndexKey;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Overall Health": Activity,
  "Early Stress": AlertTriangle,
  Moisture: Droplets,
  Chlorophyll: Leaf,
};

const STATUS_STYLES: Record<IndexStatus, string> = {
  Healthy:
    "bg-gradient-to-br from-emerald-50 to-white ring-emerald-100 text-emerald-700",
  Moderate:
    "bg-gradient-to-br from-amber-50 to-white ring-amber-100 text-amber-700",
  "Needs Attention":
    "bg-gradient-to-br from-rose-50 to-white ring-rose-100 text-rose-700",
};

const DOT: Record<IndexStatus, string> = {
  Healthy: "bg-emerald-500",
  Moderate: "bg-amber-500",
  "Needs Attention": "bg-rose-500",
};

export function SummaryCard({
  title,
  value,
  sub,
  trend,
  status,
  indexKey,
}: SummaryCardProps) {
  const Icon = ICONS[title] ?? Activity;
  return (
    <Link
      to={`/index/${indexKey}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl p-5 ring-1 shadow-soft transition-all hover:shadow-lift hover:-translate-y-0.5",
        STATUS_STYLES[status]
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 ring-1 ring-black/5">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-slate-700">{title}</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
          <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} />
          {status}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between text-xs text-slate-600">
        <span>{sub}</span>
        <span className="font-medium">{trend}</span>
      </div>
    </Link>
  );
}
