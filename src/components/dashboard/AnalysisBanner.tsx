import { Link } from "react-router-dom";
import {
  CalendarDays,
  PenLine,
  Ruler,
  Satellite,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/state/analysis";

export function AnalysisBanner() {
  const { current } = useAnalysis();

  if (!current) {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-padi-700 via-padi-600 to-emerald-500 p-5 text-white shadow-soft md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider opacity-90">
              Live monitoring
            </div>
            <h3 className="text-lg font-semibold">
              Draw your paddy on the map for real Earth Engine indices
            </h3>
            <p className="text-sm text-white/80">
              Demo data is shown below. Trace your field to replace it with
              live Sentinel-2 NDVI, NDRE, LSWI and GCI heatmaps.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="lg"
          className="bg-white text-padi-800 hover:bg-white/90"
        >
          <Link to="/map">
            <PenLine className="mr-1.5 h-4 w-4" /> Start drawing
          </Link>
        </Button>
      </div>
    );
  }

  const r = current.result;
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-padi-200/70 shadow-soft md:flex-row md:items-center">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-padi-50 text-padi-700 ring-1 ring-padi-100">
          <Satellite className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-padi-700">
            Live analysis · Google Earth Engine
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {current.label ?? "My drawn field"} · Sentinel-2 composite
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> Latest image {r.imageDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3 w-3" /> {r.areaHa} ha
            </span>
            <span>· {r.imageCount} scenes composited</span>
            <span>
              · Window {r.window.start} → {r.window.end}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/map">
            <PenLine className="mr-1.5 h-3.5 w-3.5" /> Re-run
          </Link>
        </Button>
      </div>
    </div>
  );
}
