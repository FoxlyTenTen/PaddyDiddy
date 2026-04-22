"""Generate ONE annotated farm overview image via Nano Banana
(gemini-2.5-flash-image) on Vertex AI.

Uses the newer `google-genai` SDK (not the legacy vertexai SDK) because
image-modality output requires `response_modalities=["IMAGE","TEXT"]` in
the GenerateContentConfig — the legacy SDK rejects that argument.
"""

from __future__ import annotations

import os
from typing import Any

from google import genai  # type: ignore
from google.genai import types as genai_types  # type: ignore
from google.oauth2 import service_account  # type: ignore

import gee

# Nano Banana on Vertex. If the GA name fails on your project, try
# "gemini-2.5-flash-image-preview".
IMAGE_MODEL = "gemini-2.5-flash-image"


_PROMPT = """You are creating ONE annotated overview image of a Malaysian
paddy (rice) field for a smallholder farmer who is NOT a remote-sensing
expert.

You receive:
  1. A true-colour (RGB) satellite image of the field, north up.
  2. An NDVI heatmap of the same field (red = stressed, green = vigorous).
  3. An LSWI heatmap (blue = high moisture, brown = dry).
  4. A short numeric summary of which zones have problems.

Produce ONE single annotated image that:
  - Shows the field from above (top-down / bird's-eye view).
  - Stays GROUNDED in the actual satellite RGB. Preserve the polygon shape
    and orientation. Do NOT redraw the field as a generic rectangle and do
    NOT invent buildings, roads or features that aren't there.
  - Adds CLEAR ARROWS pointing at the specific zones that need attention.
  - Each arrow has a SHORT 2-4 word text label next to it, e.g.
    "needs water", "low nitrogen", "check for pests", "drain here".
  - Do NOT annotate healthy zones — only mark problems.
  - Use a clean, high-contrast illustration style readable on a phone.
  - Keep north up.

Return only the image."""


_client: "genai.Client | None" = None


def _get_client() -> "genai.Client":
    global _client
    if _client is not None:
        return _client

    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT is not set. Add it to backend/.env "
            "along with GOOGLE_CLOUD_LOCATION and VERTEX_KEY_FILE."
        )
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1").strip()

    key_file = os.environ.get("VERTEX_KEY_FILE", "").strip()
    credentials = None
    if key_file:
        credentials = service_account.Credentials.from_service_account_file(
            key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )

    _client = genai.Client(
        vertexai=True,
        project=project,
        location=location,
        credentials=credentials,
    )
    return _client


def _problem_summary(zones: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for z in zones:
        if z.get("health") == "good" and z.get("water") == "ok":
            continue
        issue = z.get("issue") or z.get("tip", "")[:80]
        lines.append(
            f"  zone (row={z['row']}, col={z['col']}): "
            f"health={z['health']}, water={z['water']}, "
            f"problem='{issue}'"
        )
    if not lines:
        return "All zones look healthy — no annotation arrows are needed."
    return "Problem zones (row 0 = north, col 0 = west):\n" + "\n".join(lines)


def generate_farm_image(
    scene: gee.Scene,
    zones: list[dict[str, Any]],
    overall_summary: str,
) -> bytes:
    """Call Nano Banana with RGB + NDVI + LSWI + zone summary; return PNG bytes."""
    client = _get_client()

    indices = gee.build_indices(scene.composite)
    rgb_png = gee.rgb_thumb_png_bytes(scene.composite, scene.geom, dimensions=768)
    ndvi_png = gee.thumb_png_bytes(
        indices["ndvi"], scene.geom, gee.INDEX_CONFIG["ndvi"], dimensions=512
    )
    lswi_png = gee.thumb_png_bytes(
        indices["lswi"], scene.geom, gee.INDEX_CONFIG["lswi"], dimensions=512
    )

    summary_text = (
        f"Overall: {overall_summary}\n\n{_problem_summary(zones)}"
    )

    parts = [
        genai_types.Part(text=_PROMPT),
        genai_types.Part(text="\n--- TRUE-COLOUR SATELLITE IMAGE (north up) ---"),
        genai_types.Part(
            inline_data=genai_types.Blob(mime_type="image/png", data=rgb_png)
        ),
        genai_types.Part(text="\n--- NDVI HEATMAP ---"),
        genai_types.Part(
            inline_data=genai_types.Blob(mime_type="image/png", data=ndvi_png)
        ),
        genai_types.Part(text="\n--- LSWI HEATMAP ---"),
        genai_types.Part(
            inline_data=genai_types.Blob(mime_type="image/png", data=lswi_png)
        ),
        genai_types.Part(text="\n--- ZONE SUMMARY ---\n" + summary_text),
    ]

    response = client.models.generate_content(
        model=IMAGE_MODEL,
        contents=[genai_types.Content(role="user", parts=parts)],
        config=genai_types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    candidates = getattr(response, "candidates", None) or []
    for cand in candidates:
        content = getattr(cand, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", []) or []:
            inline = getattr(part, "inline_data", None)
            data = getattr(inline, "data", None) if inline else None
            if data:
                return data

    raise RuntimeError("Nano Banana returned no image data in response.")
