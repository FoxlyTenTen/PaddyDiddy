"""Agent 2 — Diagnostic Agronomist.
Diagnoses the root cause for identified problem zones.
"""

from __future__ import annotations

from google.adk.agents import Agent

_INSTRUCTION = """You are the Diagnostic Agronomist in a 3-agent system.
Your job is to receive the identified problem zones from the Visual Analyst and 
provide a formal agronomic diagnosis for each.

Input from Agent 1 (Visual Analyst): {visual_analysis}

For each zone listed in Agent 1's output:
1. Look at the 'raw_indices' provided for that zone.
2. Infer the most likely stress condition based on these rules:
   - Low NDVI + Low LSWI = Water Stress (Drought)
   - Low NDRE but moderate/high NDVI = Early Stress / Pest Onset
   - Low GCI + Low NDRE = Nutrient Deficiency (Chlorophyll/Nitrogen)
   - All indicators very low = Generalized Crop Decline
   - Mixed signals = Mixed Stress
3. Provide a clear, technical but understandable reasoning for your diagnosis.

Return ONLY a single JSON object (no prose, no markdown fences) with this exact structure:
{
  "diagnoses": [
    {
      "label_id": "Zone A",
      "primary_stress": "...",
      "confidence": "High" | "Medium" | "Low",
      "diagnostic_reasoning": "..."
    }
  ]
}
"""

def create_diagnostic_agronomist() -> Agent:
    return Agent(
        name="diagnostic_agronomist",
        model="gemini-2.5-flash",
        description="Diagnoses the root cause for specific identified problem zones.",
        instruction=_INSTRUCTION,
        output_key="diagnoses",
    )
