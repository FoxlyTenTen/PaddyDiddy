"""ADK multi-agent system for paddy resource optimization.

Agents:
  - DiagnosisAgent (custom BaseAgent) — wraps the existing
    vertex_analyze.analyze_zones() so we don't pay for a redundant LLM call.
  - WaterOptimizer (LlmAgent) — uses Google Maps Weather API tool.
  - NutrientOptimizer (LlmAgent) — variable-rate fertilizer plan.
  - RoiAgent (LlmAgent w/ Pydantic output_schema) — total RM saved.

Composed by orchestrator.create_root_agent() as
SequentialAgent(Diagnosis -> ParallelAgent(Water, Nutrient) -> Roi).
"""
