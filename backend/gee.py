"""Google Earth Engine integration for PadiWatch.

Computes NDVI, NDRE, NDWI and GCI on a user-supplied polygon over a recent
Sentinel-2 Surface Reflectance composite, and returns Leaflet-compatible
tile URLs plus per-index mean statistics.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

import ee  # type: ignore
import requests


# ---------------------------------------------------------------------------
# Authentication / initialization
# ---------------------------------------------------------------------------

_initialized = False


def init() -> None:
    """Initialize the Earth Engine client. Safe to call repeatedly."""
    global _initialized
    if _initialized:
        return

    project_id = os.environ.get("GEE_PROJECT_ID", "").strip()
    if not project_id or project_id == "YOUR_GEE_PROJECT_ID":
        raise RuntimeError(
            "GEE_PROJECT_ID is not set. Copy backend/.env.example to "
            "backend/.env and set GEE_PROJECT_ID to your Earth Engine "
            "Cloud project id."
        )

    service_account = os.environ.get("GEE_SERVICE_ACCOUNT", "").strip()
    key_file = os.environ.get("GEE_KEY_FILE", "").strip()

    if service_account and key_file:
        credentials = ee.ServiceAccountCredentials(service_account, key_file)
        ee.Initialize(credentials, project=project_id)
    else:
        # User credentials path. The user must have run
        # `earthengine authenticate` once on this machine.
        ee.Initialize(project=project_id)

    _initialized = True


# ---------------------------------------------------------------------------
# Index definitions
# ---------------------------------------------------------------------------

# Palettes mirror the frontend heatmap color ramps so drawn and computed
# views stay visually consistent.
INDEX_CONFIG: dict[str, dict[str, Any]] = {
    "ndvi": {
        "name": "NDVI",
        "expression": "(B8 - B4) / (B8 + B4)",
        "palette": ["7f1d1d", "eab308", "15803d"],
        "min": -0.1,
        "max": 0.9,
        "healthy_min": 0.6,
        "moderate_min": 0.35,
    },
    "ndre": {
        "name": "NDRE",
        "expression": "(B8 - B5) / (B8 + B5)",
        "palette": ["991b1b", "f97316", "16a34a"],
        "min": 0.0,
        "max": 0.6,
        "healthy_min": 0.35,
        "moderate_min": 0.2,
    },
    "ndwi": {
        # McFeeters NDWI — sensitive to water on the canopy / paddy surface.
        "name": "NDWI",
        "expression": "(B3 - B8) / (B3 + B8)",
        "palette": ["78350f", "14b8a6", "1d4ed8"],
        "min": -0.5,
        "max": 0.5,
        "healthy_min": -0.05,
        "moderate_min": -0.2,
    },
    "gci": {
        "name": "GCI",
        "expression": "(B8 / B3) - 1",
        "palette": ["ecfccb", "65a30d", "14532d"],
        "min": 0.0,
        "max": 6.0,
        "healthy_min": 3.5,
        "moderate_min": 2.0,
    },
}


def _status_from_mean(key: str, mean: float | None) -> str:
    cfg = INDEX_CONFIG[key]
    if mean is None:
        return "Moderate"
    if mean >= cfg["healthy_min"]:
        return "Healthy"
    if mean >= cfg["moderate_min"]:
        return "Moderate"
    return "Needs Attention"


# ---------------------------------------------------------------------------
# Scene selection
# ---------------------------------------------------------------------------


def _mask_s2_clouds(img: "ee.Image") -> "ee.Image":
    """Mask clouds/shadows using the Scene Classification band."""
    scl = img.select("SCL")
    # Keep vegetation (4), bare (5), water (6), unclassified (7), snow (11),
    # dark area pixels (2). Drop: saturated (1), cloud shadow (3),
    # cloud medium/high prob (8,9), thin cirrus (10).
    mask = (
        scl.neq(1)
        .And(scl.neq(3))
        .And(scl.neq(8))
        .And(scl.neq(9))
        .And(scl.neq(10))
    )
    return img.updateMask(mask)


def _pick_collection(
    geom: "ee.Geometry", start: str, end: str
) -> tuple["ee.ImageCollection", int]:
    coll = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geom)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
        .map(_mask_s2_clouds)
    )
    size = coll.size().getInfo()
    return coll, int(size)


# ---------------------------------------------------------------------------
# Shared scene / index builders
# ---------------------------------------------------------------------------


@dataclass
class Scene:
    """Composite + metadata shared by analyze() and the farm-view pipeline."""

    geom: "ee.Geometry"
    composite: "ee.Image"
    count: int
    latest_ts: str
    start_date: str
    end_date: str
    area_ha: float
    bounds: dict


def prepare_scene(
    geometry_geojson: dict, start_date: str | None, end_date: str | None
) -> Scene:
    """Resolve a cloud-masked median composite over the polygon + window."""
    init()

    geom = ee.Geometry(geometry_geojson)

    today = date.today()
    if not end_date:
        end_date = today.isoformat()
    if not start_date:
        start_date = (today - timedelta(days=45)).isoformat()

    coll, count = _pick_collection(geom, start_date, end_date)
    if count == 0:
        start_date = (
            datetime.fromisoformat(end_date).date() - timedelta(days=120)
        ).isoformat()
        coll, count = _pick_collection(geom, start_date, end_date)

    if count == 0:
        raise RuntimeError(
            "No cloud-free Sentinel-2 scenes found for this area in the "
            "last 120 days. Try a larger polygon or different dates."
        )

    composite = coll.median().clip(geom)
    latest_ts = (
        ee.Date(coll.aggregate_max("system:time_start"))
        .format("YYYY-MM-dd")
        .getInfo()
    )
    area_ha = round(float(geom.area(1).getInfo()) / 10_000.0, 3)
    bounds_geojson = geom.bounds().getInfo()

    return Scene(
        geom=geom,
        composite=composite,
        count=int(count),
        latest_ts=latest_ts,
        start_date=start_date,
        end_date=end_date,
        area_ha=area_ha,
        bounds=bounds_geojson,
    )


def build_indices(composite: "ee.Image") -> dict[str, "ee.Image"]:
    """Return {key: ee.Image} for every index in INDEX_CONFIG."""
    imgs: dict[str, "ee.Image"] = {}
    for key, cfg in INDEX_CONFIG.items():
        imgs[key] = composite.expression(
            cfg["expression"],
            {
                "B3": composite.select("B3"),
                "B4": composite.select("B4"),
                "B5": composite.select("B5"),
                "B8": composite.select("B8"),
            },
        ).rename(key)
    return imgs


def thumb_png_bytes(
    index_img: "ee.Image",
    geom: "ee.Geometry",
    cfg: dict,
    dimensions: int = 512,
) -> bytes:
    """Render a palette-colored PNG thumbnail of one index clipped to geom."""
    url = index_img.getThumbURL(
        {
            "region": geom,
            "dimensions": dimensions,
            "format": "png",
            "min": cfg["min"],
            "max": cfg["max"],
            "palette": cfg["palette"],
        }
    )
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return resp.content


def field_mean(index_img: "ee.Image", geom: "ee.Geometry", key: str) -> float | None:
    """Return the mean of an index over the whole polygon."""
    result = index_img.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=geom,
        scale=10,
        maxPixels=1e9,
    ).getInfo()
    val = result.get(key)
    return float(val) if val is not None else None


def build_zone_grid(
    geom: "ee.Geometry", rows: int, cols: int
) -> "ee.FeatureCollection":
    """Split the geom's bounding box into rows x cols rectangles clipped to geom.

    row 0 is north (max lat), col 0 is west (min lng), matching the frontend grid.
    """
    bounds = geom.bounds().coordinates().getInfo()[0]
    min_lng, min_lat = bounds[0]
    max_lng, max_lat = bounds[2]
    dx = (max_lng - min_lng) / cols
    dy = (max_lat - min_lat) / rows

    features = []
    for r in range(rows):
        top = max_lat - r * dy
        bot = max_lat - (r + 1) * dy
        for c in range(cols):
            left = min_lng + c * dx
            right = min_lng + (c + 1) * dx
            rect = ee.Geometry.Rectangle([left, bot, right, top])
            cell = rect.intersection(geom, 1)
            features.append(ee.Feature(cell, {"row": r, "col": c}))
    return ee.FeatureCollection(features)


def zone_means(
    index_img: "ee.Image", zones_fc: "ee.FeatureCollection", key: str
) -> list[dict]:
    """Return [{row, col, mean}] for each zone in the feature collection."""
    stats = index_img.reduceRegions(
        collection=zones_fc,
        reducer=ee.Reducer.mean(),
        scale=10,
    ).getInfo()

    out: list[dict] = []
    for f in stats.get("features", []):
        props = f.get("properties", {})
        raw = props.get("mean")
        if raw is None:
            # Some versions name the output after the band
            raw = props.get(key)
        mean_val = float(raw) if raw is not None else None
        out.append(
            {
                "row": int(props.get("row", 0)),
                "col": int(props.get("col", 0)),
                "mean": mean_val,
            }
        )
    out.sort(key=lambda z: (z["row"], z["col"]))
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze(geometry_geojson: dict, start_date: str | None, end_date: str | None) -> dict:
    """Run the four-index analysis over the given polygon.

    Returns tile URLs, per-index mean, and per-index status plus metadata.
    """
    scene = prepare_scene(geometry_geojson, start_date, end_date)
    indices = build_indices(scene.composite)

    results = []
    for key, cfg in INDEX_CONFIG.items():
        index_img = indices[key]

        mean_dict = index_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=scene.geom,
            scale=10,
            maxPixels=1e9,
        ).getInfo()
        mean_val = mean_dict.get(key)
        mean_num: float | None = float(mean_val) if mean_val is not None else None

        map_id = index_img.getMapId(
            {
                "min": cfg["min"],
                "max": cfg["max"],
                "palette": cfg["palette"],
            }
        )
        tile_url: str = map_id["tile_fetcher"].url_format  # type: ignore[index]

        results.append(
            {
                "key": key,
                "name": cfg["name"],
                "tileUrl": tile_url,
                "palette": ["#" + c for c in cfg["palette"]],
                "min": cfg["min"],
                "max": cfg["max"],
                "mean": mean_num,
                "status": _status_from_mean(key, mean_num),
            }
        )

    return {
        "indices": results,
        "imageDate": scene.latest_ts,
        "imageCount": scene.count,
        "areaHa": scene.area_ha,
        "window": {"start": scene.start_date, "end": scene.end_date},
        "bounds": scene.bounds,
    }
