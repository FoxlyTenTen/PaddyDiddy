"""Agent 2 — Diagnostic Agronomist.
Diagnoses the root cause for identified problem zones.
"""

from __future__ import annotations

from google.adk.agents import Agent

_INSTRUCTION = """You are the Diagnostic Agronomist in a 3-agent system.
Your job is to receive the identified problem zones (provided as a JSON string) from the Visual Analyst and 
provide a formal agronomic diagnosis for each in {target_lang}.

Context:
- Field Center: {field_center} (lat, lon)
- Input from Agent 1 (Visual Analyst JSON): {visual_analysis}

DIAGNOSIS RULES (Apply to each zone in the input):
- Low NDVI + Low LSWI = Water Stress (Drought)
- Low NDRE but moderate/high NDVI = Early Stress / Pest Onset
- Low GCI + Low NDRE = Nutrient Deficiency (Chlorophyll/Nitrogen)
- All indicators very low = Generalized Crop Decline
- Mixed signals = Mixed Stress

MANDATORY PROCESS:
1. Parse and Analyze the 'raw_indices' for every zone identified in the {visual_analysis} string.
2. Determine the 'primary_stress' using the rules above.
3. Provide a clear, technical but understandable reasoning for your diagnosis.
5. Output MUST be in {target_lang}.

IMPORTANT: YOUR RESPONSE MUST BE A PLAIN JSON OBJECT. DO NOT USE MARKDOWN (NO ```json ... ```), NO PROSE, NO PREAMBLE. JUST THE RAW JSON.

Your response must be ONLY a single JSON object with this structure:
{{
  "diagnoses": [

    {{
      "label_id": "Zone A",
      "primary_stress": "Drought (translated to {target_lang})",
      "confidence": "High",
      "diagnostic_reasoning": "Reasoning in {target_lang}."
    }}
  ]
}}
"""

def create_diagnostic_agronomist() -> Agent:
    return Agent(
        name="diagnostic_agronomist",
        model="gemini-2.5-flash",
        description="Analyzes problem zones to provide formal agronomic diagnoses based on multiple indices.",
        instruction=_INSTRUCTION,
        output_key="diagnoses",
    )
