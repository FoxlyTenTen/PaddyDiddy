import * as React from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { geocode, type GeocodeResult } from "@/services/geocode";
import { cn } from "@/lib/utils";

interface Props {
  onSelect: (result: GeocodeResult) => void;
  className?: string;
  placeholder?: string;
}

export function LocationSearch({
  onSelect,
  className,
  placeholder = "Search a place (e.g. Sekinchan, Selangor)…",
}: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GeocodeResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIdx, setActiveIdx] = React.useState(-1);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  // Debounced search.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rs = await geocode(q, { signal: controller.signal });
        setResults(rs);
        setOpen(true);
        setActiveIdx(rs.length > 0 ? 0 : -1);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query]);

  // Close on outside click.
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (r: GeocodeResult) => {
    onSelect(r);
    setOpen(false);
    setQuery(r.label);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && results[activeIdx]) {
        e.preventDefault();
        choose(results[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-padi-500/30">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute inset-x-0 top-full z-[1000] mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {error && (
            <div className="px-3 py-2 text-xs text-rose-700">{error}</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lon},${i}`}
              type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => choose(r)}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                i === activeIdx
                  ? "bg-padi-50 text-padi-900"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <MapPin
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 flex-none",
                  i === activeIdx ? "text-padi-700" : "text-slate-400"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate">{r.label}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                  {r.lat.toFixed(4)}, {r.lon.toFixed(4)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
