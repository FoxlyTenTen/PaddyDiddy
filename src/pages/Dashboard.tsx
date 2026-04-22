import { FieldInfoPanel } from "@/components/dashboard/FieldInfoPanel";
import { ImageDateBanner } from "@/components/dashboard/ImageDateBanner";
import { SummaryCardGrid } from "@/components/dashboard/SummaryCardGrid";
import { IndexGallery } from "@/components/dashboard/IndexGallery";
import { AnalysisBanner } from "@/components/dashboard/AnalysisBanner";
import { FarmImageView } from "@/components/visuals/FarmImageView";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <AnalysisBanner />
      <FieldInfoPanel />
      <ImageDateBanner />

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t("dashboard.healthAtGlance", "Field health at a glance")}
            </h2>
            <p className="text-sm text-slate-500">
              {t("dashboard.headlineSignals", "Four headline signals summarised from today's satellite indices.")}
            </p>
          </div>
        </div>
        <SummaryCardGrid />
      </section>

      <section className="flex flex-col gap-3">
        <FarmImageView />
      </section>

      <section className="flex flex-col gap-3">
        <details className="group rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 shadow-soft open:pb-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t("dashboard.showRawDetails", "Show raw index details")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("dashboard.rawDetailsDesc", "The four satellite indices (NDVI, NDRE, LSWI, GCI) behind the bird's-eye view. Useful if you want the raw signal.")}
              </p>

            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 group-open:bg-padi-100 group-open:text-padi-700">
              <span className="group-open:hidden">{t("common.expand", "Expand")}</span>
              <span className="hidden group-open:inline">{t("common.collapse", "Collapse")}</span>
            </span>
          </summary>
          <div className="mt-4">
            <IndexGallery />
          </div>
        </details>
      </section>
    </div>
  );
}
