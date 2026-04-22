"""Tools and helpers shared by the resource-optimization agents."""

from __future__ import annotations

import os
from typing import Any
import base64
import requests

import gee
import vertex_image
from google.adk.tools import ToolContext


WEATHER_URL = "https://weather.googleapis.com/v1/forecast/days:lookup"


# Module-level registry for non-serializable objects (GEE Scene) that can't
# safely live in ADK session state. Keyed by session_id; cleaned up by the
# stream handler on completion.
_SCENE_REGISTRY: dict[str, Any] = {}


def register_scene(session_id: str, scene: Any) -> None:
    _SCENE_REGISTRY[session_id] = scene


def get_scene(session_id: str) -> Any:
    return _SCENE_REGISTRY.get(session_id)


def release_scene(session_id: str) -> None:
    _SCENE_REGISTRY.pop(session_id, None)


def fetch_field_indices(tool_context: ToolContext) -> dict:
    """Fetches the raw 4x4 grid data for NDVI, LSWI, NDRE, and GCI for the field.

    Returns:
        dict: A 4x4 grid of zones, each with its index values.
    """
    session_id = tool_context.state.get("session_id")
    if not session_id:
        return {"status": "error", "message": "No session_id found in state."}
    
    scene = get_scene(session_id)
    if scene is None:
        return {"status": "error", "message": f"No scene registered for session {session_id}."}

    indices = gee.build_indices(scene.composite)
    zones_fc = gee.build_zone_grid(scene.geom, 4, 4)
    
    all_zone_data = {}
    for key in ["ndvi", "lswi", "ndre", "gci"]:
        means = gee.zone_means(indices[key], zones_fc, key)
        for m in means:
            zid = f"{m['row']},{m['col']}"
            if zid not in all_zone_data:
                all_zone_data[zid] = {"zone_id": zid}
            all_zone_data[zid][key] = round(m['mean'], 4) if m['mean'] is not None else None

    return {
        "status": "success",
        "zones": list(all_zone_data.values())
    }


def generate_annotated_image(tool_context: ToolContext, problem_zones: list[dict], overall_summary: str) -> dict:
    """Generates an annotated bird's-eye view image of the farm with labels on problem zones.
    
    Args:
        problem_zones: List of dicts with 'row', 'col', and 'issue' (short label like 'Zone A: Low Nutrient').
        overall_summary: A short text summary of the field status.
    """
    session_id = tool_context.state.get("session_id")
    scene = get_scene(session_id)
    if not scene:
        return {"status": "error", "message": "No scene found for this session."}
    
    # Format for vertex_image which expects 'health', 'water', and 'issue' keys.
    # We force health to 'poor' so the visualizer definitely annotates them.
    formatted_zones = []
    for z in problem_zones:
        formatted_zones.append({
            "row": z.get("row", 0),
            "col": z.get("col", 0),
            "health": "poor", 
            "water": "ok",
            "issue": z.get("issue", "Attention Required")
        })
    
    try:
        png_bytes = vertex_image.generate_farm_image(scene, formatted_zones, overall_summary)
        b64 = base64.b64encode(png_bytes).decode("ascii")
        # Save directly to session state so it can be extracted at the end of the run.
        tool_context.state["generated_farm_image"] = b64
        return {"status": "success", "message": "Annotated image successfully generated and saved to session state."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def fetch_weather_forecast(lat: float, lon: float) -> dict:
    """Returns a 7-day daily rain + temperature forecast for the given coords."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {"status": "error", "source": "fallback", "error": "GOOGLE_MAPS_API_KEY not set", "days": []}

    try:
        resp = requests.get(WEATHER_URL, params={"key": key, "location.latitude": lat, "location.longitude": lon, "days": 7, "unitsSystem": "METRIC"}, timeout=20)
        if not resp.ok:
            return {"status": "error", "source": "fallback", "error": f"HTTP {resp.status_code}", "days": []}
        payload = resp.json()
    except Exception as exc:
        return {"status": "error", "source": "fallback", "error": str(exc), "days": []}

    days: list[dict[str, Any]] = []
    for d in payload.get("forecastDays", []):
        date_obj = d.get("displayDate") or {}
        date_str = f"{date_obj.get('year','?')}-{int(date_obj.get('month',0)):02d}-{int(date_obj.get('day',0)):02d}"
        precip = d.get("daytimeForecast", {}).get("precipitation", {}).get("qpf", {}).get("quantity", 0)
        days.append({"date": date_str, "rain_mm": float(precip or 0)})

    return {"status": "success", "source": "google-maps-weather", "days": days}


def polygon_centroid(coordinates: list[list[list[float]]]) -> dict[str, float]:
    """Return {lat, lon} centroid of the outer ring of a GeoJSON polygon."""
    ring = coordinates[0][:-1] if len(coordinates[0]) > 1 else coordinates[0]
    if not ring:
        return {"lat": 0.0, "lon": 0.0}
    lon = sum(p[0] for p in ring) / len(ring)
    lat = sum(p[1] for p in ring) / len(ring)
    return {"lat": round(lat, 6), "lon": round(lon, 6)}
