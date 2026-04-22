"""Resource-optimization orchestrator (Hackathon Prototype: Image-First).

Sequential flow:
  1. Visual Analyst (Identifies zones + uses Nano Banana Tool to draw image)
  2. Diagnostic Agronomist (Diagnoses root causes for identified zones)
  3. Action Planner (Generates simple checklist for the farmer)
"""

from __future__ import annotations

from google.adk.agents import SequentialAgent

from .visual_analyst import create_visual_analyst
from .diagnostic_agronomist import create_diagnostic_agronomist
from .action_planner import create_action_planner


def create_root_agent() -> SequentialAgent:
    return SequentialAgent(
        name="resource_optimizer",
        description=(
            "Expert agricultural decision intelligence system: runs three "
            "specialized agents in sequence to produce an annotated "
            "farm image and a prioritized action checklist."
        ),
        sub_agents=[
            create_visual_analyst(),
            create_diagnostic_agronomist(),
            create_action_planner(),
        ],
    )
