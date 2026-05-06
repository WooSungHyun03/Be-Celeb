# Provides minimal Supabase REST access helpers for future FastAPI persistence.
import httpx

from app.core.config import get_settings
from app.core.errors import MissingConfigurationError


def get_supabase_headers() -> dict[str, str]:
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise MissingConfigurationError("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.")

    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


async def fetch_trends_from_supabase() -> list[dict[str, object]]:
    settings = get_settings()

    if not settings.supabase_url:
        raise MissingConfigurationError("NEXT_PUBLIC_SUPABASE_URL is not configured.")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/trends?select=*",
            headers=get_supabase_headers(),
        )
        response.raise_for_status()
        data = response.json()

    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]

    return []
