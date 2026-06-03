# Wraps YouTube API access for recommendation workflows.
from app.schemas.youtube_content import YouTubeChannelAnalysis, YouTubeVideoAnalysis
from app.services.youtube_content_service import (
    _get_recent_videos_for_channel,
    _parse_channel_locator,
    get_upload_videos_page,
    get_youtube_channel,
)


def parse_youtube_channel_url(channel_url: str) -> tuple[str, str]:
    return _parse_channel_locator(channel_url)


async def get_channel_info(channel_url: str) -> YouTubeChannelAnalysis:
    return await get_youtube_channel(channel_url)


async def get_recent_videos(channel: YouTubeChannelAnalysis, max_results: int = 12) -> list[YouTubeVideoAnalysis]:
    return await _get_recent_videos_for_channel(channel, max_results=max_results)


async def get_channel_videos_page(
    channel: YouTubeChannelAnalysis,
    *,
    max_results: int = 50,
    page_token: str | None = None,
) -> tuple[list[YouTubeVideoAnalysis], str | None]:
    return await get_upload_videos_page(channel, max_results=max_results, page_token=page_token)
