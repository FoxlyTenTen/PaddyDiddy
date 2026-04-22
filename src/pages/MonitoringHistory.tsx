import { Link } from "react-router-dom";
import { Calendar, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalysis } from "@/state/analysis";
import { SessionRow } from "@/components/history/SessionRow";

export default function MonitoringHistory() {
  const { history, current, setCurrent, clearHistory, removeFromHistory } =
    useAnalysis();

  const dates = history.map((h) => h.result.imageDate).filter(Boolean).sort();
  const rangeLabel =
    dates.length === 0
      ? "—"
      : dates[0] === dates[dates.length - 1]
      ? dates[0]
      : `${dates[0]} → ${dates[dates.length - 1]}`;
  const abnormalCount = history.filter((h) =>
    h.result.indices.some((i) => i.status === "Needs Attention")
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Monitoring History
          </h1>
          <p className="text-sm text-slate-500">
            Past satellite analyses you've run on your paddy field.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Calendar className="mr-1 h-3.5 w-3.5" /> {rangeLabel}
          </Button>
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Clear all monitoring history?")) clearHistory();
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear history
            </Button>
          )}
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <Badge variant="padi">
            {history.length} session{history.length === 1 ? "" : "s"}
          </Badge>
          {dates.length > 0 && (
            <Badge variant="outline">Since {dates[0]}</Badge>
          )}
          {abnormalCount > 0 && (
            <Badge variant="attention">
              {abnormalCount} flagged abnormal
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Moderate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Needs Attention
          </span>
        </div>
      </Card>

      {history.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-slate-600">
            No monitoring sessions yet. Draw a field and run an analysis to
            start building your history.
          </p>
          <Link to="/map">
            <Button size="sm">Go to map</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((rec) => (
            <SessionRow
              key={rec.id}
              record={rec}
              isCurrent={current?.id === rec.id}
              onOpen={() => setCurrent(rec)}
              onRemove={() => removeFromHistory(rec.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
