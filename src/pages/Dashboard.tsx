import { FieldInfoPanel } from "@/components/dashboard/FieldInfoPanel";
import { ImageDateBanner } from "@/components/dashboard/ImageDateBanner";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { IndexGallery } from "@/components/dashboard/IndexGallery";
import { AnalysisBanner } from "@/components/dashboard/AnalysisBanner";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <AnalysisBanner />
      <FieldInfoPanel />
      <ImageDateBanner />

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Field health at a glance
            </h2>
            <p className="text-sm text-slate-500">
              Four headline signals summarised from today's satellite indices.
            </p>
          </div>
        </div>
        <SummaryCardGrid />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Field Index Monitoring
            </h2>
            <p className="text-sm text-slate-500">
              Each index tells you something different about your paddy. Tap a
              card for a larger view.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white p-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            <button className="rounded-full bg-padi-600 px-3 py-1 text-white shadow-sm">
              Grid
            </button>
            <button className="rounded-full px-3 py-1 text-slate-500">
              Compare
            </button>
          </div>
        </div>
        <IndexGallery />
      </section>
    </div>
  );
}
