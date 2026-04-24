"""ADK multi-agent system for paddy resource optimization (Image-First approach).

Agents:
  - Visual Analyst: Uses satellite indices to identify problem zones.
  - Diagnostic Agronomist: Diagnoses root causes (e.g., Drought, Nutrients) using indices and weather data.
  - Action Planner: Generates a prioritized, farmer-friendly checklist in the target language.

Composed by orchestrator.create_root_agent() as a SequentialAgent.
"""
