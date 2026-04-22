import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Satellite,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AgentCardState, AgentKey } from "@/types";
import { cn } from "@/lib/utils";

interface AgentMeta {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  accent: string;
}

const AGENT_META: Record<AgentKey, AgentMeta> = {
  visual_analyst: {
    title: "Visual Analyst",
    subtitle: "Nano Banana image engine",
    Icon: Satellite,
    accent: "text-blue-600",
  },
  diagnostic_agronomist: {
    title: "Diagnostic Agronomist",
    subtitle: "Identifies root causes",
    Icon: Sparkles,
    accent: "text-emerald-600",
  },
  action_planner: {
    title: "Action Planner",
    subtitle: "Creates checklists",
    Icon: Wrench,
    accent: "text-padi-700",
  },
};

const STATUS_PILL: Record<
  AgentCardState["status"],
  { label: string; cls: string; Icon: LucideIcon }
> = {
  idle: {
    label: "Waiting",
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
    Icon: Circle,
  },
  running: {
    label: "Running",
    cls: "bg-sky-50 text-sky-700 ring-sky-200",
    Icon: Loader2,
  },
  done: {
    label: "Done",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Icon: CheckCircle2,
  },
  error: {
    label: "Error",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    Icon: AlertCircle,
  },
};

export function AgentCard({ state }: { state: AgentCardState }) {
  const meta = AGENT_META[state.key];
  const pill = STATUS_PILL[state.status];
  const { Icon } = meta;
  const { Icon: PillIcon } = pill;

  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4 ring-1 shadow-soft transition-colors",
        state.status === "running"
          ? "ring-sky-200"
          : state.status === "done"
          ? "ring-emerald-200"
          : state.status === "error"
          ? "ring-rose-200"
          : "ring-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200",
              meta.accent
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{meta.title}</p>
            <p className="text-xs text-slate-500">{meta.subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
            pill.cls
          )}
        >
          <PillIcon
            className={cn(
              "h-3 w-3",
              state.status === "running" && "animate-spin"
            )}
          />
          {pill.label}
        </span>
      </div>

      {state.tools.length > 0 && (
        <ul className="mt-3 space-y-1">
          {state.tools.map((t, i) => (
            <li
              key={`${t.tool}-${i}`}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] ring-1 ring-slate-200"
            >
              <Wrench className="mt-0.5 h-3 w-3 flex-none text-slate-500" />
              <div className="min-w-0 flex-1">
                <span className="font-mono font-semibold text-slate-700">
                  {t.tool}
                </span>
                {t.preview && (
                  <p className="mt-0.5 truncate text-slate-500">{t.preview}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.output && (
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
          {state.output}
        </p>
      )}

      {state.status === "idle" && !state.output && (
        <p className="mt-3 text-xs italic text-slate-400">
          Waiting for handoff…
        </p>
      )}
    </div>
  );
}
