import { CalendarDays, CheckCircle2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IndexStatus } from "@/types";
import type { AnalysisRecord } from "@/state/analysis";
import { cn } from "@/lib/utils";

function formatLongDate(iso: string) {
  const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const DOT: Record<IndexStatus, string> = {
  Healthy: "bg-emerald-500",
  Moderate: "bg-amber-500",
  "Needs Attention": "bg-rose-500",
};

const TILE: Record<IndexStatus, string> = {
  Healthy: "ring-emerald-200 bg-emerald-50 text-emerald-800",
  Moderate: "ring-amber-200 bg-amber-50 text-amber-800",
  "Needs Attention": "ring-rose-200 bg-rose-50 text-rose-800",
};

interface Props {
  record: AnalysisRecord;
  isCurrent?: boolean;
  onOpen?: () => void;
  onRemove?: () => void;
}

export function SessionRow({ record, isCurrent, onOpen, onRemove }: Props) {
  const { result, createdAt, label, optimizationResult } = record;
  const abnormal = result.indices.some((i) => i.status === "Needs Attention");
  const createdLabel = new Date(createdAt).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasPlan = !!optimizationResult?.action_plan;
  const imageB64 = optimizationResult?.generated_image;

  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift lg:flex-row lg:items-center",
        abnormal && "ring-rose-200/70",
        isCurrent && "ring-2 ring-padi-400"
      )}
    >
      {/* Date & Core Stats */}
      <div className="flex gap-4 min-w-[280px] lg:w-80">
        {imageB64 && (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-200">
            <img 
              src={`data:image/png;base64,${imageB64}`} 
              alt="Plan preview" 
              className="h-full w-full object-cover opacity-80"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarDays className="h-3 w-3" /> Image {result.imageDate}
          </div>
          <div className="mt-0.5 text-lg font-bold text-slate-900">
            {formatLongDate(result.imageDate)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isCurrent && (
              <Badge variant="padi" className="py-0 h-5 px-1.5 text-[10px]">Active</Badge>
            )}
            {hasPlan && (
              <Badge variant="healthy" className="py-0 h-5 px-1.5 text-[10px] gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Plan Generated
              </Badge>
            )}
            {abnormal && (
              <Badge variant="attention" className="py-0 h-5 px-1.5 text-[10px]">Issue</Badge>
            )}
          </div>
          <p className="mt-2 text-[10px] font-medium text-slate-400">
            {label ? `${label} · ` : ""}Analyzed {createdLabel}
          </p>
        </div>
      </div>

      {/* Index Values */}
      <div className="flex flex-1 flex-wrap items-stretch gap-2">
        {result.indices.map((idx) => (
          <div
            key={idx.key}
            className={cn(
              "flex min-w-[90px] flex-1 flex-col gap-1 rounded-xl p-3 ring-1",
              TILE[idx.status]
            )}
          >
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-tighter opacity-70">
              <span>{idx.name}</span>
              <span
                className={cn("h-1.5 w-1.5 rounded-full", DOT[idx.status])}
              />
            </div>
            <div className="text-base font-bold tabular-nums">
              {idx.mean === null ? "n/a" : idx.mean.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button 
          variant={isCurrent ? "outline" : "default"} 
          size="sm" 
          onClick={onOpen}
          disabled={isCurrent}
          className={cn("font-bold", !isCurrent && "bg-padi-600 text-white hover:bg-padi-700")}
        >
          {isCurrent ? "Viewing" : "Open Analysis"}
        </Button>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove from history"
            onClick={onRemove}
            className="text-slate-300 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
