import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Info,
  Satellite,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IndexKey, IndexStatus } from "@/types";
import { field, getIndex, imageDates } from "@/data/mockData";
import { IndexHeatmapSVG } from "@/components/visuals/IndexHeatmapSVG";
import { IndexTileMap } from "@/components/map/IndexTileMap";
import { useAnalysis } from "@/state/analysis";
import { LegendBar } from "@/components/dashboard/LegendBar";
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

export default function IndexDetails() {
  const { indexKey } = useParams<{ indexKey: IndexKey }>();
  const info = indexKey ? getIndex(indexKey) : undefined;
  const { current } = useAnalysis();

  if (!info) return <Navigate to="/" replace />;

  const real = current?.result.indices.find((i) => i.key === info.key);
  const realStatus = (real?.status as IndexStatus | undefined) ?? info.status;
  const displayStatus = real ? realStatus : info.status;
  const displayDate = real ? current!.result.imageDate : info.date;
  const displayMetric = real
    ? real.mean !== null
      ? `${real.mean.toFixed(info.name === "GCI" ? 2 : 3)} ${info.name === "GCI" ? "avg" : "avg"}`
      : "—"
    : info.metric;
  const displayAreaHa = real ? current!.result.areaHa : field.sizeHa;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-lg bg-slate-900/90 px-2 text-[11px] font-semibold uppercase tracking-wider text-white">
                {info.name}
              </span>
              <Badge variant={STATUS_BADGE[displayStatus]}>{displayStatus}</Badge>
              {real && (
                <Badge variant="padi" className="gap-1">
                  <Satellite className="h-3 w-3" /> Live GEE tiles
                </Badge>
              )}
            </div>
            <h1 className="mt-1.5 truncate text-2xl font-semibold text-slate-900">
              {info.fullName}
            </h1>
            <p className="text-sm text-slate-500">{info.shortExplanation}</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Export PNG
          </Button>
          <Button size="sm">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Generate report
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Satellite className="h-4 w-4 text-padi-700" />
              {real ? `Live Sentinel-2 composite — ${info.name}` : `Field heatmap — ${info.name}`}
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> Image date {displayDate}
            </span>
          </div>
          <div className="px-5">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-slate-200 bg-slate-100">
              {real && current ? (
                <IndexTileMap
                  geometry={current.geometry}
                  tileUrl={real.tileUrl}
                  height="100%"
                  className="h-full"
                />
              ) : (
                <IndexHeatmapSVG
                  indexKey={info.key}
                  seed={info.seed}
                  healthBias={HEALTH_BIAS[displayStatus]}
                  showBoundary
                  resolution={40}
                  rounded={false}
                />
              )}
              <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {displayMetric}
              </div>
              <div className="absolute right-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {displayAreaHa} ha · boundary outlined
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <LegendBar indexKey={info.key} />
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Field status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StatusRow label="Current" value={displayStatus} />
              <StatusRow label="Average value" value={displayMetric} />
              <StatusRow label="Field size" value={`${displayAreaHa} ha`} />
              <StatusRow
                label="Location"
                value={real ? "Drawn field" : field.location}
              />
              <StatusRow label="Crop stage" value={field.stage} />
              <StatusRow
                label="Latest Sentinel-2"
                value={real ? current!.result.imageDate : imageDates.sentinel2}
              />
              {real ? (
                <StatusRow
                  label="Scenes composited"
                  value={`${current!.result.imageCount}`}
                />
              ) : (
                <StatusRow
                  label="Latest Sentinel-1"
                  value={imageDates.sentinel1}
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-padi-50/60 ring-padi-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-padi-700" />
                What this means for you
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700">
                {info.longExplanation}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-dashed border-slate-200 bg-white/60">
            <CardHeader>
              <CardTitle className="text-slate-700">
                Detailed analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              Analysis report will be available in the next update. This will
              include zonal statistics, trend comparisons and agronomic
              recommendations tailored to your paddy stage.
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why this matters for paddy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-slate-700">
          {info.whyItMatters}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={cn("text-sm font-semibold text-slate-900 text-right")}
      >
        {value}
      </span>
    </div>
  );
}
