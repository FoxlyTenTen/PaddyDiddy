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
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IndexKey, IndexStatus } from "@/types";
import { field, getIndex, imageDates } from "@/data/mockData";
import { IndexHeatmapSVG } from "@/components/visuals/IndexHeatmapSVG";
import { FieldMatrixViz } from "@/components/visuals/FieldMatrixViz";
import { IndexTileMap } from "@/components/map/IndexTileMap";
import { useAnalysis } from "@/state/analysis";
import { LegendBar } from "@/components/dashboard/LegendBar";
import { cn } from "@/lib/utils";
import { recommendIndex, type RecommendResponse } from "@/services/gee";

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

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [recommendation, setRecommendation] = React.useState<RecommendResponse | null>(null);
  const [activeTab, setActiveTab] = React.useState<"report" | "matrix">("report");

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
      });
      setRecommendation(res);
      setActiveTab("report");
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
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" />
            )}
            Generate report
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

          {recommendation ? (
            <Card className="bg-white ring-1 ring-padi-200 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-padi-700" /> AI Recommendation
                  </CardTitle>
                  {/* Tab switcher */}
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                    <button
                      onClick={() => setActiveTab("report")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                        activeTab === "report"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <FileText className="h-3 w-3" />
                      Report
                    </button>
                    <button
                      onClick={() => setActiveTab("matrix")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
                        activeTab === "matrix"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      Zone Matrix
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-slate-700">
                {activeTab === "report" ? (
                  <>
                    <p className="font-semibold text-base">{recommendation.headline}</p>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Simple Explanation</h4>
                      <p>{recommendation.simple_explanation}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">What's happening</h4>
                      <p>{recommendation.whats_happening}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Likely causes</h4>
                      <ul className="list-disc pl-5">
                        {recommendation.likely_causes.map((cause, i) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Actions</h4>
                      <ul className="list-disc pl-5">
                        {recommendation.prevention_steps.map((step, i) => (
                          <li key={i}>
                            <strong>{step.action}</strong> ({step.when}) — {step.why}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <FieldMatrixViz
                    fieldPolygon={recommendation.field_polygon}
                    zoneStat={recommendation.zone_stats ?? []}
                    zonesMatrix={recommendation.zones_matrix}
                    rows={recommendation.rows ?? 4}
                    cols={recommendation.cols ?? 4}
                    indexName={recommendation.index_name ?? info.name}
                    indexMin={recommendation.index_min ?? 0}
                    indexMax={recommendation.index_max ?? 1}
                    indexPalette={recommendation.index_palette ?? ["#7f1d1d", "#eab308", "#15803d"]}
                    showExport
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed border-slate-200 bg-white/60">
              <CardHeader>
                <CardTitle className="text-slate-700">
                  Detailed analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-slate-500">
                <p>
                  Generate an AI-powered report to get zonal statistics, trend comparisons, and agronomic recommendations tailored to your paddy stage.
                </p>
                <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={!canGenerate} className="self-start">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 mt-2">
                    <AlertTriangle className="h-4 w-4 flex-none" />
                    <span>{error}</span>
                  </div>
                )}
                {!real && !loading && (
                  <p className="text-xs text-slate-400">
                    * Draw a field on the map first to enable live AI recommendations.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {recommendation && (
        <Card className="overflow-hidden col-span-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-padi-700" />
                Field Zone Matrix — {info.name}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="padi" className="gap-1">
                  <Satellite className="h-3 w-3" /> {recommendation.rows}×{recommendation.cols} zones
                </Badge>
                <Badge
                  variant={recommendation.severity === "critical" ? "attention" : recommendation.severity === "moderate" ? "moderate" : "healthy"}
                >
                  {recommendation.severity}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              AI-drawn matrix clipped to <strong>your actual drawn field shape</strong>. Each cell shows the real {info.name} value
              measured by Sentinel-2 — colour-coded from Critical → Low → Moderate → Optimal.
            </p>
          </CardHeader>
          <CardContent>
            <FieldMatrixViz
              fieldPolygon={recommendation.field_polygon}
              zoneStat={recommendation.zone_stats ?? []}
              zonesMatrix={recommendation.zones_matrix}
              rows={recommendation.rows ?? 4}
              cols={recommendation.cols ?? 4}
              indexName={recommendation.index_name ?? info.name}
              indexMin={recommendation.index_min ?? 0}
              indexMax={recommendation.index_max ?? 1}
              indexPalette={recommendation.index_palette ?? ["#7f1d1d", "#eab308", "#15803d"]}
              showExport
            />
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
