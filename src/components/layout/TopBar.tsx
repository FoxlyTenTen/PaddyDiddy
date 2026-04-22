import { Bell, Calendar, ChevronRight, Search, Languages } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getIndex } from "@/data/mockData";
import { field } from "@/data/mockData";
import type { IndexKey } from "@/types";
import { useTranslation } from "react-i18next";

function useBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const path = location.pathname;
  const crumbs: { label: string; to?: string }[] = [
    { label: t("common.dashboard"), to: "/" },
  ];
  if (path.startsWith("/index/")) {
    const key = params.indexKey as IndexKey | undefined;
    const info = key ? getIndex(key) : undefined;
    crumbs.push({ label: info ? info.name : "Index" });
  } else if (path.startsWith("/history")) {
    crumbs.push({ label: t("common.monitoringHistory") });
  }
  return crumbs;
}

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English" },
    { code: "ms", label: "Bahasa" },
    { code: "zh", label: "中文" },
    { code: "ta", label: "தமிழ்" },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200/70 bg-white/80 px-5 backdrop-blur-md md:px-8">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {c.to ? (
              <Link
                to={c.to}
                className="text-slate-500 hover:text-slate-900"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-900">{c.label}</span>
            )}
            {i < crumbs.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            )}
          </span>
        ))}
      </nav>

      <div className="ml-4 hidden flex-1 lg:flex">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("common.search")}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white/70 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-padi-400 focus:outline-none focus:ring-2 focus:ring-padi-500/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <Languages className="h-4 w-4 text-slate-400 mr-1" />
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-600 focus:outline-none cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 sm:inline-flex">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {t("common.updated")} {field.latestMonitoring}
        </span>

        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-1 py-1 pr-3">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-padi-500 to-padi-700 text-xs font-semibold text-white">
            TL
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-medium text-slate-900">Tok Lan</div>
            <div className="text-[10px] text-slate-500">Farmer · Sekinchan</div>
          </div>
        </div>
      </div>
    </header>
  );
}
