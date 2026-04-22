import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Info,
  Loader2,
  MapPinned,
  Ruler,
  Satellite,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldDrawMap, type FieldDrawMapHandle } from "@/components/map/FieldDrawMap";
import { LocationSearch } from "@/components/map/LocationSearch";
import {
  analyzeField,
  checkHealth,
  type AnalyzeResponse,
  type PolygonGeometry,
} from "@/services/gee";
import { useAnalysis } from "@/state/analysis";
import { cn } from "@/lib/utils";
import type { IndexKey, IndexStatus } from "@/types";

const STATUS_VARIANT: Record<
  IndexStatus,
  "healthy" | "moderate" | "attention"
> = {
  Healthy: "healthy",
  Moderate: "moderate",
  "Needs Attention": "attention",
};

const INDEX_LABEL: Record<IndexKey, string> = {
  ndvi: "Greenness",
  ndre: "Early stress",
  lswi: "Moisture",
  gci: "Chlorophyll",
};

function ringArea(coords: number[][]) {
  // Rough shoelace area in degrees^2 — not real area, used only to guess
  // whether the polygon is absurdly small before sending it to the server.
  let s = 0;
  for (let i = 0, n = coords.length; i < n - 1; i++) {
    s += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  return Math.abs(s) / 2;
}

export default function MapDraw() {
  const { current, setCurrent } = useAnalysis();
  const navigate = useNavigate();

  const [geometry, setGeometry] = React.useState<PolygonGeometry | null>(
    current?.geometry ?? null
  );
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [backendStatus, setBackendStatus] = React.useState<
    "unknown" | "ready" | "missing-project" | "offline"
  >("unknown");
  const mapRef = React.useRef<FieldDrawMapHandle | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const h = await checkHealth();
      if (cancelled) return;
      if (!h) setBackendStatus("offline");
      else if (h.gee_project_configured !== "yes")
        setBackendStatus("missing-project");
      else setBackendStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canAnalyze =
    geometry !== null &&
    geometry.coordinates[0].length >= 4 &&
    ringArea(geometry.coordinates[0]) > 1e-8 &&
    !loading;

  async function onAnalyze() {
    if (!geometry) return;
    setError(null);
    setLoading(true);
    try {
      const result: AnalyzeResponse = await analyzeField(geometry, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setCurrent({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        geometry,
        result,
        label: "My drawn field",
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function onClearAnalysis() {
    setCurrent(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Draw your field
          </h1>
          <p className="text-sm text-slate-500">
            Trace the boundary of your paddy on the map, then run a live
            Earth Engine analysis for NDVI, NDRE, LSWI and GCI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {backendStatus === "ready" && (
            <Badge variant="healthy" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> GEE backend ready
            </Badge>
          )}
          {backendStatus === "missing-project" && (
            <Badge variant="moderate" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Set GEE_PROJECT_ID
            </Badge>
          )}
          {backendStatus === "offline" && (
            <Badge variant="attention" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Backend offline
            </Badge>
          )}
          {backendStatus === "unknown" && (
            <Badge variant="outline">Checking backend…</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <MapPinned className="h-4 w-4 text-padi-700" />
              Tap the polygon tool on the map, then click points to trace your
              field.
            </div>
            <div className="text-xs text-slate-500">
              {geometry
                ? `${geometry.coordinates[0].length - 1} vertices drawn`
                : "No polygon yet"}
            </div>
          </div>
          <div className="px-5 pb-2">
            <LocationSearch
              onSelect={(r) => mapRef.current?.flyTo(r.lat, r.lon, 16)}
            />
          </div>
          <div className="px-5 pb-5 pt-3">
            <FieldDrawMap
              ref={mapRef}
              onChange={setGeometry}
              initial={current?.geometry ?? null}
              height={520}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Satellite className="h-4 w-4 text-padi-700" />
                Analysis window
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm focus:border-padi-400 focus:outline-none focus:ring-2 focus:ring-padi-500/20"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm focus:border-padi-400 focus:outline-none focus:ring-2 focus:ring-padi-500/20"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Leave empty to use the trailing 45 days.
              </p>

              <Button
                onClick={onAnalyze}
                disabled={!canAnalyze}
                size="lg"
                className="mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Running Earth Engine…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Analyze with Earth Engine
                  </>
                )}
              </Button>

              {!geometry && (
                <p className="text-xs text-slate-500">
                  Draw a polygon first — then the button will enable.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Analysis failed</div>
                    <div className="mt-0.5">{error}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {current && (
            <Card className="bg-padi-50/50 ring-padi-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-padi-700" />
                  Latest analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Meta
                    icon={CalendarDays}
                    label="Image date"
                    value={current.result.imageDate}
                  />
                  <Meta
                    icon={Ruler}
                    label="Field area"
                    value={`${current.result.areaHa} ha`}
                  />
                  <Meta
                    icon={Satellite}
                    label="Scenes used"
                    value={`${current.result.imageCount}`}
                  />
                  <Meta
                    icon={CalendarDays}
                    label="Window"
                    value={`${current.result.window.start} → ${current.result.window.end}`}
                  />
                </div>

                <div className="mt-1 grid grid-cols-2 gap-2">
                  {current.result.indices.map((idx) => (
                    <div
                      key={idx.key}
                      className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70"
                    >
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
                        {idx.name}
                        <Badge
                          variant={STATUS_VARIANT[idx.status as IndexStatus]}
                          className="py-0 text-[10px]"
                        >
                          {idx.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-1">
                        <span className="text-sm font-semibold text-slate-900">
                          {idx.mean !== null ? idx.mean.toFixed(2) : "—"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {INDEX_LABEL[idx.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/">View on dashboard</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/index/ndvi`)}
                  >
                    Open NDVI
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear analysis"
                    onClick={onClearAnalysis}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border border-dashed border-slate-200 bg-white/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <Info className="h-4 w-4 text-padi-700" /> How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm text-slate-600">
              <Step n="1">
                Pick the polygon tool on the map and trace your field.
              </Step>
              <Step n="2">
                Click <span className="font-medium">Analyze</span>. We send
                the polygon to Google Earth Engine.
              </Step>
              <Step n="3">
                GEE pulls the latest Sentinel-2 pass, cloud-masks it, and
                computes NDVI / NDRE / LSWI / GCI inside your field.
              </Step>
              <Step n="4">
                Tile URLs come back and your dashboard updates to show the
                real heatmaps.
              </Step>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={cn("mt-0.5 text-sm font-semibold text-slate-900")}>
        {value}
      </div>
    </div>
  );
}

function Step({
  n,
  children,
}: {
  n: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-padi-600 text-[11px] font-semibold text-white">
        {n}
      </span>
      <span>{children}</span>
    </div>
  );
}
