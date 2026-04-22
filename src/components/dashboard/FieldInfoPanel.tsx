import { MapPin, Ruler, CalendarDays, Sprout, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { field } from "@/data/mockData";
import { useAnalysis } from "@/state/analysis";
import { GRID } from "@/components/visuals/IsometricTile";

function GenericFieldShape() {
  return (
    <svg viewBox="0 0 120 96" className="h-full w-full">
      <defs>
        <linearGradient id="ff-generic" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="120" height="96" rx="12" fill="#f1f5f9" />
      <polygon
        points="22,20 95,14 108,46 92,80 40,84 14,58"
        fill="url(#ff-generic)"
        stroke="#15803d"
        strokeWidth="1.2"
        strokeDasharray="3 2"
        opacity="0.92"
      />
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={i}
          x1={24 + i * 8}
          y1="18"
          x2={20 + i * 8}
          y2="84"
          stroke="#15803d"
          strokeOpacity="0.18"
          strokeWidth="0.6"
        />
      ))}
      <circle cx="70" cy="48" r="3" fill="#f43f5e" />
      <circle cx="70" cy="48" r="6" fill="#f43f5e" fillOpacity="0.25" />
    </svg>
  );
}

function pointInRingSvg(x: number, y: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const denom = yj - yi || 1e-12;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / denom + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function DrawnFieldShape({ ring }: { ring: number[][] }) {
  const VW = 120;
  const VH = 96;
  const PAD = 10;

  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const cLng = (minLng + maxLng) / 2;
  const cLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos((cLat * Math.PI) / 180);
  const xSpan = (maxLng - minLng) * cosLat || 1e-6;
  const ySpan = maxLat - minLat || 1e-6;
  const scale = Math.min((VW - PAD * 2) / xSpan, (VH - PAD * 2) / ySpan);

  const project = (lng: number, lat: number): [number, number] => [
    VW / 2 + (lng - cLng) * cosLat * scale,
    VH / 2 - (lat - cLat) * scale,
  ];

  const projected: [number, number][] = ring.map(([lng, lat]) =>
    project(lng, lat)
  );
  const polyPoints = projected.map((p) => p.join(",")).join(" ");

  const dLng = (maxLng - minLng) / GRID;
  const dLat = (maxLat - minLat) / GRID;

  const gridLines: JSX.Element[] = [];
  for (let i = 0; i <= GRID; i++) {
    const lng = minLng + (i / GRID) * (maxLng - minLng);
    const lat = minLat + (i / GRID) * (maxLat - minLat);
    const [x1, y1] = project(lng, maxLat);
    const [x2, y2] = project(lng, minLat);
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#166534"
        strokeOpacity={0.4}
        strokeWidth={0.4}
      />
    );
    const [x3, y3] = project(minLng, lat);
    const [x4, y4] = project(maxLng, lat);
    gridLines.push(
      <line
        key={`h-${i}`}
        x1={x3}
        y1={y3}
        x2={x4}
        y2={y4}
        stroke="#166534"
        strokeOpacity={0.4}
        strokeWidth={0.4}
      />
    );
  }

  const labels: JSX.Element[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const lng = minLng + (c + 0.5) * dLng;
      const lat = maxLat - (r + 0.5) * dLat;
      const [cx, cy] = project(lng, lat);
      if (!pointInRingSvg(cx, cy, projected)) continue;
      labels.push(
        <g key={`l-${r}-${c}`}>
          <rect
            x={cx - 5.5}
            y={cy - 3}
            width={11}
            height={6}
            rx={1.6}
            fill="#ffffff"
            fillOpacity={0.92}
            stroke="#15803d"
            strokeOpacity={0.55}
            strokeWidth={0.35}
          />
          <text
            x={cx}
            y={cy + 1.7}
            textAnchor="middle"
            fontSize={4}
            fontWeight={700}
            fill="#0f172a"
            style={{
              fontFamily:
                "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont",
            }}
          >
            {r + 1}·{c + 1}
          </text>
        </g>
      );
    }
  }

  const clipId = "drawn-field-clip";
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full">
      <defs>
        <linearGradient id="ff-drawn" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <clipPath id={clipId}>
          <polygon points={polyPoints} />
        </clipPath>
      </defs>
      <rect width={VW} height={VH} rx="12" fill="#f1f5f9" />
      <polygon
        points={polyPoints}
        fill="url(#ff-drawn)"
        stroke="#15803d"
        strokeWidth={1.2}
        opacity={0.95}
      />
      <g clipPath={`url(#${clipId})`}>{gridLines}</g>
      {labels}
    </svg>
  );
}

export function FieldInfoPanel() {
  const { current } = useAnalysis();
  const ring =
    (current?.geometry?.coordinates?.[0] as number[][] | undefined) ?? null;
  const hasDrawn = Boolean(ring && ring.length >= 4);

  const stats = [
    { icon: MapPin, label: "Location", value: field.location },
    {
      icon: Ruler,
      label: "Field size",
      value: current?.result?.areaHa
        ? `${current.result.areaHa.toFixed(2)} ha`
        : `${field.sizeHa} hectares`,
    },
    { icon: Sprout, label: "Crop stage", value: field.stage },
    { icon: CalendarDays, label: "Last monitored", value: field.latestMonitoring },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.6fr_1fr]">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Badge variant="padi" className="gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Boundary {hasDrawn ? "Drawn" : field.boundaryStatus}
            </Badge>
            <Badge variant="outline">{field.crop}</Badge>
            <Badge variant="outline">Planted {field.plantingDate}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {field.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoring the health of your paddy field using the latest
            satellite observations. All values shown are snapshots, not live
            sensors.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/70"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-padi-50 to-emerald-50 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_120%_0%,rgba(22,163,74,0.18),transparent_70%)]" />
          <div className="relative flex h-full flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-padi-800/80">
              {hasDrawn ? "Your field — labelled zones" : "Field boundary"}
            </span>
            <div className="mt-2 flex-1">
              {hasDrawn && ring ? (
                <DrawnFieldShape ring={ring} />
              ) : (
                <GenericFieldShape />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              {hasDrawn ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-white ring-1 ring-emerald-700/60" />
                    Each label matches the 3D view
                  </span>
                  <span className="text-slate-400">row · col</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Abnormal zone detected
                  </span>
                  <span className="text-slate-400">1 of 4 zones</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
