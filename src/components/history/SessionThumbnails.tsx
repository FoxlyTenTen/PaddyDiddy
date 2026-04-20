import type { MonitoringSession, IndexKey, IndexStatus } from "@/types";
import { IndexHeatmapSVG } from "@/components/visuals/IndexHeatmapSVG";
import { cn } from "@/lib/utils";

const ORDER: IndexKey[] = ["ndvi", "ndre", "lswi", "gci"];

const BIAS: Record<IndexStatus, number> = {
  Healthy: 0.78,
  Moderate: 0.55,
  "Needs Attention": 0.32,
};

const DOT: Record<IndexStatus, string> = {
  Healthy: "bg-emerald-500",
  Moderate: "bg-amber-500",
  "Needs Attention": "bg-rose-500",
};

export function SessionThumbnails({
  session,
  size = "md",
}: {
  session: MonitoringSession;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-14" : "h-20";
  return (
    <div className="flex items-end gap-2">
      {ORDER.map((k) => {
        const per = session.perIndex[k];
        return (
          <div key={k} className="flex flex-col gap-1.5">
            <div
              className={cn(
                "relative w-20 overflow-hidden rounded-lg ring-1 ring-slate-200",
                h
              )}
            >
              <IndexHeatmapSVG
                indexKey={k}
                seed={per.seed}
                healthBias={BIAS[per.status]}
                showBoundary
                rounded={false}
              />
              <span className="absolute left-1 top-1 rounded-sm bg-black/55 px-1 text-[9px] font-semibold uppercase tracking-wider text-white">
                {k}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600">
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[per.status])} />
              {per.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
