export type IndexKey = "ndvi" | "ndre" | "lswi" | "gci";

export type IndexStatus = "Healthy" | "Moderate" | "Needs Attention";

export interface IndexInfo {
  key: IndexKey;
  name: string;
  fullName: string;
  shortExplanation: string;
  longExplanation: string;
  whyItMatters: string;
  status: IndexStatus;
  date: string;
  seed: number;
  metric: string;
}

export interface FieldInfo {
  name: string;
  location: string;
  sizeHa: number;
  boundaryStatus: "Defined" | "Pending";
  latestMonitoring: string;
  crop: string;
  plantingDate: string;
  stage: string;
}

export interface ImageDates {
  sentinel2: string;
  sentinel1: string;
}

export interface MonitoringSession {
  id: string;
  date: string;
  note?: string;
  abnormal?: boolean;
  perIndex: Record<IndexKey, { status: IndexStatus; seed: number }>;
}

export type ZoneHealth = "good" | "moderate" | "poor";
export type ZoneWater = "dry" | "ok" | "flooded";

export interface ZoneAnalysis {
  row: number;
  col: number;
  health: ZoneHealth;
  water: ZoneWater;
  issue?: string | null;
  tip: string;
  covered?: boolean;
}

export interface FarmView {
  zones: ZoneAnalysis[];
  overallSummary: string;
}

export type FarmCaptionSeverity = "info" | "warning" | "critical";

export interface FarmImageCaption {
  row: number;
  col: number;
  text: string;
  severity: FarmCaptionSeverity;
}

export interface FarmImage {
  imageBase64: string;
  mimeType: string;
  overallSummary: string;
  captions: FarmImageCaption[];
  zones: ZoneAnalysis[];
}

export type AgentKey =
  | "diagnosis"
  | "water_optimizer"
  | "nutrient_optimizer"
  | "roi";

export type AgentStatus = "idle" | "running" | "done" | "error";

export interface AgentToolEvent {
  tool: string;
  args?: Record<string, unknown>;
  preview?: string;
  ts: number;
}

export interface AgentCardState {
  key: AgentKey;
  status: AgentStatus;
  output?: string;
  tools: AgentToolEvent[];
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface ZoneAction {
  row: number;
  col: number;
  action: string;
  saving_rm: number;
}

export interface RoiSummary {
  total_savings_rm: number;
  water_savings_rm: number;
  nutrient_savings_rm: number;
  headline: string;
  actions: ZoneAction[];
}

export interface WaterScheduleEntry {
  day: string;
  zone: string;
  action: string;
  reason?: string;
}

export interface RainForecastDay {
  date: string;
  rain_mm: number;
}

export interface WaterPlan {
  summary: string;
  water_saved_mm?: number;
  schedule?: WaterScheduleEntry[];
  rain_forecast?: RainForecastDay[];
  [key: string]: unknown;
}

export interface NutrientZonePlan {
  row: number;
  col: number;
  urea_kg_per_ha: number;
  npk_kg_per_ha: number;
  reason?: string;
}

export interface NutrientPlan {
  summary: string;
  urea_saved_kg_per_ha?: number;
  npk_saved_kg_per_ha?: number;
  zones?: NutrientZonePlan[];
  [key: string]: unknown;
}

export interface OptimizationResult {
  diagnosis?: FarmView | null;
  water_plan?: WaterPlan | string | null;
  nutrient_plan?: NutrientPlan | string | null;
  roi?: RoiSummary | string | null;
  area_ha?: number;
  field_center?: { lat: number; lon: number };
}

export type OptimizationEvent =
  | {
      type: "run_started";
      session_id: string;
      agents: AgentKey[];
      ts: number;
    }
  | {
      type: "scene_ready";
      area_ha: number;
      image_date: string;
      field_center: { lat: number; lon: number };
      ts: number;
    }
  | { type: "agent_started"; agent: AgentKey; ts: number }
  | {
      type: "tool_called";
      agent: AgentKey;
      tool: string;
      args: Record<string, unknown>;
      ts: number;
    }
  | {
      type: "tool_result";
      agent: AgentKey;
      tool: string;
      preview: string;
      ts: number;
    }
  | { type: "agent_output"; agent: AgentKey; text: string; ts: number }
  | { type: "agent_finished"; agent: AgentKey; ts: number }
  | { type: "final"; result: OptimizationResult; ts: number }
  | {
      type: "run_failed";
      stage: string;
      error: string;
      ts: number;
    };

export type OptimizationStatus =
  | "idle"
  | "preparing"
  | "running"
  | "done"
  | "error";

export interface OptimizationState {
  status: OptimizationStatus;
  agents: Record<AgentKey, AgentCardState>;
  sessionId?: string;
  areaHa?: number;
  imageDate?: string;
  fieldCenter?: { lat: number; lon: number };
  finalResult?: OptimizationResult;
  error?: string;
  startedAt?: number;
}
