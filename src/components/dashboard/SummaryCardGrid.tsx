import { summaryCards } from "@/data/mockData";
import { SummaryCard } from "./SummaryCard";

export function SummaryCardGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summaryCards.map((c) => (
        <SummaryCard key={c.title} {...c} />
      ))}
    </div>
  );
}
