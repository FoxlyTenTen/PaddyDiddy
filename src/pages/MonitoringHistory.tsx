import { Filter, ChevronDown, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sessions } from "@/data/mockData";
import { SessionRow } from "@/components/history/SessionRow";

export default function MonitoringHistory() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Monitoring History
          </h1>
          <p className="text-sm text-slate-500">
            Past satellite observations for your paddy field. Use these to
            track progress over weeks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-1 h-3.5 w-3.5" /> Feb – Apr 2026
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-1 h-3.5 w-3.5" /> All indices
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button size="sm">Compare selected</Button>
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <Badge variant="padi">6 sessions</Badge>
          <Badge variant="outline">Since 2026-02-21</Badge>
          <Badge variant="attention">1 flagged abnormal</Badge>
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

      <div className="flex flex-col gap-4">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </div>
    </div>
  );
}
