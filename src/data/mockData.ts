import type {
  FieldInfo,
  ImageDates,
  IndexInfo,
  IndexKey,
  MonitoringSession,
} from "@/types";

export const field: FieldInfo = {
  name: "Sawah Padi Tok Lan",
  location: "Sekinchan, Selangor",
  sizeHa: 12.4,
  boundaryStatus: "Defined",
  latestMonitoring: "2026-04-18",
  crop: "Paddy (MR297)",
  plantingDate: "2026-02-08",
  stage: "Tillering → Panicle Initiation",
};

export const imageDates: ImageDates = {
  sentinel2: "2026-04-12",
  sentinel1: "2026-04-18",
};

export const indices: IndexInfo[] = [
  {
    key: "ndvi",
    name: "NDVI",
    fullName: "Normalized Difference Vegetation Index",
    shortExplanation: "Overall crop greenness",
    longExplanation:
      "NDVI measures how green and leafy your paddy field is. A higher value means the plants are growing well and photosynthesising actively.",
    whyItMatters:
      "NDVI gives you a quick, reliable snapshot of overall crop vigor. Dips can reveal patches that are not growing as strongly as the rest of the field.",
    status: "Healthy",
    date: "2026-04-12",
    seed: 11,
    metric: "0.72 avg",
  },
  {
    key: "ndre",
    name: "NDRE",
    fullName: "Normalized Difference Red Edge",
    shortExplanation: "Early stress indicator",
    longExplanation:
      "NDRE is sensitive to subtle changes in the leaves before you can see damage with your eyes. It is great for catching stress early.",
    whyItMatters:
      "If paddy plants start struggling from disease, nutrient shortage, or water imbalance, NDRE usually shows it before NDVI does.",
    status: "Moderate",
    date: "2026-04-12",
    seed: 27,
    metric: "0.41 avg",
  },
  {
    key: "ndwi",
    name: "NDWI",
    fullName: "Normalized Difference Water Index",
    shortExplanation: "Moisture condition",
    longExplanation:
      "NDWI shows how much moisture is in the paddy canopy and surface. In a flooded rice system this helps confirm even water coverage.",
    whyItMatters:
      "Uneven moisture can mean drainage issues, leaks, or irrigation problems. Spotting dry patches early prevents yield loss.",
    status: "Healthy",
    date: "2026-04-12",
    seed: 42,
    metric: "0.33 avg",
  },
  {
    key: "gci",
    name: "GCI",
    fullName: "Green Chlorophyll Index",
    shortExplanation: "Chlorophyll condition",
    longExplanation:
      "GCI estimates the chlorophyll content of the crop canopy — basically how well nourished and productive the leaves are.",
    whyItMatters:
      "Low GCI zones often reflect nitrogen deficiency. Addressing them early can improve panicle formation and final yield.",
    status: "Needs Attention",
    date: "2026-04-12",
    seed: 73,
    metric: "3.8 avg",
  },
];

export const getIndex = (key: IndexKey): IndexInfo | undefined =>
  indices.find((i) => i.key === key);

export const sessions: MonitoringSession[] = [
  {
    id: "s-2026-04-12",
    date: "2026-04-12",
    note: "Latest monitoring — minor stress in NE corner.",
    abnormal: true,
    perIndex: {
      ndvi: { status: "Healthy", seed: 11 },
      ndre: { status: "Moderate", seed: 27 },
      ndwi: { status: "Healthy", seed: 42 },
      gci: { status: "Needs Attention", seed: 73 },
    },
  },
  {
    id: "s-2026-04-02",
    date: "2026-04-02",
    note: "Canopy closure progressing evenly.",
    perIndex: {
      ndvi: { status: "Healthy", seed: 108 },
      ndre: { status: "Healthy", seed: 114 },
      ndwi: { status: "Healthy", seed: 121 },
      gci: { status: "Moderate", seed: 133 },
    },
  },
  {
    id: "s-2026-03-23",
    date: "2026-03-23",
    note: "Post-fertilization uplift visible.",
    perIndex: {
      ndvi: { status: "Moderate", seed: 155 },
      ndre: { status: "Moderate", seed: 164 },
      ndwi: { status: "Healthy", seed: 172 },
      gci: { status: "Moderate", seed: 181 },
    },
  },
  {
    id: "s-2026-03-13",
    date: "2026-03-13",
    note: "Tillering stage — good uniformity.",
    perIndex: {
      ndvi: { status: "Moderate", seed: 203 },
      ndre: { status: "Healthy", seed: 217 },
      ndwi: { status: "Healthy", seed: 228 },
      gci: { status: "Healthy", seed: 234 },
    },
  },
  {
    id: "s-2026-03-03",
    date: "2026-03-03",
    note: "Early vegetative — canopy sparse.",
    perIndex: {
      ndvi: { status: "Needs Attention", seed: 249 },
      ndre: { status: "Moderate", seed: 261 },
      ndwi: { status: "Healthy", seed: 272 },
      gci: { status: "Needs Attention", seed: 284 },
    },
  },
  {
    id: "s-2026-02-21",
    date: "2026-02-21",
    note: "Post-transplanting baseline.",
    perIndex: {
      ndvi: { status: "Needs Attention", seed: 303 },
      ndre: { status: "Needs Attention", seed: 311 },
      ndwi: { status: "Moderate", seed: 322 },
      gci: { status: "Needs Attention", seed: 334 },
    },
  },
];

export const summaryCards = [
  {
    title: "Overall Health",
    value: "Healthy",
    trend: "▲ improved vs last week",
    status: "Healthy" as const,
    sub: "Driven by NDVI + GCI",
    indexKey: "ndvi" as IndexKey,
  },
  {
    title: "Early Stress",
    value: "Watch",
    trend: "▲ 3% stress signal",
    status: "Moderate" as const,
    sub: "NDRE picking up early cues",
    indexKey: "ndre" as IndexKey,
  },
  {
    title: "Moisture",
    value: "Even",
    trend: "▬ stable",
    status: "Healthy" as const,
    sub: "Water coverage uniform",
    indexKey: "ndwi" as IndexKey,
  },
  {
    title: "Chlorophyll",
    value: "Low zones",
    trend: "▼ attention needed",
    status: "Needs Attention" as const,
    sub: "North-east corner weak",
    indexKey: "gci" as IndexKey,
  },
];
