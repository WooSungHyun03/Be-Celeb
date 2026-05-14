# Verifies Supabase access tokens received from the Vercel frontend.
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env


def _supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _auth_headers(access_token: str) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


def access_token_from_authorization(authorization: str | None) -> str | None:
    if not authorization:
        return None
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        return None
    token = authorization[len(prefix) :].strip()
    return token or None


async def get_user_from_access_token(access_token: str | None) -> dict[str, Any] | None:
    if not access_token:
        return None

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{_supabase_url()}/auth/v1/user", headers=_auth_headers(access_token))

    if response.status_code in {401, 403}:
        return None

    if response.status_code >= 400:
        raise BackendApiError(
            response.text or "Failed to verify Supabase user token.",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_AUTH_ERROR",
        )

    payload = response.json() if response.content else {}
    return payload if isinstance(payload, dict) and isinstance(payload.get("id"), str) else None


async def require_user_from_access_token(access_token: str | None) -> dict[str, Any]:
    user = await get_user_from_access_token(access_token)
    if not user:
        raise BackendApiError("Authentication required.", 401, "UNAUTHORIZED")
    return user
