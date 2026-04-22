"""Agent 3 — Action Planner.
Generates the final simple to-do list for the farmer.
"""

from __future__ import annotations

from google.adk.agents import Agent

_INSTRUCTION = """You are the Action Planner in a 3-agent system.
Your job is to receive the formal diagnoses from Agent 2 and translate them into a 
simple, prioritized "Action Checklist" for a Malaysian paddy farmer.

Input from Agent 2 (Diagnostic Agronomist): {diagnoses}

Process:
1. Review the diagnoses for each labelled zone (e.g., Zone A, Zone B).
2. Generate practical, realistic, and non-hallucinated recommendations.
3. Focus on immediate physical actions the farmer can take this week.

Return ONLY a single JSON object (no prose, no markdown fences) with this exact structure:
{
  "farmer_summary": "A 2-sentence warm and simple summary of the overall field condition.",
  "action_checklist": [
    {
      "zone_label": "Zone A",
      "action": "Briefly state what to do (e.g., 'Apply Urea top-dressing')",
      "urgency": "Today" | "This week" | "Monitor",
      "why": "Simple reason tied to the diagnosis"
    }
  ],
  "monitoring_plan": "A short note on what the farmer should watch for in the coming days.",
  "judge_summary": "Technical note for hackathon judges explaining why this sequential Image-First multi-agent handoff is superior to a plain dashboard."
}
"""

def create_action_planner() -> Agent:
    return Agent(
        name="action_planner",
        model="gemini-2.5-flash",
        description="Generates a simple, prioritized to-do list for the farmer based on diagnoses.",
        instruction=_INSTRUCTION,
        output_key="action_plan",
    )
