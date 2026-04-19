import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { IndexInfo, IndexStatus } from "@/types";
import { IndexHeatmapSVG } from "@/components/visuals/IndexHeatmapSVG";
import { IndexTileMap } from "@/components/map/IndexTileMap";
import { useAnalysis } from "@/state/analysis";
import { LegendBar } from "./LegendBar";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<
  IndexStatus,
  "healthy" | "moderate" | "attention"
> = {
  Healthy: "healthy",
  Moderate: "moderate",
  "Needs Attention": "attention",
};

const HEALTH_BIAS: Record<IndexStatus, number> = {
  Healthy: 0.78,
  Moderate: 0.55,
  "Needs Attention": 0.32,
};

export function IndexCard({ info }: { info: IndexInfo }) {
  const { current } = useAnalysis();
  const real = current?.result.indices.find((i) => i.key === info.key);
  const realStatus = (real?.status as IndexStatus | undefined) ?? info.status;
  const displayStatus = real ? realStatus : info.status;
  const displayDate = real ? current!.result.imageDate : info.date;
  const displayMetric = real
    ? real.mean !== null
      ? `${info.name === "GCI" ? real.mean.toFixed(1) : real.mean.toFixed(2)} avg`
      : "—"
    : info.metric;

  return (
    <Link
      to={`/index/${info.key}`}
      className="group block h-full"
      aria-label={`Open ${info.name} details`}
    >
      <Card
        className={cn(
          "flex h-full flex-col overflow-hidden transition-all",
          "hover:-translate-y-0.5 hover:shadow-lift"
        )}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex h-7 items-center rounded-lg bg-slate-900/90 px-2 text-[11px] font-semibold uppercase tracking-wider text-white">
                {info.name}
              </span>
              <Badge variant={STATUS_BADGE[displayStatus]}>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    displayStatus === "Healthy" && "bg-emerald-500",
                    displayStatus === "Moderate" && "bg-amber-500",
                    displayStatus === "Needs Attention" && "bg-rose-500"
                  )}
                />
                {displayStatus}
              </Badge>
              {real && (
                <Badge variant="padi" className="gap-1 py-0 text-[10px]">
                  <Satellite className="h-3 w-3" /> Live GEE
                </Badge>
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              {info.fullName}
            </h3>
            <p className="text-xs text-slate-500">{info.shortExplanation}</p>
          </div>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>

        <div className="px-5">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-slate-200 bg-slate-100">
            {real && current ? (
              <IndexTileMap
                geometry={current.geometry}
                tileUrl={real.tileUrl}
                interactive={false}
                height="100%"
                className="h-full"
              />
            ) : (
              <IndexHeatmapSVG
                indexKey={info.key}
                seed={info.seed}
                healthBias={HEALTH_BIAS[displayStatus]}
                showBoundary
                rounded={false}
              />
            )}
            <div className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {displayMetric}
            </div>
          </div>
        </div>

        <div className="px-5 pt-3">
          <LegendBar indexKey={info.key} compact />
        </div>

        <div className="mt-auto flex items-center justify-between px-5 py-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Image date {displayDate}
          </span>
          <span className="text-xs font-medium text-padi-700 group-hover:underline">
            View details →
          </span>
        </div>
      </Card>
    </Link>
  );
}
