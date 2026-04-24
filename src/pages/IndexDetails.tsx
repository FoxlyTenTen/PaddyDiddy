import * as React from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Info,
  Satellite,
  Sparkles,
  Loader2,
  AlertTriangle,
  LayoutGrid,
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
import { recommendIndex, type RecommendResponse } from "@/services/gee";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  const { indexKey } = useParams<{ indexKey: IndexKey }>();
  const info = indexKey ? getIndex(indexKey) : undefined;
  const { current } = useAnalysis();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recommendation, setRecommendation] = React.useState<RecommendResponse | null>(null);

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

  async function handleGenerateReport() {
    if (!current?.geometry || !info) return;
    setLoading(true);
    setError(null);
    try {
      const res = await recommendIndex(current.geometry, info.key, {
        startDate: current.result.window.start,
        endDate: current.result.window.end,
        language: i18n.language,
      });
      setRecommendation(res);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = !!current?.geometry && !loading;

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
          <Button size="sm" onClick={handleGenerateReport} disabled={!canGenerate}>
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t("indexDetails.generateQuickReport", "Quick AI Report")}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="overflow-hidden">
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

          {recommendation ? (
            <Card className="bg-white ring-1 ring-padi-200 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-padi-700" /> AI Quick Report
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 text-sm text-slate-700">
                <div className="rounded-lg bg-padi-50 p-4 ring-1 ring-padi-100">
                  <p className="font-bold text-lg text-padi-900 leading-tight">
                    {recommendation.headline}
                  </p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-70">
                        <Info className="h-3.5 w-3.5 text-padi-600" /> Simple Explanation
                      </h4>
                      <p className="leading-relaxed">{recommendation.simple_explanation}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-70">
                        <Satellite className="h-3.5 w-3.5 text-padi-600" /> What's happening
                      </h4>
                      <p className="leading-relaxed">{recommendation.whats_happening}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-70">
                        <AlertTriangle className="h-3.5 w-3.5 text-padi-600" /> Likely causes
                      </h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {recommendation.likely_causes.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-70">
                    <Sparkles className="h-3.5 w-3.5 text-padi-600" /> Action Steps
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {recommendation.prevention_steps.map((step, i) => (
                      <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="text-[10px] font-bold text-padi-600 uppercase mb-1">{step.when}</div>
                        <div className="font-semibold text-slate-900 mb-1 leading-snug">{step.action}</div>
                        <div className="text-[11px] text-slate-500 leading-normal">{step.why}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-slate-200 bg-white/60">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-4">
                <div className="rounded-full bg-slate-100 p-4">
                  <Sparkles className="h-8 w-8 text-slate-400" />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-lg font-semibold text-slate-900">No analysis yet</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Generate an AI-powered report to get simple explanations and actionable steps for this index.
                  </p>
                </div>
                <Button size="lg" onClick={handleGenerateReport} disabled={!canGenerate} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Quick AI Report
                </Button>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 mt-2 text-left">
                    <AlertTriangle className="h-4 w-4 flex-none" />
                    <span>{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
                Index overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700">
                {info.longExplanation}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {recommendation && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-padi-700" />
              Zone Action Matrix (4x4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, i) => {
                const r = Math.floor(i / 4);
                const c = i % 4;
                const zone = recommendation.zones_matrix.find(z => z.row === r && z.col === c);
                
                if (!zone) return <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50" />;

                const isAttention = zone.status === "attention";

                return (
                  <div 
                    key={i} 
                    className={cn(
                      "p-3 rounded-lg border flex flex-col gap-1 text-[11px]",
                      isAttention 
                        ? "bg-rose-50 border-rose-200" 
                        : "bg-emerald-50 border-emerald-200"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold opacity-70">R{r}, C{c}</span>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        isAttention ? "bg-rose-500" : "bg-emerald-500"
                      )} />
                    </div>
                    <span className={cn(
                      "font-medium leading-tight",
                      isAttention ? "text-rose-800" : "text-emerald-800"
                    )}>
                      {zone.action_needed}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
