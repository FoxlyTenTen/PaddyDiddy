import * as React from "react";
import { AlertCircle, FlaskConical, Loader2, PenLine, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAnalysis } from "@/state/analysis";
import type {
  AgentKey,
  FarmView,
  NutrientPlan,
  RoiSummary,
  WaterPlan,
} from "@/types";
import { AgentCard } from "@/components/optimize/AgentCard";
import { RoiSummaryPanel } from "@/components/optimize/RoiSummaryPanel";
import { DiagnosisPanel } from "@/components/optimize/DiagnosisPanel";
import { WaterPlanPanel } from "@/components/optimize/WaterPlanPanel";
import { NutrientPlanPanel } from "@/components/optimize/NutrientPlanPanel";

const AGENT_ORDER: AgentKey[] = [
  "diagnosis",
  "water_optimizer",
  "nutrient_optimizer",
  "roi",
];

function parseMaybeJson<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/^```json\s*/i, "").replace(/```$/g, "");
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

export default function Optimize() {
  const { current, optimization, runOptimization } = useAnalysis();
  const hasField = Boolean(current?.geometry?.coordinates?.[0]);
  const running =
    optimization.status === "preparing" || optimization.status === "running";
  const done = optimization.status === "done";

  const onRun = () => {
    if (!current) return;
    void runOptimization(current.geometry);
  };

  const result = optimization.finalResult;
  const roi = React.useMemo(
    () => parseMaybeJson<RoiSummary>(result?.roi),
    [result?.roi]
  );
  const diagnosis = React.useMemo(
    () => parseMaybeJson<FarmView>(result?.diagnosis),
    [result?.diagnosis]
  );
  const waterPlan = React.useMemo(
    () => parseMaybeJson<WaterPlan>(result?.water_plan),
    [result?.water_plan]
  );
  const nutrientPlan = React.useMemo(
    () => parseMaybeJson<NutrientPlan>(result?.nutrient_plan),
    [result?.nutrient_plan]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Optimize resources
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Four AI agents collaborate on your field: diagnosis reads the
            satellite indices, water &amp; nutrient agents plan in parallel,
            and ROI rolls it all up into Ringgit savings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Pipeline complete
            </span>
          )}
          <button
            type="button"
            onClick={onRun}
            disabled={!hasField || running}
            className="inline-flex items-center gap-1.5 rounded-full bg-padi-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-padi-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Agents running…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {done ? "Run again" : "Generate plan"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasField && (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200 shadow-soft">
          <PenLine className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-800">
            Draw a field first
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            The optimizer needs a polygon to analyse. Head to the map, draw
            your paddy boundary, then come back.
          </p>
          <Link
            to="/map"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-padi-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-padi-700"
          >
            <PenLine className="h-3.5 w-3.5" />
            Draw field
          </Link>
        </div>
      )}

      {/* Preparing notice */}
      {optimization.status === "preparing" && (
        <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing satellite scene from Google Earth Engine…
        </div>
      )}

      {/* Scene metadata */}
      {optimization.areaHa !== undefined && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
            Area:{" "}
            <b className="text-slate-700">
              {optimization.areaHa.toFixed(2)} ha
            </b>
          </span>
          {optimization.imageDate && (
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              Image date:{" "}
              <b className="text-slate-700">{optimization.imageDate}</b>
            </span>
          )}
          {optimization.fieldCenter && (
            <span className="rounded-full bg-white px-3 py-1 font-mono ring-1 ring-slate-200">
              {optimization.fieldCenter.lat.toFixed(4)},{" "}
              {optimization.fieldCenter.lon.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {optimization.status === "error" && optimization.error && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <div>
            <p className="font-semibold">Pipeline failed</p>
            <p className="mt-0.5 text-xs text-rose-700">{optimization.error}</p>
          </div>
        </div>
      )}

      {/* === 1. ROI hero (top when done) === */}
      {done && roi && <RoiSummaryPanel roi={roi} />}

      {/* === 2. Agent pipeline status === */}
      {(running || done || optimization.status === "error") && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Agent pipeline
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {AGENT_ORDER.map((key) => (
              <AgentCard key={key} state={optimization.agents[key]} />
            ))}
          </div>
        </div>
      )}

      {/* === 3. Research results === */}
      {done && (diagnosis || waterPlan || nutrientPlan) && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-slate-500" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Research results — how we reached that number
            </p>
          </div>

          {diagnosis && <DiagnosisPanel diagnosis={diagnosis} />}
          {waterPlan && <WaterPlanPanel plan={waterPlan} />}
          {nutrientPlan && <NutrientPlanPanel plan={nutrientPlan} />}
        </div>
      )}

      {/* === Idle hint === */}
      {optimization.status === "idle" && hasField && (
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-6 text-sm text-slate-600 ring-1 ring-slate-200 shadow-soft">
          <p className="font-medium text-slate-800">How this works</p>
          <ol className="mt-2 space-y-1 pl-5 text-xs [list-style:decimal] text-slate-600">
            <li>
              <b>Diagnosis</b> reads the latest Sentinel-2 indices and flags
              each zone as good / moderate / poor.
            </li>
            <li>
              <b>Water</b> &amp; <b>Nutrient</b> agents run <i>in parallel</i>:
              water pulls a 7-day rain forecast via the Google Maps Weather
              API, nutrient computes variable-rate urea + NPK.
            </li>
            <li>
              <b>ROI</b> agent adds it all up using Malaysian retail prices
              and outputs a headline Ringgit number + per-zone action list.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
