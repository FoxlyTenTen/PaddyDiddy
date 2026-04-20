import * as React from "react";
import type { AnalyzeResponse, PolygonGeometry } from "@/services/gee";
import type {
  AgentCardState,
  AgentKey,
  FarmImage,
  FarmView,
  OptimizationState,
} from "@/types";
import { fetchFarmView } from "@/services/farmView";
import { fetchFarmImage } from "@/services/farmImage";
import { streamOptimization } from "@/services/optimize";

const AGENT_ORDER: AgentKey[] = [
  "diagnosis",
  "water_optimizer",
  "nutrient_optimizer",
  "roi",
];

function makeIdleAgents(): Record<AgentKey, AgentCardState> {
  return AGENT_ORDER.reduce(
    (acc, key) => {
      acc[key] = { key, status: "idle", tools: [] };
      return acc;
    },
    {} as Record<AgentKey, AgentCardState>
  );
}

function makeIdleOptimization(): OptimizationState {
  return { status: "idle", agents: makeIdleAgents() };
}

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
  farmImage: FarmImage | null;
  farmImageLoading: boolean;
  farmImageError: string | null;
  loadFarmImage: (geometry: PolygonGeometry) => Promise<void>;
  optimization: OptimizationState;
  runOptimization: (geometry: PolygonGeometry) => Promise<void>;
  resetOptimization: () => void;
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

  // The Nano Banana image is large (~hundreds of KB) so we keep it in
  // memory only. A page reload requires re-clicking "Generate".
  const [farmImage, setFarmImage] = React.useState<FarmImage | null>(null);
  const [farmImageLoading, setFarmImageLoading] = React.useState(false);
  const [farmImageError, setFarmImageError] = React.useState<string | null>(null);

  // Optimization state is kept in memory only — the SSE stream is re-run
  // whenever the user clicks Generate.
  const [optimization, setOptimization] = React.useState<OptimizationState>(
    () => makeIdleOptimization()
  );

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
      // Any new analysis invalidates the previous farm view + image.
      setFarmView(null);
      setFarmViewError(null);
      setFarmImage(null);
      setFarmImageError(null);
      setOptimization(makeIdleOptimization());
    },
    [setFarmView]
  );

  const clear = React.useCallback(() => {
    setCurrent(null);
    setFarmView(null);
    setFarmViewError(null);
    setFarmImage(null);
    setFarmImageError(null);
    setOptimization(makeIdleOptimization());
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

  const loadFarmImage = React.useCallback(
    async (geometry: PolygonGeometry) => {
      setFarmImageLoading(true);
      setFarmImageError(null);
      try {
        const fi = await fetchFarmImage(geometry);
        setFarmImage(fi);
        // The image endpoint also returns zone data — populate farmView
        // so the labelled mini-map and other consumers get the latest.
        setFarmView({ zones: fi.zones, overallSummary: fi.overallSummary });
      } catch (err) {
        setFarmImageError(
          err instanceof Error ? err.message : "Farm image request failed"
        );
        setFarmImage(null);
      } finally {
        setFarmImageLoading(false);
      }
    },
    [setFarmView]
  );

  const resetOptimization = React.useCallback(() => {
    setOptimization(makeIdleOptimization());
  }, []);

  const runOptimization = React.useCallback(
    async (geometry: PolygonGeometry) => {
      const startedAt = Date.now();
      setOptimization({
        status: "preparing",
        agents: makeIdleAgents(),
        startedAt,
      });

      try {
        await streamOptimization(geometry, {}, (event) => {
          setOptimization((prev) => {
            const agents = { ...prev.agents };
            const next: OptimizationState = { ...prev, agents };
            switch (event.type) {
              case "run_started":
                next.status = "preparing";
                next.sessionId = event.session_id;
                break;
              case "scene_ready":
                next.status = "running";
                next.areaHa = event.area_ha;
                next.imageDate = event.image_date;
                next.fieldCenter = event.field_center;
                break;
              case "agent_started": {
                const prior = agents[event.agent];
                if (prior) {
                  agents[event.agent] = {
                    ...prior,
                    status: "running",
                    startedAt: event.ts,
                  };
                }
                break;
              }
              case "tool_called": {
                const prior = agents[event.agent];
                if (prior) {
                  agents[event.agent] = {
                    ...prior,
                    tools: [
                      ...prior.tools,
                      { tool: event.tool, args: event.args, ts: event.ts },
                    ],
                  };
                }
                break;
              }
              case "tool_result": {
                const prior = agents[event.agent];
                if (prior) {
                  const tools = prior.tools.slice();
                  for (let i = tools.length - 1; i >= 0; i--) {
                    if (tools[i].tool === event.tool && !tools[i].preview) {
                      tools[i] = { ...tools[i], preview: event.preview };
                      break;
                    }
                  }
                  agents[event.agent] = { ...prior, tools };
                }
                break;
              }
              case "agent_output": {
                const prior = agents[event.agent];
                if (prior) {
                  agents[event.agent] = {
                    ...prior,
                    output: event.text,
                  };
                }
                break;
              }
              case "agent_finished": {
                const prior = agents[event.agent];
                if (prior) {
                  agents[event.agent] = {
                    ...prior,
                    status: "done",
                    finishedAt: event.ts,
                  };
                }
                break;
              }
              case "final":
                next.status = "done";
                next.finalResult = event.result;
                break;
              case "run_failed":
                next.status = "error";
                next.error = `${event.stage}: ${event.error}`;
                break;
            }
            return next;
          });
        });
      } catch (err) {
        setOptimization((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Optimization failed",
        }));
      }
    },
    []
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
      farmImage,
      farmImageLoading,
      farmImageError,
      loadFarmImage,
      optimization,
      runOptimization,
      resetOptimization,
    }),
    [
      current,
      setCurrent,
      clear,
      farmView,
      farmViewLoading,
      farmViewError,
      loadFarmView,
      farmImage,
      farmImageLoading,
      farmImageError,
      loadFarmImage,
      optimization,
      runOptimization,
      resetOptimization,
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
