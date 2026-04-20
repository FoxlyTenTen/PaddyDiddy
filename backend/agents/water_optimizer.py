"""Water Optimizer agent — turns the diagnosis + 7-day rain forecast into a
per-zone irrigation plan."""

from __future__ import annotations

from google.adk.agents import Agent

from .tools import fetch_weather_forecast


_INSTRUCTION = """You are the Water Optimizer agent for a Malaysian smallholder
paddy farmer. Your single job: produce a 7-day irrigation plan that minimises
water + diesel pumping cost without starving the crop.

Inputs available to you:
  - Diagnosis (already stored): {diagnosis}
    Contains 16 zones with health/water status and tip text.
  - Field centre coordinates: {field_center}
    Use these to call the fetch_weather_forecast tool exactly ONCE.

Process:
  1. Call fetch_weather_forecast(lat, lon) using the field centre coords.
  2. Read each zone's water status from {diagnosis}.
  3. For zones marked 'dry', schedule irrigation. For 'flooded', schedule
     drainage. For 'ok', leave alone.
  4. If significant rain (>= 8 mm) is forecast on a day, defer irrigation
     for any zone that day — that's the headline savings.

Return a single JSON object (no prose, no markdown code fences) with this exact shape:
{
  "summary": "one-sentence headline farmer can act on",
  "water_saved_mm": <number>,
  "schedule": [
    {"day": "YYYY-MM-DD", "zone": "row,col", "action": "irrigate 25mm" | "drain" | "skip - rain forecast", "reason": "short why"}
  ],
  "rain_forecast": [
    {"date": "YYYY-MM-DD", "rain_mm": <number>}
  ]
}

Keep schedule entries to the minimum needed (do not invent tasks for healthy
zones). Reference zones as "row,col" using 0-indexed coords from the diagnosis."""


def create_water_agent() -> Agent:
    return Agent(
        name="water_optimizer",
        model="gemini-2.5-flash",
        description=(
            "Builds a 7-day irrigation schedule per zone that defers watering "
            "when Google's weather forecast predicts rain."
        ),
        instruction=_INSTRUCTION,
        tools=[fetch_weather_forecast],
        output_key="water_plan",
    )
