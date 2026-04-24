"""Per-index recommendation — sends ONE palette-coloured index PNG plus its
numeric context to Gemini and asks for a farmer-friendly explanation and
prevention steps."""

from __future__ import annotations

import json
import os
from typing import Any

import vertexai  # type: ignore
from google.oauth2 import service_account  # type: ignore
from vertexai.generative_models import (  # type: ignore
    GenerationConfig,
    GenerativeModel,
    Part,
)

import gee


MODEL_NAME = "gemini-2.5-flash"

_initialized = False


def _init() -> None:
    global _initialized
    if _initialized:
        return

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT is not set. Add it to backend/.env."
        )
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1").strip()

    key_file = os.environ.get("VERTEX_KEY_FILE", "").strip()
    credentials = None
    if key_file:
        credentials = service_account.Credentials.from_service_account_file(
            key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    vertexai.init(project=project, location=location, credentials=credentials)
    _initialized = True


_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {
            "type": "string",
            "description": "One VERY simple, easy to understand sentence for a farmer. Maximum 15 words. Just explain what is happening on the farm based on the image.",
        },
        "severity": {
            "type": "string",
            "enum": ["healthy", "moderate", "critical"],
        },
        "whats_happening": {
            "type": "string",
            "description": "2-3 sentences, plain Malaysian-farmer English.",
        },
        "likely_causes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "3-5 short bullets — most likely explanations.",
        },
        "prevention_steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "when": {"type": "string"},
                    "why": {"type": "string"},
                },
                "required": ["action", "when", "why"],
            },
            "description": "3-5 actionable steps with timing and reason.",
        },
        "simple_explanation": {
            "type": "string",
            "description": "Simple explanation of what this index is for and how it works.",
        },
        "zones_matrix": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "row": {"type": "integer"},
                    "col": {"type": "integer"},
                    "status": {"type": "string", "enum": ["good", "attention"]},
                    "action_needed": {"type": "string", "description": "Short 1-sentence action or 'None' if healthy"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low", "none"], "description": "Action priority for this zone"},
                },
                "required": ["row", "col", "status", "action_needed", "priority"],
            },
            "description": "A 4x4 matrix of plots (16 zones) indicating if action is needed. For zones with attention, classify the urgency.",
        },
    },
    "required": [
        "headline",
        "severity",
        "whats_happening",
        "likely_causes",
        "prevention_steps",
        "simple_explanation",
        "zones_matrix",
    ],
}


_INDEX_GUIDE: dict[str, dict[str, str]] = {
    "ndvi": {
        "what_it_measures": "canopy greenness / overall vigour",
        "red_means": "bare or stressed vegetation",
        "green_means": "dense, vigorous canopy",
        "common_causes_low": (
            "water deficit, nitrogen deficiency, pest or disease damage, "
            "late/thin transplanting"
        ),
    },
    "ndre": {
        "what_it_measures": "mid-canopy stress (red-edge)",
        "red_means": "early or sub-canopy stress before it shows in NDVI",
        "green_means": "healthy leaf chlorophyll at depth",
        "common_causes_low": (
            "early nitrogen shortage, mid-season drought stress, fungal "
            "disease, nutrient lockout from waterlogged soil"
        ),
    },
    "lswi": {
        "what_it_measures": "surface water / leaf moisture on the paddy",
        "red_means": "dry — soil is exposed and paddy bund may be breached",
        "green_means": "standing water / saturated soil (normal for paddy)",
        "common_causes_low": (
            "insufficient irrigation, leaking bund, pump failure, over-drain "
            "before grain-fill"
        ),
    },
    "gci": {
        "what_it_measures": "chlorophyll concentration (proxy for nitrogen)",
        "red_means": "pale leaves — low nitrogen",
        "green_means": "dark green leaves — adequate nitrogen",
        "common_causes_low": (
            "overdue urea top-dressing, nitrogen leached by heavy rain, "
            "acidic soil locking nutrients"
        ),
    },
}


def _status_label(key: str, mean: float | None) -> str:
    cfg = gee.INDEX_CONFIG[key]
    if mean is None:
        return "unknown (no coverage)"
    if mean >= cfg["healthy_min"]:
        return "healthy"
    if mean >= cfg["moderate_min"]:
        return "moderate"
    return "needs attention"


def _zone_level(key: str, mean_val: float | None) -> str:
    """Classify a zone mean into a 4-level label."""
    cfg = gee.INDEX_CONFIG[key]
    if mean_val is None:
        return "no_data"
    if mean_val >= cfg["healthy_min"]:
        return "optimal"
    if mean_val >= cfg["moderate_min"]:
        return "moderate"
    # Below moderate — further split by how far below
    span = cfg["moderate_min"] - cfg["min"]
    if span > 0 and mean_val >= cfg["min"] + span * 0.4:
        return "low"
    return "critical"


def _normalize(key: str, val: float | None) -> float | None:
    """Normalize a raw mean to 0-1 within the index's display range."""
    if val is None:
        return None
    cfg = gee.INDEX_CONFIG[key]
    denom = cfg["max"] - cfg["min"]
    if denom == 0:
        return 0.0
    return max(0.0, min(1.0, (val - cfg["min"]) / denom))


def recommend(scene: gee.Scene, index_key: str, language: str = "en") -> dict[str, Any]:
    """Render the single-index PNG, call Gemini, return a structured advisory."""
    key = index_key.lower().strip()
    if key not in gee.INDEX_CONFIG:
        raise RuntimeError(
            f"Unknown index '{index_key}'. "
            f"Expected one of: {list(gee.INDEX_CONFIG)}"
        )
    cfg = gee.INDEX_CONFIG[key]
    guide = _INDEX_GUIDE[key]

    _init()

    lang_map = {
        "en": "English",
        "ms": "Bahasa Malaysia",
        "zh": "Mandarin Chinese",
        "ta": "Tamil"
    }
    target_lang = lang_map.get(language, "English")

    indices = gee.build_indices(scene.composite)
    index_img = indices[key]
    mean_val = gee.field_mean(index_img, scene.geom, key)
    png = gee.thumb_png_bytes(index_img, scene.geom, cfg)
    status = _status_label(key, mean_val)
    digits = 1 if key == "gci" else 2
    mean_str = "n/a" if mean_val is None else f"{mean_val:.{digits}f}"

    zones_fc = gee.build_zone_grid(scene.geom, 4, 4)
    zone_means_data = gee.zone_means(index_img, zones_fc, key)

    # Build rich per-zone stats for the frontend matrix renderer
    zone_stats: list[dict] = []
    for zm in zone_means_data:
        r, c, mv = zm["row"], zm["col"], zm["mean"]
        zone_stats.append({
            "row": r,
            "col": c,
            "value": round(mv, digits) if mv is not None else None,
            "value_str": "n/a" if mv is None else f"{mv:.{digits}f}",
            "level": _zone_level(key, mv),
            "norm": round(_normalize(key, mv), 3) if mv is not None else None,
        })

    zone_lines = []
    for r in range(4):
        row_parts = []
        for c in range(4):
            cell = next((z for z in zone_means_data if z["row"] == r and z["col"] == c), None)
            val = cell["mean"] if cell else None
            row_parts.append("n/a" if val is None else f"{val:.{digits}f}")
        zone_lines.append(" | ".join(row_parts))
    zone_text = "\n".join(f"Row {r}: {zone_lines[r]}" for r in range(4))

    instructions = f"""You are advising a Malaysian smallholder paddy (rice)
farmer. Speak in simple, warm, plain {target_lang} — no jargon like
"chlorophyll absorption" or "reflectance".

You are looking at ONE satellite-derived index image for this farmer's
specific field, plus its numeric context. Give a specific, actionable
recommendation — not generic agronomy advice.

=== INDEX ===
Name:            {cfg['name']}
What it measures: {guide['what_it_measures']}
Red on image:    {guide['red_means']}
Green on image:  {guide['green_means']}
Healthy range:   >= {cfg['healthy_min']}
Moderate range:  >= {cfg['moderate_min']}
Value scale:     {cfg['min']} to {cfg['max']}

=== THIS FIELD ===
Field area:        {scene.area_ha} ha
Image date:        {scene.latest_ts}
Field-mean {cfg['name']}: {mean_str}  ({status})

=== ZONE DATA (4x4 grid) ===
{zone_text}

=== KNOWN CAUSES OF LOW {cfg['name']} ===
{guide['common_causes_low']}

=== INSTRUCTIONS ===
Look at the image and the zone data. Note WHERE the problem spots are (north/south/east/
west, or patchy, or uniform). Integrate that with the numeric value.

Return a JSON object with:
  - headline: one VERY simple, one-line explanation of what is happening on the farm. Use easy words. No technical jargon. Maximum 15 words.
  - severity: 'healthy' if the field looks fine; 'moderate' if the mean
    is in the moderate band OR the image shows a localised issue;
    'critical' if the field-mean is below the moderate threshold.
  - whats_happening: 2-3 sentences telling the farmer what you see in
    THEIR image. Reference the spatial pattern you observe.
  - likely_causes: 3-5 short bullets, ordered most-likely first. Be
    specific to paddy and to what the image shows.
  - prevention_steps: 3-5 steps. Each has:
      action: what to do
      when: when to do it (e.g. "within 48 hours", "next 3 days",
             "before next top-dressing")
      why: one short reason tied to what you saw.
  - simple_explanation: A simple explanation of what this index is and how it helps the farmer.
  - zones_matrix: A list of exactly 16 zones (row 0-3, col 0-3) showing if action is needed.

Keep language at a Form-3 reading level. No technical index names in the
headline, whats_happening or prevention_steps — use words like "greenness",
"moisture", "leaf nitrogen" instead. The headline must be a single, clear line.

IMPORTANT: All text fields (headline, whats_happening, likely_causes, action, when, why, simple_explanation, action_needed) MUST be in {target_lang}."""


    parts = [
        Part.from_text(instructions),
        Part.from_text(f"\n--- {cfg['name']} image (north is up) ---"),
        Part.from_data(data=png, mime_type="image/png"),
    ]

    model = GenerativeModel(MODEL_NAME)
    response = model.generate_content(
        parts,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            response_schema=_RESPONSE_SCHEMA,
            temperature=0.3,
        ),
    )

    try:
        payload = json.loads(response.text)
    except (json.JSONDecodeError, AttributeError) as exc:
        raise RuntimeError(f"Gemini returned unparseable JSON: {exc}") from exc

    payload["index_key"] = key
    payload["index_name"] = cfg["name"]
    payload["index_min"] = cfg["min"]
    payload["index_max"] = cfg["max"]
    payload["index_palette"] = ["#" + c for c in cfg["palette"]]
    payload["mean"] = mean_val
    payload["status"] = status
    payload["image_date"] = scene.latest_ts
    payload["rows"] = 4
    payload["cols"] = 4
    payload["zone_stats"] = zone_stats
    # Include the field polygon ring so the frontend can clip the matrix
    # to the real shape drawn by the user.
    try:
        coords = scene.geom.getInfo()["coordinates"][0]  # outer ring [[lng,lat],...]
        payload["field_polygon"] = coords
    except Exception:
        payload["field_polygon"] = None
    return payload
