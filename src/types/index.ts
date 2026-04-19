export type IndexKey = "ndvi" | "ndre" | "ndwi" | "gci";

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
}

export interface FarmView {
  zones: ZoneAnalysis[];
  overallSummary: string;
}
