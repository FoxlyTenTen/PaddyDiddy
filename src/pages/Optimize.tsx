import { 
  FlaskConical, 
  Loader2, 
  PenLine, 
  Sparkles, 
  ChevronRight, 
  Activity, 
  AlertCircle,
  Calendar,
  Layers,
  ClipboardList
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAnalysis } from "@/state/analysis";
import type {
  AgentKey,
} from "@/types";
import { AgentCard } from "@/components/optimize/AgentCard";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const AGENT_ORDER: AgentKey[] = [
  "visual_analyst",
  "diagnostic_agronomist",
  "action_planner",
];

export default function Optimize() {
  const { t } = useTranslation();
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
  const actionPlan = result?.action_plan;
  const imageB64 = result?.generated_image;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("optimize.title", "Intelligent Field Optimizer")}
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            {t("optimize.description", "A specialized 3-agent system that visualizes your field conditions using Nano Banana and generates immediate action steps.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              {t("optimize.complete", "Field analysis complete")}
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
                {t("optimize.working", "Agents working…")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {done ? t("optimize.rerun", "Re-run analysis") : t("optimize.generate", "Generate field plan")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasField && (
        <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-slate-200 shadow-soft">
          <PenLine className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No field boundary detected</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            We need to know your farm's boundary to run the satellite analysis. 
            Head to the map to trace your field.
          </p>
          <Link
            to="/map"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-padi-600 px-6 py-3 text-sm font-bold text-white hover:bg-padi-700 transition-all"
          >
            <PenLine className="h-4 w-4" />
            Go to map page
          </Link>
        </div>
      )}

      {/* Hero: Generated Image & Summary */}
      {done && imageB64 && (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <Activity className="h-3.5 w-3.5 text-padi-600" />
                Annotated Field View
             </div>
             <div className="relative overflow-hidden rounded-3xl bg-slate-950 ring-1 ring-slate-200 shadow-xl group">
                <img 
                  src={`data:image/png;base64,${imageB64}`} 
                  alt="Annotated farm view" 
                  className="w-full h-auto block object-cover"
                />
                <div className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white ring-1 ring-white/20">
                   Satellite-Grounded View
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-6">
             {actionPlan && (
               <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <ClipboardList className="h-3.5 w-3.5 text-padi-600" />
                    Immediate Recommendations
                  </div>
                  
                  <div className="rounded-3xl bg-white p-6 ring-1 ring-padi-100 shadow-soft border-l-8 border-l-padi-600">
                     <p className="text-base font-semibold text-slate-900 leading-snug">
                        {actionPlan.farmer_summary}
                     </p>
                     
                     <div className="mt-6 space-y-3">
                        {actionPlan.action_checklist.map((item, i) => (
                           <div key={i} className="flex gap-4 p-3 rounded-2xl bg-slate-50 ring-1 ring-slate-100 hover:ring-padi-200 transition-all group">
                              <div className={cn(
                                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs ring-1",
                                item.urgency === 'Today' ? "bg-rose-500 text-white ring-rose-600" :
                                item.urgency === 'This week' ? "bg-amber-500 text-white ring-amber-600" :
                                "bg-emerald-500 text-white ring-emerald-600"
                              )}>
                                 {item.zone_label}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-900 text-sm truncate">{item.action}</span>
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                      item.urgency === 'Today' ? "text-rose-600 bg-rose-50" : "text-slate-500 bg-slate-200"
                                    )}>{item.urgency}</span>
                                 </div>
                                 <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-tight">
                                    {item.why}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="mt-6 p-4 rounded-2xl bg-padi-50 ring-1 ring-padi-100 border border-dashed border-padi-200">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-padi-700 mb-1">
                           <Calendar className="h-3 w-3" /> Monitoring Plan
                        </div>
                        <p className="text-xs text-padi-900 font-medium italic">
                           {actionPlan.monitoring_plan}
                        </p>
                     </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Preparing notice */}
      {optimization.status === "preparing" && (
        <div className="flex items-center gap-3 rounded-3xl bg-blue-50 px-6 py-4 text-sm text-blue-800 ring-1 ring-blue-200 animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin" />
          Synchronizing with Google Earth Engine & Nano Banana Visual Engine…
        </div>
      )}

      {/* Agent pipeline status (shown while running or finished) */}
      {(running || done || optimization.status === "error") && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
             <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
               Sequential Reasoning Pipeline
             </p>
             {optimization.imageDate && (
               <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Data Source: Sentinel-2 ({optimization.imageDate})
               </span>
             )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {AGENT_ORDER.map((key) => (
              <AgentCard key={key} state={optimization.agents[key]} />
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {optimization.status === "error" && optimization.error && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-6 text-sm text-rose-800 ring-1 ring-rose-200">
          <AlertCircle className="h-6 w-6 flex-none text-rose-500" />
          <div>
            <p className="font-bold text-lg">System Handoff Failed</p>
            <p className="mt-1 font-medium">{optimization.error}</p>
            <button 
              onClick={onRun}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700"
            >
               Retry Analysis
            </button>
          </div>
        </div>
      )}

      {/* Judge reasoning (Collapsible) */}
      {done && actionPlan && (
        <details className="group mt-6 rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
          <summary className="flex cursor-pointer items-center gap-3 px-6 py-4 text-sm font-bold text-slate-700 select-none hover:bg-slate-50 transition">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white">
               <Activity className="h-4 w-4" />
            </div>
            Technical Multi-Agent Trace (Hackathon Judge Mode)
            <ChevronRight className="ml-auto h-5 w-5 transition-transform group-open:rotate-90 text-slate-400" />
          </summary>
          <div className="px-6 pb-6 pt-2 space-y-6">
             <div className="p-4 rounded-2xl bg-slate-900 text-padi-400 border-l-4 border-l-padi-500">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-2">Sequential Architecture Note</h4>
                <p className="text-sm font-medium italic leading-relaxed">
                   "{actionPlan.judge_summary}"
                </p>
             </div>
             
             <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                   <h5 className="text-[10px] font-black uppercase text-slate-500">Agent 1: Visual Extraction Findings</h5>
                   <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] overflow-auto max-h-48 font-mono">
                      {JSON.stringify(result?.visual_analysis, null, 2)}
                   </pre>
                </div>
                <div className="space-y-2">
                   <h5 className="text-[10px] font-black uppercase text-slate-500">Agent 2: Agronomic Diagnoses</h5>
                   <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] overflow-auto max-h-48 font-mono">
                      {JSON.stringify(result?.diagnoses, null, 2)}
                   </pre>
                </div>
             </div>
          </div>
        </details>
      )}

      {/* Idle hint */}
      {optimization.status === "idle" && hasField && (
        <div className="rounded-3xl bg-gradient-to-br from-padi-600 to-emerald-600 p-8 text-white shadow-xl shadow-padi-600/20">
          <div className="flex items-start gap-4">
             <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <FlaskConical className="h-6 w-6" />
             </div>
             <div>
                <h2 className="text-xl font-bold italic">Deep Insights Multi-Agent Prototype</h2>
                <p className="mt-2 text-white/80 max-w-xl text-sm leading-relaxed font-medium">
                   This system doesn't just show data. It reasons through a sequential 
                   pipeline to identify problem areas, uses Gemini Vision to draw them, 
                   and generates a prioritized plan.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                   {['Satellite Analysis', 'Vision Annotated Maps', 'Automated Checklists'].map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-[10px] font-bold tracking-tight">
                         {tag}
                      </span>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
