"""SSE stream helper — runs the ADK resource-optimizer and yields JSON events
shaped for the frontend state machine.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, AsyncIterator

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

import gee
from agents.orchestrator import create_root_agent
from agents.tools import polygon_centroid, register_scene, release_scene


log = logging.getLogger(__name__)

APP_NAME = "padiwatch_optimizer"
USER_ID = "local_user"

# Agents we surface in the UI.
KNOWN_AGENTS = (
    "visual_analyst",
    "diagnostic_agronomist",
    "action_planner",
)


def _sse(payload: dict[str, Any]) -> str:
    """Format a dict as an SSE 'data:' line."""
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _extract_text(content: Any) -> str:
    """Return the concatenated text from an Event's content.parts."""
    if not content or not getattr(content, "parts", None):
        return ""
    chunks: list[str] = []
    for p in content.parts:
        t = getattr(p, "text", None)
        if t:
            chunks.append(t)
    return "".join(chunks).strip()


def _extract_tool_call(content: Any) -> dict | None:
    if not content or not getattr(content, "parts", None):
        return None
    for p in content.parts:
        fc = getattr(p, "function_call", None)
        if fc:
            return {
                "name": getattr(fc, "name", "tool"),
                "args": dict(getattr(fc, "args", {}) or {}),
            }
    return None


def _extract_tool_result(content: Any) -> dict | None:
    if not content or not getattr(content, "parts", None):
        return None
    for p in content.parts:
        fr = getattr(p, "function_response", None)
        if fr:
            resp = getattr(fr, "response", None)
            return {
                "name": getattr(fr, "name", "tool"),
                "response": dict(resp) if resp else {},
            }
    return None


def _try_parse_json(raw: Any) -> Any:
    """If raw is a string that looks like JSON, parse it; otherwise return as-is."""
    if not isinstance(raw, str):
        return raw
    s = raw.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:].strip()
    if s and s[0] in "{[":
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            pass
    return raw


async def run_optimization_stream(
    geometry_geojson: dict,
    start_date: str | None,
    end_date: str | None,
    language: str = "en",
) -> AsyncIterator[str]:
    """Async generator yielding SSE lines for the /api/optimize endpoint."""

    t0 = time.time()
    session_id = "s_" + uuid.uuid4().hex
    stage = "startup"

    lang_map = {
        "en": "English",
        "ms": "Bahasa Malaysia",
        "zh": "Mandarin Chinese",
        "ta": "Tamil"
    }
    target_lang = lang_map.get(language, "English")

    try:
        yield _sse(
            {
                "type": "run_started",
                "session_id": session_id,
                "agents": list(KNOWN_AGENTS),
                "ts": time.time() - t0,
            }
        )

        stage = "prepare_scene"
        scene = gee.prepare_scene(geometry_geojson, start_date, end_date)

        field_center = polygon_centroid(geometry_geojson["coordinates"])
        yield _sse(
            {
                "type": "scene_ready",
                "area_ha": scene.area_ha,
                "image_date": scene.latest_ts,
                "field_center": field_center,
                "ts": time.time() - t0,
            }
        )

        stage = "build_runner"
        register_scene(session_id, scene)
        root_agent = create_root_agent()
        session_service = InMemorySessionService()
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id,
            state={
                "session_id": session_id,
                "field_center": field_center,
                "area_ha": scene.area_ha,
            },
        )
        runner = Runner(
            agent=root_agent,
            app_name=APP_NAME,
            session_service=session_service,
        )

        seen_agents: set[str] = set()
        trigger = genai_types.Content(
            role="user",
            parts=[genai_types.Part(text=f"Run the Image-First multi-agent pipeline. IMPORTANT: Provide all final outputs for the farmer in {target_lang}.")],
        )

        stage = "runner"
        async for event in runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=trigger,
        ):
            author = getattr(event, "author", "unknown") or "unknown"
            now = time.time() - t0

            if author not in seen_agents and author in KNOWN_AGENTS:
                seen_agents.add(author)
                yield _sse({"type": "agent_started", "agent": author, "ts": now})

            content = getattr(event, "content", None)

            tool_call = _extract_tool_call(content)
            if tool_call:
                yield _sse({
                    "type": "tool_called",
                    "agent": author,
                    "tool": tool_call["name"],
                    "args": tool_call["args"],
                    "ts": now,
                })

            # Note: fr used in _extract_tool_result was fixed above.
            tool_result = _extract_tool_result(content)
            if tool_result:
                yield _sse({
                    "type": "tool_result",
                    "agent": author,
                    "tool": tool_result["name"],
                    "preview": _shorten(tool_result["response"]),
                    "ts": now,
                })

            text = _extract_text(content)
            if text and not tool_call and not tool_result:
                yield _sse({
                    "type": "agent_output",
                    "agent": author,
                    "text": _shorten(text, max_len=500),
                    "ts": now,
                })

            is_final = False
            try:
                is_final = bool(event.is_final_response())
            except Exception:
                is_final = False
            if is_final and author in KNOWN_AGENTS:
                yield _sse({"type": "agent_finished", "agent": author, "ts": now})

        stage = "final_state"
        final_session = await session_service.get_session(
            app_name=APP_NAME, user_id=USER_ID, session_id=session_id
        )
        state = dict(final_session.state) if final_session else {}

        yield _sse(
            {
                "type": "final",
                "ts": time.time() - t0,
                "result": {
                    "visual_analysis": _try_parse_json(state.get("visual_analysis")),
                    "diagnoses": _try_parse_json(state.get("diagnoses")),
                    "action_plan": _try_parse_json(state.get("action_plan")),
                    "generated_image": state.get("generated_farm_image"),
                    "area_ha": state.get("area_ha"),
                    "field_center": state.get("field_center"),
                },
            }
        )
    except Exception as exc:
        log.exception("Optimizer run failed at stage=%s", stage)
        try:
            yield _sse(
                {
                    "type": "run_failed",
                    "stage": stage,
                    "error": f"{exc.__class__.__name__}: {exc}",
                    "ts": time.time() - t0,
                }
            )
        except Exception:
            pass
    finally:
        release_scene(session_id)


def _shorten(value: Any, max_len: int = 240) -> str:
    if not isinstance(value, str):
        try:
            value = json.dumps(value, default=str)
        except Exception:
            value = str(value)
    return value if len(value) <= max_len else value[: max_len - 1] + "…"
