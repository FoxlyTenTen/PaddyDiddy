"""ROI agent — turns the water + nutrient plans into a headline RM-saved number."""

from __future__ import annotations

from google.adk.agents import Agent


_INSTRUCTION = """You are the ROI agent for a Malaysian smallholder paddy
farmer. Read the other agents' outputs from state and compute the total
ringgit (RM) savings versus uniform application for THIS 7-day window.

Inputs available to you:
  - Water plan (from state):   {water_plan}
  - Nutrient plan (from state): {nutrient_plan}
  - Diagnosis (from state):     {diagnosis}

Malaysian price defaults (use these, do not ask):
  - Urea: RM 2.50 / kg
  - NPK 15-15-15: RM 3.20 / kg
  - Pumping diesel + labour for 25 mm irrigation on a 0.1 ha zone: RM 8.00
  - Field area: read areaHa if present in diagnosis, else assume 1.0 ha

Compute:
  - water_savings_rm: sum of skipped irrigation events * RM 8.00 * zone fraction
  - nutrient_savings_rm: (baseline_total_kg - optimized_total_kg) * per-kg price
  - total_savings_rm: water_savings_rm + nutrient_savings_rm
  - headline: ONE farmer-friendly sentence with the total (e.g. "Save RM 47 this week by skipping 3 irrigations and trimming urea on healthy zones.")
  - actions: top 3 zones with highest combined savings, each with
             {row, col, action: short imperative, saving_rm}

Emit JSON matching the output schema exactly. Round RM values to 2 decimal
places. Do not add prose outside the JSON."""


def create_roi_agent() -> Agent:
    # NOTE: output_schema is intentionally NOT set — it disables tool calling
    # AND cross-agent state reads in some ADK versions. We rely on strict
    # instruction + downstream Python validation instead.
    return Agent(
        name="roi",
        model="gemini-2.5-pro",
        description=(
            "Combines the water and nutrient plans into a single RM-saved "
            "figure plus the top 3 actions the farmer should take this week."
        ),
        instruction=_INSTRUCTION,
        output_key="roi",
    )
