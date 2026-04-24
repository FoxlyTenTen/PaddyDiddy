export type AgentKey =
  | "visual_analyst"
  | "diagnostic_agronomist"
  | "action_planner";

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

export interface VisualAnalysis {
  summary: string;
  identified_zones: {
    label_id: string;
    row: number;
    col: number;
    problem_type: string;
    raw_indices: Record<string, number | null>;
  }[];
}

export interface DiagnosticEntry {
  label_id: string;
  primary_stress: string;
  confidence: "High" | "Medium" | "Low";
  diagnostic_reasoning: string;
}

export interface DiagnosisResult {
  diagnoses: DiagnosticEntry[];
}

export interface ActionChecklistEntry {
  zone_label: string;
  action: string;
  urgency: "Today" | "This week" | "Monitor";
  why: string;
}

export interface ActionPlan {
  farmer_summary: string;
  action_checklist: ActionChecklistEntry[];
  monitoring_plan: string;
  judge_summary: string;
}

export interface OptimizationResult {
  visual_analysis?: VisualAnalysis | null;
  diagnoses?: DiagnosisResult | null;
  action_plan?: ActionPlan | null;
  generated_image?: string | null; // Base64 image
  health_score?: number;
  session_id?: string;
  area_ha?: number;
  field_center?: { lat: number; lon: number };
}

export type OptimizationEvent =
  | { type: "run_started"; session_id: string; agents: AgentKey[]; ts: number }
  | { type: "scene_ready"; area_ha: number; image_date: string; field_center: { lat: number; lon: number }; ts: number }
  | { type: "agent_started"; agent: AgentKey; ts: number }
  | { type: "tool_called"; agent: AgentKey; tool: string; args: Record<string, unknown>; ts: number }
  | { type: "tool_result"; agent: AgentKey; tool: string; preview: string; ts: number }
  | { type: "agent_output"; agent: AgentKey; text: string; ts: number }
  | { type: "agent_finished"; agent: AgentKey; ts: number }
  | { type: "final"; result: OptimizationResult; ts: number }
  | { type: "run_failed"; stage: string; error: string; ts: number };

export type OptimizationStatus = "idle" | "preparing" | "running" | "done" | "error";

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

// Global App Types
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

