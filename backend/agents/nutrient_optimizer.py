"""Nutrient Optimizer agent — variable-rate fertiliser plan keyed off NDVI/GCI."""

from __future__ import annotations

from google.adk.agents import Agent


_INSTRUCTION = """You are the Nutrient Optimizer agent for a Malaysian
smallholder paddy farmer (variety MR297, ~120-day cycle). Your job:
produce a variable-rate fertiliser plan that beats blanket application.

Inputs available to you:
  - Diagnosis (already stored): {diagnosis}
    Each of 16 zones has health (good/moderate/poor), water status,
    and a tip. NDVI/GCI shortfall is implicit in 'moderate' and 'poor'.

Reference baseline (uniform application a typical farmer would do):
  - Urea (46-0-0): 200 kg/ha
  - NPK 15-15-15 compound: 250 kg/ha
  - Total per ha: 450 kg fertiliser

Process — for EACH of the 16 zones produce a recommendation:
  - 'good'     -> reduce urea by 30%, keep NPK at baseline (saving)
  - 'moderate' -> baseline urea, baseline NPK
  - 'poor'     -> +20% urea (top-up), +10% NPK

Return ONE JSON object (no prose, no markdown code fences):
{
  "summary": "one-sentence headline like 'Save 28% urea by skipping healthy north zones.'",
  "urea_saved_kg_per_ha": <number>,
  "npk_saved_kg_per_ha": <number>,
  "zones": [
    {"row": <int>, "col": <int>, "urea_kg_per_ha": <number>, "npk_kg_per_ha": <number>, "reason": "short why"}
  ]
}

Always emit all 16 zone entries. Round kg/ha to nearest 5."""


def create_nutrient_agent() -> Agent:
    return Agent(
        name="nutrient_optimizer",
        model="gemini-2.5-flash",
        description=(
            "Produces variable-rate urea + NPK recommendations per zone, "
            "saving fertiliser on healthy zones and topping up poor ones."
        ),
        instruction=_INSTRUCTION,
        output_key="nutrient_plan",
    )
