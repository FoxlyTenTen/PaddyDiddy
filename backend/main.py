"""PadiWatch backend — FastAPI service for Google Earth Engine analysis."""

from __future__ import annotations

import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import gee
import vertex_analyze

load_dotenv()

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


class FarmViewResponse(BaseModel):
    zones: list[ZoneAnalysis]
    overallSummary: str


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
