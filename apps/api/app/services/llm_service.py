# Handles Local LLM calls and defensive JSON parsing.
from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env


def extract_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text).strip()
    first = text.find("{")
    last = text.rfind("}")
    return text[first : last + 1] if first >= 0 and last > first else text


def parse_llm_json_with_fallback(raw_text: str, fallback: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    try:
        parsed = json.loads(extract_json_text(raw_text))
        if not isinstance(parsed, dict):
            raise ValueError("Root value is not a JSON object.")
        return parsed, None
    except Exception as error:
        return fallback, str(error)


async def call_local_llm(prompt: str, temperature: float = 0.65) -> str:
    settings = get_settings()

    if not settings.local_llm_api_url:
        raise missing_env("LOCAL_LLM_API_URL")

    headers = {"Content-Type": "application/json"}
    if settings.local_llm_api_key:
        headers["Authorization"] = f"Bearer {settings.local_llm_api_key}"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            settings.local_llm_api_url,
            headers=headers,
            json={
                "model": settings.local_llm_model,
                "temperature": temperature,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Be-Celeb's Korean YouTube content strategist. Return valid JSON only.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
            },
        )

    if response.status_code >= 400:
        raise BackendApiError(response.text or f"Local LLM API request failed with status {response.status_code}.", 502)

    payload = response.json() if response.content else {}
    choices = payload.get("choices") if isinstance(payload, dict) else None
    first = choices[0] if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first.get("message"), dict) else {}
    raw_text = message.get("content")

    if not isinstance(raw_text, str) or not raw_text.strip():
        raise BackendApiError("Local LLM API returned an empty chat completion.", 502)

    return raw_text
