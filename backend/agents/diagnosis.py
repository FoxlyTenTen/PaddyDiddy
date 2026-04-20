"""Diagnosis agent — wraps the existing GEE + Vertex zone analyzer.

We use a custom BaseAgent (not LlmAgent) because vertex_analyze.analyze_zones()
is already deterministic and produces structured output. Wrapping it in an
LlmAgent would just double the LLM cost for zero added value.
"""

from __future__ import annotations

import json
from typing import AsyncGenerator

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types as genai_types

import vertex_analyze

from .tools import get_scene


class DiagnosisAgent(BaseAgent):
    """Reads the GEE Scene from the module registry, runs zone analysis,
    stores result in session state for downstream agents."""

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        scene = get_scene(ctx.session.id)
        if scene is None:
            raise RuntimeError(
                f"DiagnosisAgent: no Scene registered for session "
                f"{ctx.session.id}. The optimizer orchestrator must call "
                f"tools.register_scene() before running the pipeline."
            )

        result = vertex_analyze.analyze_zones(scene)

        # Persist for downstream agents (Water + Nutrient read this).
        ctx.session.state["diagnosis"] = result

        summary = result.get("overallSummary", "")
        zones = result.get("zones", [])
        problem_count = sum(
            1
            for z in zones
            if z.get("health") != "good" or z.get("water") != "ok"
        )

        # Compact preview the UI can render in the agent card.
        preview = json.dumps(
            {
                "summary": summary,
                "problem_zones": problem_count,
                "total_zones": len(zones),
            }
        )

        yield Event(
            author=self.name,
            content=genai_types.Content(
                role="model",
                parts=[
                    genai_types.Part(
                        text=f"Diagnosis complete: {problem_count} of "
                        f"{len(zones)} zones need attention. {summary}"
                    )
                ],
            ),
        )

        # Second event carries the structured preview for the frontend.
        yield Event(
            author=self.name,
            content=genai_types.Content(
                role="model",
                parts=[genai_types.Part(text=preview)],
            ),
        )


def create_diagnosis_agent() -> DiagnosisAgent:
    return DiagnosisAgent(
        name="diagnosis",
        description=(
            "Analyses the field's per-zone NDVI/NDRE/LSWI/GCI from Sentinel-2 "
            "imagery and produces a structured diagnosis with health/water "
            "status for each of the 16 zones."
        ),
    )
