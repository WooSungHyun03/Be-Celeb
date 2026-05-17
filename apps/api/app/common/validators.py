# Shared input validators.
from __future__ import annotations

from urllib.parse import urlparse

from app.core.exceptions import BadRequestException
from app.services.youtube_content_service import CREATOR_CATEGORIES


def validate_category(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip()
    if normalized not in CREATOR_CATEGORIES:
        raise BadRequestException(f"category must be one of: {', '.join(CREATOR_CATEGORIES)}.")
    return normalized


def validate_youtube_channel_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or "youtube.com" not in parsed.netloc:
        raise BadRequestException("channelUrl must be a valid YouTube channel URL.")
    return value
