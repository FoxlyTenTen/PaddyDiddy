"""Tools and helpers shared by the resource-optimization agents."""

from __future__ import annotations

import os
from typing import Any

import requests


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


def fetch_weather_forecast(lat: float, lon: float) -> dict:
    """Returns a 7-day daily rain + temperature forecast for the given coords.

    Args:
        lat: Latitude in decimal degrees (north positive).
        lon: Longitude in decimal degrees (east positive).

    Returns:
        dict with keys:
          status: "success" | "error"
          source: "google-maps-weather" | "fallback"
          days: list of {date, rain_mm, temp_max_c, temp_min_c}
    """
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        return {
            "status": "error",
            "source": "fallback",
            "error": "GOOGLE_MAPS_API_KEY not set",
            "days": [],
        }

    try:
        resp = requests.get(
            WEATHER_URL,
            params={
                "key": key,
                "location.latitude": lat,
                "location.longitude": lon,
                "days": 7,
                "unitsSystem": "METRIC",
            },
            timeout=20,
        )
    except requests.RequestException as exc:
        return {
            "status": "error",
            "source": "fallback",
            "error": f"{exc.__class__.__name__}: {exc}",
            "days": [],
        }

    if not resp.ok:
        # Surface the real Google API error (e.g. 403 "API not enabled",
        # 400 "API key not valid") so we can see it in the agent card.
        detail = ""
        try:
            body = resp.json()
            detail = (
                body.get("error", {}).get("message")
                or body.get("error_description")
                or str(body)
            )
        except ValueError:
            detail = resp.text[:300]
        return {
            "status": "error",
            "source": "fallback",
            "error": f"HTTP {resp.status_code}: {detail}",
            "days": [],
        }

    try:
        payload = resp.json()
    except ValueError as exc:
        return {
            "status": "error",
            "source": "fallback",
            "error": f"Invalid JSON from weather API: {exc}",
            "days": [],
        }

    days: list[dict[str, Any]] = []
    for d in payload.get("forecastDays", []):
        date_obj = d.get("displayDate") or {}
        date_str = (
            f"{date_obj.get('year','?')}-"
            f"{int(date_obj.get('month',0)):02d}-"
            f"{int(date_obj.get('day',0)):02d}"
        )
        daytime = d.get("daytimeForecast", {})
        precip = (
            daytime.get("precipitation", {})
            .get("qpf", {})
            .get("quantity", 0)
        )
        max_t = d.get("maxTemperature", {}).get("degrees")
        min_t = d.get("minTemperature", {}).get("degrees")
        days.append(
            {
                "date": date_str,
                "rain_mm": float(precip or 0),
                "temp_max_c": float(max_t) if max_t is not None else None,
                "temp_min_c": float(min_t) if min_t is not None else None,
            }
        )

    return {
        "status": "success",
        "source": "google-maps-weather",
        "days": days,
    }


def polygon_centroid(coordinates: list[list[list[float]]]) -> dict[str, float]:
    """Return {lat, lon} centroid of the outer ring of a GeoJSON polygon.

    Args:
        coordinates: GeoJSON polygon coordinates ([ring][point][lng, lat]).
    """
    ring = coordinates[0][:-1] if len(coordinates[0]) > 1 else coordinates[0]
    if not ring:
        return {"lat": 0.0, "lon": 0.0}
    lon = sum(p[0] for p in ring) / len(ring)
    lat = sum(p[1] for p in ring) / len(ring)
    return {"lat": round(lat, 6), "lon": round(lon, 6)}
