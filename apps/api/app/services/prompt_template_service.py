# Manages Local LLM prompt templates stored in Supabase.
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env

DEFAULT_PROMPT_TYPE = "content_recommendation"
DEFAULT_SYSTEM_PROMPT = "You are Be-Celeb's Korean YouTube content strategist. Return valid JSON only."
DEFAULT_USER_PROMPT_TEMPLATE = """
You are a YouTube content strategy analyst.
Analyze the user channel and category influencer database.
Recommend exactly one content idea the user has not uploaded yet.
Do not recommend content similar to the user's existing videos.
The storyboard must contain 6 to 10 detailed scenes. Each scene must be specific enough for a creator to film it.
Each storyboard scene must include duration, visual, dialogue, caption, and shootingTip.
Support standard YouTube videos and concise vertical formats when requested.
Return valid JSON only with this schema:
{
  "recommendation": {
    "title": "string",
    "format": "string",
    "hashtags": ["string"],
    "thumbnailIdea": "string",
    "targetAudience": "string",
    "hook": "string",
    "reason": "string",
    "whyNotDuplicate": "string",
    "storyboard": [
      {
        "scene": 1,
        "duration": "0-5s",
        "visual": "string",
        "dialogue": "string",
        "caption": "string",
        "shootingTip": "string"
      }
    ],
    "uploadTips": ["string"]
  }
}

Selected category:
{{selected_category}}

User channel:
{{user_channel}}

User recent videos:
{{user_recent_videos}}

Category influencer database videos:
{{category_database_videos}}

Duplicate guidelines:
{{duplicate_guidelines}}
""".strip()


def _supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers(prefer: str | None = None) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _request(method: str, path: str, *, params: dict[str, Any] | None = None, payload: Any | None = None, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.request(
            method,
            f"{_supabase_url()}/rest/v1/{path}",
            headers=_headers(prefer),
            params=params,
            json=payload,
        )
    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )
    return response.json() if response.text else None


def _prompt_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "type": row.get("type"),
        "systemPrompt": row.get("system_prompt"),
        "userPromptTemplate": row.get("user_prompt_template"),
        "isActive": bool(row.get("is_active")),
        "variables": row.get("variables") if isinstance(row.get("variables"), dict) else {},
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def get_active_prompt_template(prompt_type: str = DEFAULT_PROMPT_TYPE) -> dict[str, Any]:
    rows = await _request(
        "GET",
        "llm_prompt_templates",
        params={
            "select": "id,name,type,system_prompt,user_prompt_template,is_active,variables,created_at,updated_at",
            "type": f"eq.{prompt_type}",
            "is_active": "eq.true",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if row:
        return _prompt_row(row)
    return {
        "id": None,
        "name": "Fallback content recommendation prompt",
        "type": prompt_type,
        "systemPrompt": DEFAULT_SYSTEM_PROMPT,
        "userPromptTemplate": DEFAULT_USER_PROMPT_TEMPLATE,
        "isActive": False,
        "variables": {},
        "createdAt": None,
        "updatedAt": None,
    }


async def list_prompt_templates() -> dict[str, Any]:
    rows = await _request(
        "GET",
        "llm_prompt_templates",
        params={
            "select": "id,name,type,system_prompt,user_prompt_template,is_active,variables,created_at,updated_at",
            "order": "created_at.desc",
        },
    )
    return {"prompts": [_prompt_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []}


async def create_prompt_template(payload: dict[str, Any]) -> dict[str, Any]:
    should_activate = bool(payload.get("is_active", False))
    rows = await _request(
        "POST",
        "llm_prompt_templates",
        payload={
            "name": payload["name"].strip(),
            "type": payload.get("type") or DEFAULT_PROMPT_TYPE,
            "system_prompt": payload["system_prompt"],
            "user_prompt_template": payload["user_prompt_template"],
            "is_active": False,
            "variables": payload.get("variables") or {},
        },
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Prompt insert did not return a row.", 502, "SUPABASE_ERROR")
    if should_activate:
        await activate_prompt_template(row["id"], row.get("type") or DEFAULT_PROMPT_TYPE)
    return {"prompt": _prompt_row(row)}


async def update_prompt_template(prompt_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    should_activate = payload.get("is_active") is True
    update = {
        key: value
        for key, value in {
            "name": payload.get("name"),
            "type": payload.get("type"),
            "system_prompt": payload.get("system_prompt"),
            "user_prompt_template": payload.get("user_prompt_template"),
            "is_active": payload.get("is_active"),
            "variables": payload.get("variables"),
        }.items()
        if value is not None
    }
    if should_activate:
        update["is_active"] = False
    rows = await _request("PATCH", "llm_prompt_templates", params={"id": f"eq.{prompt_id}"}, payload=update, prefer="return=representation")
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Prompt template not found.", 404, "NOT_FOUND")
    if should_activate:
        await activate_prompt_template(prompt_id, row.get("type") or DEFAULT_PROMPT_TYPE)
    return {"prompt": _prompt_row(row)}


async def delete_prompt_template(prompt_id: str) -> dict[str, Any]:
    rows = await _request("DELETE", "llm_prompt_templates", params={"id": f"eq.{prompt_id}"}, prefer="return=representation")
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


async def activate_prompt_template(prompt_id: str, prompt_type: str = DEFAULT_PROMPT_TYPE) -> dict[str, Any]:
    await _request(
        "PATCH",
        "llm_prompt_templates",
        params={"type": f"eq.{prompt_type}"},
        payload={"is_active": False},
        prefer="return=minimal",
    )
    rows = await _request(
        "PATCH",
        "llm_prompt_templates",
        params={"id": f"eq.{prompt_id}"},
        payload={"is_active": True, "type": prompt_type},
        prefer="return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Prompt template not found.", 404, "NOT_FOUND")
    return {"prompt": _prompt_row(row)}


def render_prompt_template(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", value)
    return rendered
