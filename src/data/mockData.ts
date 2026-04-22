import type {
  FieldInfo,
  ImageDates,
  IndexInfo,
  IndexKey,
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
    key: "lswi",
    name: "LSWI",
    fullName: "Land Surface Water Index",
    shortExplanation: "Moisture condition",
    longExplanation:
      "LSWI shows how much moisture is in the paddy canopy and surface. In a flooded rice system this helps confirm even water coverage.",
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
    indexKey: "lswi" as IndexKey,
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
