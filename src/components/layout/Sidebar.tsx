import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  PenLine,
  MapPinned,
  FileBarChart2,
  LifeBuoy,
  Leaf,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primary = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/map", label: "Draw Field", icon: PenLine },
  { to: "/history", label: "Monitoring History", icon: History },
  { to: "/optimize", label: "Optimize Resources", icon: Sparkles },
];

const soon: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Field Settings", icon: MapPinned },
  { label: "Reports", icon: FileBarChart2 },
  { label: "Preferences", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-padi-600 text-white shadow-sm">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold text-slate-900">
            PadiWatch
          </span>
          <span className="text-[11px] text-slate-500">
            Satellite crop intelligence
          </span>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-3">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Monitor
        </p>
        {primary.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-padi-50 text-padi-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-padi-600 transition-opacity",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-padi-700" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <p className="mt-5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Coming soon
        </p>
        {soon.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              soon
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-gradient-to-br from-padi-600 to-padi-700 p-4 text-white shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-90">
            <LifeBuoy className="h-3.5 w-3.5" /> Support
          </div>
          <p className="mt-1.5 text-sm leading-snug">
            New to satellite monitoring? We guide you index-by-index.
          </p>
          <button className="mt-3 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            Open guide
          </button>
        </div>
      </div>
    </aside>
  );
}
