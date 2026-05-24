# Handles Local LLM calls and defensive JSON parsing.
from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.core.logging import get_logger
from app.services.llm_queue import queued_llm_call

logger = get_logger(__name__)


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


async def call_local_llm(
    prompt: str,
    temperature: float = 0.65,
    system_prompt: str = "You are Be-Celeb's Korean YouTube content strategist. Return valid JSON only.",
    max_tokens: int | None = None,
    queue_owner_id: str | None = None,
    queue_purpose: str = "local_llm",
) -> str:
    settings = get_settings()

    if not settings.local_llm_api_url:
        raise missing_env("LOCAL_LLM_API_URL")

    headers = {"Content-Type": "application/json"}
    if settings.local_llm_api_key:
        headers["Authorization"] = f"Bearer {settings.local_llm_api_key}"

    body: dict[str, Any] = {
        "model": settings.local_llm_model,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens

    async with queued_llm_call(owner_id=queue_owner_id, purpose=queue_purpose):
        response: httpx.Response | None = None
        async with httpx.AsyncClient(timeout=90) as client:
            for attempt in range(2):
                try:
                    response = await client.post(settings.local_llm_api_url, headers=headers, json=body)
                except httpx.TimeoutException as error:
                    if attempt == 0:
                        logger.warning("Local LLM request timed out; retrying once.")
                        await asyncio.sleep(1)
                        continue
                    raise BackendApiError("Local LLM 요청 시간이 초과되었습니다.", 504, "LLM_TIMEOUT") from error
                except httpx.HTTPError as error:
                    if attempt == 0:
                        logger.warning("Local LLM request failed; retrying once: %s", error.__class__.__name__)
                        await asyncio.sleep(1)
                        continue
                    raise BackendApiError("Local LLM API에 연결하지 못했습니다.", 502, "LLM_CONNECTION_ERROR") from error

                if response.status_code >= 500 and attempt == 0:
                    logger.warning("Local LLM returned %s; retrying once.", response.status_code)
                    await asyncio.sleep(1)
                    continue
                break

    if response is None:
        raise BackendApiError("Local LLM API 응답이 없습니다.", 502, "LLM_CONNECTION_ERROR")

    if response.status_code >= 400:
        raise BackendApiError("Local LLM API 요청에 실패했습니다.", 502, "LLM_ERROR")

    payload = response.json() if response.content else {}
    choices = payload.get("choices") if isinstance(payload, dict) else None
    first = choices[0] if isinstance(choices, list) and choices and isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first.get("message"), dict) else {}
    raw_text = message.get("content")

    if not isinstance(raw_text, str) or not raw_text.strip():
        raise BackendApiError("Local LLM API returned an empty chat completion.", 502)

    return raw_text
