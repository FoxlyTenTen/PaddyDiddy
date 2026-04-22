import { useAnalysis } from "@/state/analysis";
import { SummaryCard } from "./SummaryCard";
import type { IndexKey } from "@/types";

export function SummaryCardGrid() {
  const { current, history } = useAnalysis();

  // If no current analysis, show empty/placeholder
  if (!current) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Overall Health" value="—" sub="No current analysis" indexKey="ndvi" status="Moderate" trend="—" />
        <SummaryCard title="Early Stress" value="—" sub="No current analysis" indexKey="ndre" status="Moderate" trend="—" />
        <SummaryCard title="Moisture" value="—" sub="No current analysis" indexKey="lswi" status="Moderate" trend="—" />
        <SummaryCard title="Chlorophyll" value="—" sub="No current analysis" indexKey="gci" status="Moderate" trend="—" />
      </div>
    );
  }

  // Find previous analysis for trend calculation
  // (Filter for same geometry or just the next one in history)
  const previous = history.length > 1 ? history[1] : null;

  const renderCard = (key: IndexKey, displayTitle: string) => {
    const idx = current.result.indices.find(i => i.key === key);
    const prevIdx = previous?.result.indices.find(i => i.key === key);
    
    if (!idx) return null;

    let trend: string | undefined = undefined;
    if (prevIdx && idx.mean !== null && prevIdx.mean !== null) {
      const diff = idx.mean - prevIdx.mean;
      const pct = Math.abs((diff / (prevIdx.mean || 1)) * 100).toFixed(0);
      const symbol = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
      const dir = diff > 0 ? "increased" : "decreased";
      trend = `${symbol} ${pct}% ${dir} vs last run`;
    } else {
      trend = "▬ baseline established";
    }

    return (
      <SummaryCard
        key={key}
        title={displayTitle}
        value={idx.status}
        trend={trend}
        status={idx.status}
        sub={`${idx.mean?.toFixed(2)} ${key.toUpperCase()} avg`}
        indexKey={key}
      />
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renderCard("ndvi", "Overall Health")}
      {renderCard("ndre", "Early Stress")}
      {renderCard("lswi", "Moisture (LSWI)")}
      {renderCard("gci", "Chlorophyll (GCI)")}
    </div>
  );
}
