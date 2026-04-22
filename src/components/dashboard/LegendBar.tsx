import type { IndexKey } from "@/types";
import { cn } from "@/lib/utils";

const GRADIENTS: Record<IndexKey, { bg: string; lo: string; mid: string; hi: string }> = {
  ndvi: {
    bg: "linear-gradient(to right, #7f1d1d, #eab308, #15803d)",
    lo: "Sparse",
    mid: "Moderate",
    hi: "Lush",
  },
  ndre: {
    bg: "linear-gradient(to right, #991b1b, #f97316, #16a34a)",
    lo: "Stressed",
    mid: "Watch",
    hi: "Healthy",
  },
  lswi: {
    bg: "linear-gradient(to right, #78350f, #14b8a6, #1d4ed8)",
    lo: "Dry",
    mid: "Adequate",
    hi: "Saturated",
  },
  gci: {
    bg: "linear-gradient(to right, #ecfccb, #65a30d, #14532d)",
    lo: "Low",
    mid: "OK",
    hi: "High",
  },
};

export function LegendBar({
  indexKey,
  className,
  compact = false,
}: {
  indexKey: IndexKey;
  className?: string;
  compact?: boolean;
}) {
  const g = GRADIENTS[indexKey];
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full ring-1 ring-inset ring-black/5",
          compact ? "h-1.5" : "h-2"
        )}
        style={{ backgroundImage: g.bg }}
      />
      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-500">
        <span>{g.lo}</span>
        <span>{g.mid}</span>
        <span>{g.hi}</span>
      </div>
    </div>
  );
}
