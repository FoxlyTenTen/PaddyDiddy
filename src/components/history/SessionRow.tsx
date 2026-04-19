import { CalendarDays, ChevronRight, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MonitoringSession } from "@/types";
import { SessionThumbnails } from "./SessionThumbnails";
import { cn } from "@/lib/utils";

function formatLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SessionRow({ session }: { session: MonitoringSession }) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift lg:flex-row lg:items-center",
        session.abnormal && "ring-rose-200/70"
      )}
    >
      <div className="min-w-[200px] lg:w-56">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" /> Monitoring session
        </div>
        <div className="mt-1 text-lg font-semibold text-slate-900">
          {formatLongDate(session.date)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="padi">Sentinel-2</Badge>
          <Badge variant="outline">Sentinel-1</Badge>
          {session.abnormal && (
            <Badge variant="attention" className="gap-1">
              <TriangleAlert className="h-3 w-3" /> Abnormal Zone
            </Badge>
          )}
        </div>
        {session.note && (
          <p className="mt-2 text-xs text-slate-500">{session.note}</p>
        )}
      </div>

      <div className="flex-1 overflow-x-auto scrollbar-none">
        <SessionThumbnails session={session} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm">
          Compare
        </Button>
        <Button variant="ghost" size="icon" aria-label="Open session">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
