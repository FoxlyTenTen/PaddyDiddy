import * as React from "react";
import type { AnalyzeResponse, PolygonGeometry } from "@/services/gee";

export interface AnalysisRecord {
  id: string;
  createdAt: string;
  geometry: PolygonGeometry;
  result: AnalyzeResponse;
  label?: string;
}

interface Ctx {
  current: AnalysisRecord | null;
  setCurrent: (rec: AnalysisRecord | null) => void;
  clear: () => void;
}

const AnalysisContext = React.createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "padiwatch.analysis.current";

function loadInitial(): AnalysisRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnalysisRecord;
  } catch {
    return null;
  }
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrentState] = React.useState<AnalysisRecord | null>(
    () => loadInitial()
  );

  const setCurrent = React.useCallback((rec: AnalysisRecord | null) => {
    setCurrentState(rec);
    if (rec) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clear = React.useCallback(() => setCurrent(null), [setCurrent]);

  const value = React.useMemo(
    () => ({ current, setCurrent, clear }),
    [current, setCurrent, clear]
  );

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): Ctx {
  const ctx = React.useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
