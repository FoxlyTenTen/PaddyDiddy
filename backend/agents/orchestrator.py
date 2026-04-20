"""Resource-optimization orchestrator.

Shape:
    SequentialAgent: optimizer
      1. DiagnosisAgent (BaseAgent — calls vertex_analyze)
      2. ParallelAgent: optimizers
           - WaterOptimizer (LlmAgent + weather tool)
           - NutrientOptimizer (LlmAgent)
      3. RoiAgent (LlmAgent with structured output)

Use factory functions per the ADK cheatsheet — module-level instances raise
"agent already has a parent" when re-used across runs.
"""

from __future__ import annotations

from google.adk.agents import ParallelAgent, SequentialAgent

from .diagnosis import create_diagnosis_agent
from .nutrient_optimizer import create_nutrient_agent
from .roi_agent import create_roi_agent
from .water_optimizer import create_water_agent


def create_root_agent() -> SequentialAgent:
    return SequentialAgent(
        name="resource_optimizer",
        description=(
            "Top-level orchestrator: diagnoses the field, then runs the "
            "water and nutrient optimizers in parallel, then rolls the "
            "plans up into a ringgit-savings summary."
        ),
        sub_agents=[
            create_diagnosis_agent(),
            ParallelAgent(
                name="optimizers",
                description="Water + nutrient agents run concurrently.",
                sub_agents=[
                    create_water_agent(),
                    create_nutrient_agent(),
                ],
            ),
            create_roi_agent(),
        ],
    )
