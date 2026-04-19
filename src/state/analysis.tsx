import * as React from "react";
import type { AnalyzeResponse, PolygonGeometry } from "@/services/gee";
import type { FarmView } from "@/types";
import { fetchFarmView } from "@/services/farmView";

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
  farmView: FarmView | null;
  farmViewLoading: boolean;
  farmViewError: string | null;
  loadFarmView: (geometry: PolygonGeometry) => Promise<void>;
}

const AnalysisContext = React.createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "padiwatch.analysis.current";
const FARM_VIEW_KEY = "padiwatch.analysis.farmView";

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

function loadFarmViewInitial(): FarmView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FARM_VIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FarmView;
  } catch {
    return null;
  }
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrentState] = React.useState<AnalysisRecord | null>(
    () => loadInitial()
  );
  const [farmView, setFarmViewState] = React.useState<FarmView | null>(
    () => loadFarmViewInitial()
  );
  const [farmViewLoading, setFarmViewLoading] = React.useState(false);
  const [farmViewError, setFarmViewError] = React.useState<string | null>(null);

  const setFarmView = React.useCallback((fv: FarmView | null) => {
    setFarmViewState(fv);
    if (fv) {
      window.localStorage.setItem(FARM_VIEW_KEY, JSON.stringify(fv));
    } else {
      window.localStorage.removeItem(FARM_VIEW_KEY);
    }
  }, []);

  const setCurrent = React.useCallback(
    (rec: AnalysisRecord | null) => {
      setCurrentState(rec);
      if (rec) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      // Any new analysis invalidates the previous farm view.
      setFarmView(null);
      setFarmViewError(null);
    },
    [setFarmView]
  );

  const clear = React.useCallback(() => {
    setCurrent(null);
    setFarmView(null);
    setFarmViewError(null);
  }, [setCurrent, setFarmView]);

  const loadFarmView = React.useCallback(
    async (geometry: PolygonGeometry) => {
      setFarmViewLoading(true);
      setFarmViewError(null);
      try {
        const fv = await fetchFarmView(geometry);
        setFarmView(fv);
      } catch (err) {
        setFarmViewError(
          err instanceof Error ? err.message : "Farm view request failed"
        );
        setFarmView(null);
      } finally {
        setFarmViewLoading(false);
      }
    },
    [setFarmView]
  );

  const value = React.useMemo(
    () => ({
      current,
      setCurrent,
      clear,
      farmView,
      farmViewLoading,
      farmViewError,
      loadFarmView,
    }),
    [
      current,
      setCurrent,
      clear,
      farmView,
      farmViewLoading,
      farmViewError,
      loadFarmView,
    ]
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
