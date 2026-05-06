# Sends email through Resend from the FastAPI server when configured.
import httpx

from app.core.config import get_settings
from app.core.errors import MissingConfigurationError


async def send_transactional_email(to_email: str, subject: str, html: str) -> dict[str, object]:
    settings = get_settings()

    if not settings.resend_api_key:
        raise MissingConfigurationError("RESEND_API_KEY is not configured.")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"Be Celeb <{settings.resend_from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
        )
        response.raise_for_status()
        data = response.json()

    return data if isinstance(data, dict) else {"data": data}
