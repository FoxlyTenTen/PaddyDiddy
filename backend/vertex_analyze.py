"""Vertex AI Gemini pipeline that turns vegetation-index PNGs + numeric
per-zone stats into farmer advisories for the 3D farm-view dashboard."""

from __future__ import annotations

import json
import os
from typing import Any

import vertexai  # type: ignore
from google.oauth2 import service_account  # type: ignore
from vertexai.generative_models import (  # type: ignore
    GenerativeModel,
    GenerationConfig,
    Part,
)

import gee

GRID_ROWS = 4
GRID_COLS = 4
MODEL_NAME = "gemini-1.5-flash-002"

_initialized = False


def _init() -> None:
    global _initialized
    if _initialized:
        return

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT is not set. Add it to backend/.env "
            "along with GOOGLE_CLOUD_LOCATION and VERTEX_KEY_FILE."
        )
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1").strip()

    # Load the Vertex service account key explicitly instead of relying on
    # the GOOGLE_APPLICATION_CREDENTIALS env var. If that env var is set,
    # Earth Engine's client picks it up too and tries to use the same key,
    # which fails unless the service account is registered with GEE.
    key_file = os.environ.get("VERTEX_KEY_FILE", "").strip()
    credentials = None
    if key_file:
        credentials = service_account.Credentials.from_service_account_file(
            key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )

    vertexai.init(project=project, location=location, credentials=credentials)
    _initialized = True


_ZONE_SCHEMA = {
    "type": "object",
    "properties": {
        "overall_summary": {"type": "string"},
        "zones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "row": {"type": "integer"},
                    "col": {"type": "integer"},
                    "health": {
                        "type": "string",
                        "enum": ["good", "moderate", "poor"],
                    },
                    "water": {
                        "type": "string",
                        "enum": ["dry", "ok", "flooded"],
                    },
                    "issue": {"type": "string"},
                    "tip": {"type": "string"},
                },
                "required": ["row", "col", "health", "water", "tip"],
            },
        },
    },
    "required": ["overall_summary", "zones"],
}


_INSTRUCTIONS = f"""You are analysing a Malaysian paddy (rice) field for a farmer who
is not a remote-sensing expert.

You receive THREE kinds of evidence about the SAME field:
  (A) Four palette-coloured satellite index images (north is up):
        1. NDVI  — red=stressed/bare, green=vigorous canopy
        2. NDRE  — similar to NDVI, more sensitive to mid-growth stress
        3. LSWI  — blue=high moisture / saturated soil, brown=dry surface
        4. GCI   — dark green=chlorophyll-rich, pale=nitrogen shortage
  (B) Field-level mean value for each index with its healthy / moderate
      thresholds, so you know what "good" looks like numerically.
  (C) Per-zone mean values for every index on a {GRID_ROWS}x{GRID_COLS}
      grid. row=0 is north, col=0 is west. Use these numbers as your
      primary ground truth — the images only add spatial context.

Produce EXACTLY {GRID_ROWS * GRID_COLS} zone entries, one per cell, in any order.

For each cell:
- health: 'good' | 'moderate' | 'poor'
    Cross-check NDVI, NDRE and GCI against their thresholds. If two or
    more are below the 'moderate' cutoff, return 'poor'.
- water:  'dry' | 'ok' | 'flooded'
    Drive primarily from LSWI. 'flooded' when LSWI is clearly positive
    for a paddy at its current stage; 'dry' when LSWI is below the
    moderate cutoff.
- issue:  short label (<= 5 words) for the biggest problem, or omit if healthy.
- tip:    ONE plain-language sentence a farmer can act on this week.

Also produce overall_summary: one sentence naming the dominant issue
across the field (or 'Field is healthy overall.' if everything is fine).

Keep tips practical for paddy rice (irrigation, drainage, nitrogen
top-up, pest scouting, replanting thin spots, etc.) and avoid jargon
like 'NDVI' or 'chlorophyll' in the tip text itself."""


def _fmt_num(v: float | None, digits: int = 2) -> str:
    return "n/a" if v is None else f"{v:.{digits}f}"


def _build_context_text(
    field_means: dict[str, float | None],
    zone_means: dict[str, list[dict]],
) -> str:
    """Render the numeric evidence block that accompanies the images."""
    lines: list[str] = []

    lines.append("(B) FIELD-LEVEL MEANS with thresholds:")
    for key, cfg in gee.INDEX_CONFIG.items():
        name = cfg["name"]
        mean = field_means.get(key)
        digits = 1 if key == "gci" else 2
        lines.append(
            f"  - {name}: mean={_fmt_num(mean, digits)} "
            f"(healthy >= {cfg['healthy_min']}, "
            f"moderate >= {cfg['moderate_min']}, "
            f"range {cfg['min']}..{cfg['max']})"
        )

    lines.append("")
    lines.append(
        f"(C) PER-ZONE MEANS on a {GRID_ROWS}x{GRID_COLS} grid "
        f"(row 0 = north, col 0 = west):"
    )

    header = "  row,col | " + " | ".join(
        cfg["name"] for cfg in gee.INDEX_CONFIG.values()
    )
    lines.append(header)
    lines.append("  " + "-" * (len(header) - 2))

    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            parts = [f"  ({r},{c})  "]
            for key, cfg in gee.INDEX_CONFIG.items():
                digits = 1 if key == "gci" else 2
                cell = next(
                    (
                        z
                        for z in zone_means.get(key, [])
                        if z["row"] == r and z["col"] == c
                    ),
                    None,
                )
                parts.append(_fmt_num(cell["mean"] if cell else None, digits))
            lines.append(" | ".join(parts))

    return "\n".join(lines)


def analyze_zones(scene: gee.Scene, language: str = "en") -> dict[str, Any]:
    """Render the four index PNGs + numeric stats, then ask Gemini for zone advice."""
    _init()

    lang_map = {
        "en": "English",
        "ms": "Bahasa Malaysia",
        "zh": "Mandarin Chinese",
        "ta": "Tamil"
    }
    target_lang = lang_map.get(language, "English")

    indices = gee.build_indices(scene.composite)
    zones_fc = gee.build_zone_grid(scene.geom, GRID_ROWS, GRID_COLS)

    field_means: dict[str, float | None] = {}
    zone_means: dict[str, list[dict]] = {}
    png_by_key: dict[str, bytes] = {}
    for key, cfg in gee.INDEX_CONFIG.items():
        img = indices[key]
        field_means[key] = gee.field_mean(img, scene.geom, key)
        zone_means[key] = gee.zone_means(img, zones_fc, key)
        png_by_key[key] = gee.thumb_png_bytes(img, scene.geom, cfg)

    # A cell is "covered" if at least one index returned a non-null mean for
    # it — meaning the polygon actually overlaps that cell.
    covered: set[tuple[int, int]] = set()
    for key in gee.INDEX_CONFIG:
        for z in zone_means.get(key, []):
            if z["mean"] is not None:
                covered.add((int(z["row"]), int(z["col"])))

    context_text = _build_context_text(field_means, zone_means)

    language_instruction = f"\n\nIMPORTANT: You must provide all text fields (overall_summary, issue, tip) in {target_lang}."

    parts: list[Part] = [
        Part.from_text(_INSTRUCTIONS + language_instruction),
        Part.from_text("\n" + context_text + "\n\n(A) INDEX IMAGES (north up):"),
    ]
    for key, cfg in gee.INDEX_CONFIG.items():
        parts.append(Part.from_text(f"\n--- {cfg['name']} ---"))
        parts.append(Part.from_data(data=png_by_key[key], mime_type="image/png"))

    model = GenerativeModel(MODEL_NAME)
    response = model.generate_content(
        parts,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            response_schema=_ZONE_SCHEMA,
            temperature=0.2,
        ),
    )

    try:
        payload = json.loads(response.text)
    except (json.JSONDecodeError, AttributeError) as exc:
        raise RuntimeError(f"Vertex returned unparseable JSON: {exc}") from exc

    zones = payload.get("zones", [])
    if len(zones) != GRID_ROWS * GRID_COLS:
        raise RuntimeError(
            f"Vertex returned {len(zones)} zones, "
            f"expected {GRID_ROWS * GRID_COLS}."
        )

    for z in zones:
        z["covered"] = (int(z.get("row", 0)), int(z.get("col", 0))) in covered

    return {
        "zones": zones,
        "overallSummary": payload.get("overall_summary", ""),
    }
