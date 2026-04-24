"""Tools and helpers shared by the resource-optimization agents."""

from __future__ import annotations

import os
from typing import Any
import base64
import requests

import gee
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
    
    Optimized: Combined into a single GEE request.
    """
    session_id = tool_context.state.get("session_id")
    if not session_id:
        return {"status": "error", "message": "No session_id found in state."}
    
    scene = get_scene(session_id)
    if scene is None:
        return {"status": "error", "message": f"No scene registered for session {session_id}."}

    # 1. Build all indices
    indices = gee.build_indices(scene.composite)
    
    # 2. Stack all index bands into one image to reduce network round-trips
    import ee
    stacked_image = ee.Image.cat([indices[k] for k in ["ndvi", "lswi", "ndre", "gci"]])
    
    # 3. Build the 4x4 grid
    zones_fc = gee.build_zone_grid(scene.geom, 4, 4)
    
    # 4. Perform a single reduction for all bands at once
    stats = stacked_image.reduceRegions(
        collection=zones_fc,
        reducer=ee.Reducer.mean(),
        scale=10,
    ).getInfo()
    
    all_zone_data = []
    for f in stats.get("features", []):
        props = f.get("properties", {})
        r, c = props.get("row"), props.get("col")
        all_zone_data.append({
            "zone_id": f"{r},{c}",
            "row": r,
            "col": c,
            "ndvi": round(props.get("ndvi"), 4) if props.get("ndvi") is not None else None,
            "lswi": round(props.get("lswi"), 4) if props.get("lswi") is not None else None,
            "ndre": round(props.get("ndre"), 4) if props.get("ndre") is not None else None,
            "gci": round(props.get("gci"), 4) if props.get("gci") is not None else None,
        })

    return {
        "status": "success",
        "zones": all_zone_data
    }


from PIL import Image, ImageDraw, ImageFont
import io

def generate_annotated_image(tool_context: ToolContext, problem_zones: list[dict]) -> dict:
    """Generates a true-color satellite snapshot with 4x4 grid and labels for problem zones.
    
    Args:
        problem_zones: List of dicts with 'row', 'col', and 'label_id' (e.g. 'Zone A').
    """
    session_id = tool_context.state.get("session_id")
    scene = get_scene(session_id)
    if not scene:
        return {"status": "error", "message": "No scene found for this session."}
    
    try:
        # 1. Get raw RGB bytes from GEE
        png_bytes = gee.rgb_thumb_png_bytes(scene.composite, scene.geom, dimensions=1024)
        img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        # 2. Draw 4x4 Grid
        grid_color = (255, 255, 255, 120) # White semi-transparent
        for i in range(1, 4):
            # Vertical lines
            x = (width / 4) * i
            draw.line([(x, 0), (x, height)], fill=grid_color, width=2)
            # Horizontal lines
            y = (height / 4) * i
            draw.line([(0, y), (width, y)], fill=grid_color, width=2)
            
        # 3. Label problem zones
        # Use a built-in font fallback
        for zone in problem_zones:
            r = zone.get("row", 0)
            c = zone.get("col", 0)
            label = zone.get("label_id", "!")
            
            # Calculate center of the cell
            cell_w = width / 4
            cell_h = height / 4
            center_x = (c * cell_w) + (cell_w / 2)
            center_y = (r * cell_h) + (cell_h / 2)
            
            # Draw a circle/marker
            radius = 20
            draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill=(255, 0, 0, 180), outline="white")
            
            # Draw Text Label (Simple)
            draw.text((center_x + 25, center_y - 10), label, fill="white")

        # 4. Convert back to Base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        b64 = base64.b64encode(buffered.getvalue()).decode("ascii")
        
        # Save to state
        tool_context.state["generated_farm_image"] = b64
        return {"status": "success", "message": f"Annotated image generated with {len(problem_zones)} labels."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def fetch_weather_forecast(tool_context: ToolContext, lat: float | None = None, lon: float | None = None) -> dict:
    """Returns a 7-day daily rain + temperature forecast for the given coords."""
    # Fallback to state if arguments are missing
    if lat is None or lon is None:
        center = tool_context.state.get("field_center")
        if center and isinstance(center, dict):
            lat = lat or center.get("lat")
            lon = lon or center.get("lon")
    
    if lat is None or lon is None:
        return {"status": "error", "error": "Missing latitude/longitude arguments and no field_center in state."}

    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {"status": "error", "source": "fallback", "error": "GOOGLE_MAPS_API_KEY not set", "days": []}

    try:
        resp = requests.get(WEATHER_URL, params={"key": key, "location.latitude": lat, "location.longitude": lon, "days": 7, "unitsSystem": "METRIC"}, timeout=20)
        if not resp.ok:
            error_msg = f"HTTP {resp.status_code}"
            try:
                error_msg += f": {resp.text}"
            except:
                pass
            return {"status": "error", "source": "fallback", "error": error_msg, "days": []}
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
