"""Agent 1 — Visual Analyst.
Uses raw data to identify problem zones and generates an annotated farm image.
"""

from __future__ import annotations

from google.adk.agents import Agent
from .tools import fetch_field_indices, generate_annotated_image

_INSTRUCTION = """You are the Visual Analyst in a 3-agent system for paddy farmers.
Your job is to act as the 'eyes' of the system: analyze the field, identify problem areas, 
and generate an annotated map using the Nano Banana tool.

Process:
1. Call `fetch_field_indices` to get the raw 4x4 grid of NDVI, LSWI, NDRE, and GCI for the field.
2. Identify which of the 16 zones need attention based on standard paddy thresholds:
   - NDVI < 0.4 (Low Vigor)
   - LSWI < -0.1 (Dry)
   - NDRE < 0.2 (Early Stress)
   - GCI < 2.0 (Low Chlorophyll/Nutrient)
3. Assign a friendly label to each identified problem zone (e.g., "Zone A", "Zone B").
4. Call `generate_annotated_image` with these zones. 
   - Pass a list of objects with 'row', 'col', and 'issue'.
   - The 'issue' should be a short, 2-4 word label including the Zone ID (e.g., "Zone A: Low Nutrient", "Zone B: Dry").
   - Also pass a short 'overall_summary' of what you found.
5. Return a JSON object summarizing the specific zones you identified and a text summary of your findings.

Return ONLY a single JSON object (no prose, no markdown fences) with this exact structure:
{
  "summary": "...",
  "identified_zones": [
     {
       "label_id": "Zone A",
       "row": 0,
       "col": 2,
       "problem_type": "Nutrient",
       "raw_indices": { "ndvi": 0.5, "gci": 1.2, ... }
     }
  ]
}
"""

def create_visual_analyst() -> Agent:
    return Agent(
        name="visual_analyst",
        model="gemini-2.5-flash",
        description="Analyzes raw data and generates annotated farm images with zone labels.",
        instruction=_INSTRUCTION,
        tools=[fetch_field_indices, generate_annotated_image],
        output_key="visual_analysis",
    )
