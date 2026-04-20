"""PadiWatch backend — FastAPI service for Google Earth Engine analysis."""

from __future__ import annotations

import base64
import logging
import os
from typing import Any, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# ADK reads GOOGLE_APPLICATION_CREDENTIALS. Populate it from VERTEX_KEY_FILE
# before anything from google.adk is imported, so the orchestrator picks up
# the same service account the rest of the app already uses.
_vertex_key = os.environ.get("VERTEX_KEY_FILE", "").strip()
if _vertex_key and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _vertex_key
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

import gee  # noqa: E402
import vertex_analyze  # noqa: E402
import vertex_image  # noqa: E402
from optimization_stream import run_optimization_stream  # noqa: E402

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

app = FastAPI(
    title="PadiWatch GEE Service",
    description="Computes satellite vegetation indices for a user-drawn paddy field polygon.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class Geometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]] = Field(
        ...,
        description="GeoJSON Polygon coordinates in [lng, lat] order (outer ring first).",
    )


class AnalyzeRequest(BaseModel):
    geometry: Geometry
    start_date: str | None = Field(
        None, description="YYYY-MM-DD start of search window."
    )
    end_date: str | None = Field(
        None, description="YYYY-MM-DD end of search window."
    )


class IndexResult(BaseModel):
    key: str
    name: str
    tileUrl: str
    palette: list[str]
    min: float
    max: float
    mean: float | None
    status: str


class AnalyzeResponse(BaseModel):
    indices: list[IndexResult]
    imageDate: str
    imageCount: int
    areaHa: float
    window: dict[str, str]
    bounds: dict[str, Any]


class ZoneAnalysis(BaseModel):
    row: int
    col: int
    health: Literal["good", "moderate", "poor"]
    water: Literal["dry", "ok", "flooded"]
    issue: str | None = None
    tip: str
    covered: bool = True


class FarmViewResponse(BaseModel):
    zones: list[ZoneAnalysis]
    overallSummary: str


class FarmImageCaption(BaseModel):
    row: int
    col: int
    text: str
    severity: Literal["info", "warning", "critical"]


class FarmImageResponse(BaseModel):
    imageBase64: str
    mimeType: str
    overallSummary: str
    captions: list[FarmImageCaption]
    zones: list[ZoneAnalysis]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    ok = os.environ.get("GEE_PROJECT_ID", "").strip()
    return {
        "status": "ok",
        "gee_project_configured": "yes" if ok and ok != "YOUR_GEE_PROJECT_ID" else "no",
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    try:
        result = gee.analyze(
            req.geometry.model_dump(),
            req.start_date,
            req.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Earth Engine request failed: {exc.__class__.__name__}: {exc}",
        )
    return AnalyzeResponse(**result)


@app.post("/api/farm-view", response_model=FarmViewResponse)
def farm_view(req: AnalyzeRequest) -> FarmViewResponse:
    try:
        scene = gee.prepare_scene(
            req.geometry.model_dump(), req.start_date, req.end_date
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Earth Engine request failed: {exc.__class__.__name__}: {exc}",
        )

    try:
        payload = vertex_analyze.analyze_zones(scene)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Vertex AI request failed: {exc.__class__.__name__}: {exc}",
        )
    return FarmViewResponse(**payload)


def _captions_from_zones(zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for z in zones:
        health = z.get("health", "good")
        water = z.get("water", "ok")
        if health == "good" and water == "ok":
            continue
        text = (z.get("issue") or z.get("tip") or "Needs attention").strip()
        if len(text) > 80:
            text = text[:77] + "…"
        severity = "critical" if health == "poor" else "warning"
        out.append(
            {
                "row": int(z["row"]),
                "col": int(z["col"]),
                "text": text,
                "severity": severity,
            }
        )
    return out


@app.post("/api/farm-image", response_model=FarmImageResponse)
def farm_image(req: AnalyzeRequest) -> FarmImageResponse:
    try:
        scene = gee.prepare_scene(
            req.geometry.model_dump(), req.start_date, req.end_date
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Earth Engine request failed: {exc.__class__.__name__}: {exc}",
        )

    try:
        zone_payload = vertex_analyze.analyze_zones(scene)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Zone analysis failed: {exc.__class__.__name__}: {exc}",
        )

    zones = zone_payload.get("zones", [])
    summary = zone_payload.get("overallSummary", "")

    try:
        png_bytes = vertex_image.generate_farm_image(scene, zones, summary)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Nano Banana request failed: {exc.__class__.__name__}: {exc}",
        )

    return FarmImageResponse(
        imageBase64=base64.b64encode(png_bytes).decode("ascii"),
        mimeType="image/png",
        overallSummary=summary,
        captions=[FarmImageCaption(**c) for c in _captions_from_zones(zones)],
        zones=[ZoneAnalysis(**z) for z in zones],
    )


class RecommendRequest(AnalyzeRequest):
    index_key: str

@app.post("/api/recommend")
def recommend_index(req: RecommendRequest) -> dict[str, Any]:
    try:
        scene = gee.prepare_scene(
            req.geometry.model_dump(), req.start_date, req.end_date
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Earth Engine request failed: {exc.__class__.__name__}: {exc}",
        )

    import vertex_recommend
    try:
        payload = vertex_recommend.recommend(scene, req.index_key)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail=f"Vertex AI request failed: {exc.__class__.__name__}: {exc}",
        )
    return payload


@app.get("/api/geocode")
def geocode(q: str = Query(..., min_length=2, max_length=120)) -> dict[str, Any]:
    """Proxy for Google Maps Geocoding API — keeps the API key server-side.

    Biased toward Malaysia (region=my) since this is a Malaysian farmer tool.
    """
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_MAPS_API_KEY is not set on the backend.",
        )
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": q, "region": "my", "key": key},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Geocoding API unreachable: {exc.__class__.__name__}: {exc}",
        )
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])

    body = resp.json()
    status = body.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        msg = body.get("error_message", "")
        # Log the real Google error so it's visible in the uvicorn terminal.
        logging.getLogger(__name__).error(
            "Geocoding API rejected query=%r status=%s error_message=%s",
            q, status, msg,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Geocoding API error: {status} — {msg}",
        )

    results = []
    for r in body.get("results", [])[:6]:
        loc = r.get("geometry", {}).get("location") or {}
        results.append(
            {
                "label": r.get("formatted_address", ""),
                "lat": loc.get("lat"),
                "lon": loc.get("lng"),
                "types": r.get("types", []),
            }
        )
    return {"status": status, "results": results}


@app.post("/api/optimize")
async def optimize(req: AnalyzeRequest) -> StreamingResponse:
    """Stream the ADK resource-optimizer agents' live state as SSE."""
    return StreamingResponse(
        run_optimization_stream(
            req.geometry.model_dump(), req.start_date, req.end_date
        ),
        media_type="text/event-stream",
        headers={
            # Disable proxy buffering so each agent event reaches the
            # browser as soon as the Runner yields it.
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
