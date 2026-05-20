# Provides the Render API implementation consumed by the Vercel frontend.
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.core.logging import get_logger
from app.schemas.youtube_content import (
    CategoryScore,
    ChannelAnalysisResult,
    ContentRecommendation,
    CreatorCategoryName,
    LlmRecommendationResponse,
    PersistenceResult,
    PopularTrendVideo,
    PopularVideosResponse,
    RecommendationApiResult,
    StoryboardScene,
    TrendKeywordCount,
    TrendKeywordRange,
    TrendKeywordsResponse,
    YouTubeChannelAnalysis,
    YouTubeThumbnail,
    YouTubeVideoAnalysis,
)

YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3"
logger = get_logger(__name__)
DAY_SECONDS = 24 * 60 * 60
UTC = timezone.utc
TOP_KEYWORD_COUNT = 10
SERIES_KEYWORD_COUNT = 5

CREATOR_CATEGORIES: list[CreatorCategoryName] = [
    "게임",
    "운동",
    "IT",
    "노래",
    "OTT",
    "일상",
    "뷰티",
    "스터디",
    "코미디",
    "먹방",
    "춤",
]

CATEGORY_KEYWORDS: dict[CreatorCategoryName, list[str]] = {
    "게임": ["게임", "롤", "리그오브레전드", "발로란트", "마인크래프트", "로블록스", "배그", "플레이", "공략"],
    "운동": ["헬스", "운동", "다이어트", "복근", "루틴", "pt", "피티", "홈트", "근력", "유산소"],
    "IT": ["개발", "코딩", "ai", "노트북", "프로그래밍", "앱", "테크", "인공지능", "리뷰", "개발자"],
    "노래": ["커버", "보컬", "노래", "플레이리스트", "라이브", "음악", "가창", "싱잉"],
    "OTT": ["넷플릭스", "드라마", "영화", "리뷰", "디즈니", "티빙", "왓챠", "웨이브", "시리즈"],
    "일상": ["브이로그", "일상", "하루", "루틴", "출근", "퇴근", "주말", "라이프", "vlog"],
    "뷰티": ["메이크업", "화장품", "피부", "올리브영", "스킨케어", "grwm", "뷰티", "립", "쿠션"],
    "스터디": ["공부", "시험", "대학생", "생산성", "플래너", "스터디", "독서", "자격증", "집중"],
    "코미디": ["웃긴", "몰카", "개그", "상황극", "코미디", "예능", "패러디", "드립"],
    "먹방": ["먹방", "맛집", "음식", "라면", "디저트", "요리", "레시피", "카페", "먹는"],
    "춤": ["댄스", "안무", "커버댄스", "챌린지", "춤", "dance", "choreography", "아이돌댄스"],
}


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed


def _as_str(value: Any, fallback: str = "") -> str:
    return value if isinstance(value, str) else fallback


def _as_str_list(value: Any) -> list[str]:
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []


def _normalize_supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _supabase_headers(prefer: str | None = None) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    return headers


async def _supabase_get(path: str, params: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=_supabase_headers(),
            params=params,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )

    return response.json()


async def _supabase_post(path: str, payload: Any, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=_supabase_headers(prefer),
            json=payload,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )

    if not response.text:
        return None

    return response.json()


async def _youtube_fetch(path: str, params: dict[str, Any]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.youtube_api_key:
        raise missing_env("YOUTUBE_API_KEY")

    query = {key: str(value) for key, value in params.items() if value is not None}
    query["key"] = settings.youtube_api_key

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{YOUTUBE_API_BASE_URL}/{path}", params=query)

    payload = response.json() if response.content else {}

    if response.status_code >= 400:
        message = payload.get("error", {}).get("message") if isinstance(payload, dict) else None
        raise BackendApiError(
            message or f"YouTube API request failed with status {response.status_code}.",
            502 if response.status_code >= 500 else response.status_code,
            "YOUTUBE_API_ERROR",
        )

    return payload if isinstance(payload, dict) else {}


def _normalize_channel_input(value: str) -> str:
    trimmed = value.strip()
    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        return trimmed
    if trimmed.startswith("@"):
        return f"https://www.youtube.com/{trimmed}"
    if re.match(r"^UC[\w-]{20,}$", trimmed, re.IGNORECASE):
        return f"https://www.youtube.com/channel/{trimmed}"
    return f"https://{trimmed}"


def _parse_channel_locator(channel_url: str) -> tuple[str, str]:
    trimmed = channel_url.strip()
    if not trimmed:
        raise BackendApiError("channelUrl is required.", 400, "VALIDATION_ERROR")
    if trimmed.startswith("@"):
        return ("handle", trimmed)
    if re.match(r"^UC[\w-]{20,}$", trimmed, re.IGNORECASE):
        return ("id", trimmed)

    try:
        url = httpx.URL(_normalize_channel_input(trimmed))
    except httpx.InvalidURL:
        return ("search", trimmed)

    hostname = (url.host or "").removeprefix("www.").lower()
    if "youtube.com" not in hostname:
        return ("search", trimmed)

    segments = [segment for segment in url.path.split("/") if segment]
    first = segments[0] if segments else ""
    second = segments[1] if len(segments) > 1 else ""

    if first == "channel" and second:
        return ("id", second)
    if first.startswith("@"):
        return ("handle", first)
    if first == "user" and second:
        return ("username", second)
    if first in {"c", "@"} and second:
        return ("search", second)
    return ("search", first or trimmed)


def _thumbnail_map(value: Any) -> dict[str, YouTubeThumbnail]:
    if not isinstance(value, dict):
        return {}
    return {
        key: YouTubeThumbnail(
            url=item.get("url") if isinstance(item, dict) else None,
            width=_as_int(item.get("width")) if isinstance(item, dict) else None,
            height=_as_int(item.get("height")) if isinstance(item, dict) else None,
        )
        for key, item in value.items()
    }


def _best_thumbnail_url(thumbnails: dict[str, Any]) -> str | None:
    for key in ("maxres", "standard", "high", "medium", "default"):
        item = thumbnails.get(key)
        if isinstance(item, dict) and isinstance(item.get("url"), str):
            return item["url"]
    return None


def _normalize_channel(item: dict[str, Any]) -> YouTubeChannelAnalysis:
    snippet = item.get("snippet") if isinstance(item.get("snippet"), dict) else {}
    content_details = item.get("contentDetails") if isinstance(item.get("contentDetails"), dict) else {}
    related_playlists = content_details.get("relatedPlaylists") if isinstance(content_details.get("relatedPlaylists"), dict) else {}
    statistics = item.get("statistics") if isinstance(item.get("statistics"), dict) else {}
    thumbnails = snippet.get("thumbnails") if isinstance(snippet.get("thumbnails"), dict) else {}
    channel_id = _as_str(item.get("id"))
    uploads_playlist_id = _as_str(related_playlists.get("uploads"))

    if not channel_id or not uploads_playlist_id:
        raise BackendApiError("YouTube channel response did not include an uploads playlist.", 502, "YOUTUBE_API_ERROR")

    return YouTubeChannelAnalysis(
        youtubeChannelId=channel_id,
        channelTitle=_as_str(snippet.get("title"), "Untitled channel"),
        channelUrl=f"https://www.youtube.com/channel/{channel_id}",
        description=_as_str(snippet.get("description")),
        thumbnailUrl=_best_thumbnail_url(thumbnails),
        subscriberCount=None if statistics.get("hiddenSubscriberCount") else _as_int(statistics.get("subscriberCount")),
        videoCount=_as_int(statistics.get("videoCount")),
        viewCount=_as_int(statistics.get("viewCount")),
        uploadsPlaylistId=uploads_playlist_id,
        raw=item,
    )


async def _get_channel_by_params(params: dict[str, str]) -> YouTubeChannelAnalysis | None:
    payload = await _youtube_fetch(
        "channels",
        {
            "part": "snippet,contentDetails,statistics",
            "maxResults": 1,
            **params,
        },
    )
    items = payload.get("items")
    if isinstance(items, list) and items and isinstance(items[0], dict):
        return _normalize_channel(items[0])
    return None


async def _search_channel(query: str) -> YouTubeChannelAnalysis | None:
    payload = await _youtube_fetch(
        "search",
        {
            "part": "snippet",
            "maxResults": 1,
            "q": query,
            "type": "channel",
        },
    )
    items = payload.get("items")
    first = items[0] if isinstance(items, list) and items and isinstance(items[0], dict) else {}
    snippet = first.get("snippet") if isinstance(first.get("snippet"), dict) else {}
    channel_id = snippet.get("channelId")
    return await _get_channel_by_params({"id": channel_id}) if isinstance(channel_id, str) else None


async def get_youtube_channel(channel_url: str) -> YouTubeChannelAnalysis:
    locator_type, locator_value = _parse_channel_locator(channel_url)

    if locator_type == "id":
        channel = await _get_channel_by_params({"id": locator_value})
        if channel:
            return channel

    if locator_type == "handle":
        handle = locator_value if locator_value.startswith("@") else f"@{locator_value}"
        channel = await _get_channel_by_params({"forHandle": handle})
        if channel:
            return channel
        searched = await _search_channel(handle)
        if searched:
            return searched

    if locator_type == "username":
        channel = await _get_channel_by_params({"forUsername": locator_value})
        if channel:
            return channel
        searched = await _search_channel(locator_value)
        if searched:
            return searched

    channel = await _search_channel(locator_value)
    if not channel:
        raise BackendApiError("Could not find a YouTube channel from the provided URL.", 404, "YOUTUBE_API_ERROR")
    return channel


def _normalize_video(item: dict[str, Any]) -> YouTubeVideoAnalysis | None:
    snippet = item.get("snippet") if isinstance(item.get("snippet"), dict) else {}
    statistics = item.get("statistics") if isinstance(item.get("statistics"), dict) else {}
    video_id = _as_str(item.get("id"))
    channel_id = _as_str(snippet.get("channelId"))
    published_at = _as_str(snippet.get("publishedAt"))

    if not video_id or not channel_id or not published_at:
        return None

    return YouTubeVideoAnalysis(
        youtubeVideoId=video_id,
        channelId=channel_id,
        publishedAt=published_at,
        title=_as_str(snippet.get("title"), "Untitled video"),
        description=_as_str(snippet.get("description")),
        thumbnails=_thumbnail_map(snippet.get("thumbnails")),
        tags=_as_str_list(snippet.get("tags")),
        viewCount=_as_int(statistics.get("viewCount")),
        likeCount=_as_int(statistics.get("likeCount")),
        commentCount=_as_int(statistics.get("commentCount")),
        raw=item,
    )


async def _get_video_details(video_ids: list[str]) -> list[YouTubeVideoAnalysis]:
    if not video_ids:
        return []

    videos: list[YouTubeVideoAnalysis] = []
    for index in range(0, len(video_ids), 50):
        chunk = video_ids[index : index + 50]
        payload = await _youtube_fetch(
            "videos",
            {
                "part": "snippet,statistics",
                "id": ",".join(chunk),
                "maxResults": len(chunk),
            },
        )
        items = payload.get("items")
        if isinstance(items, list):
            videos.extend(video for item in items if isinstance(item, dict) if (video := _normalize_video(item)) is not None)

    return videos


async def _get_recent_upload_video_ids(uploads_playlist_id: str, max_results: int = 12) -> list[str]:
    payload = await _youtube_fetch(
        "playlistItems",
        {
            "part": "snippet,contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": max(1, min(max_results, 50)),
        },
    )
    items = payload.get("items")
    video_ids: list[str] = []
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            content_details = item.get("contentDetails") if isinstance(item.get("contentDetails"), dict) else {}
            snippet = item.get("snippet") if isinstance(item.get("snippet"), dict) else {}
            resource = snippet.get("resourceId") if isinstance(snippet.get("resourceId"), dict) else {}
            video_id = content_details.get("videoId") or resource.get("videoId")
            if isinstance(video_id, str):
                video_ids.append(video_id)
    return video_ids


async def _get_recent_videos_for_channel(channel: YouTubeChannelAnalysis) -> list[YouTubeVideoAnalysis]:
    video_ids = await _get_recent_upload_video_ids(channel.uploadsPlaylistId, 12)
    videos = await _get_video_details(video_ids)
    return sorted(videos, key=lambda video: video.publishedAt, reverse=True)


def _normalize_category(value: str | None) -> CreatorCategoryName | None:
    if not value:
        return None
    normalized = value.strip().lower()
    for category in CREATOR_CATEGORIES:
        if category.lower() == normalized:
            return category
    return None


def _search_text(channel: YouTubeChannelAnalysis, videos: list[YouTubeVideoAnalysis]) -> str:
    parts = [channel.channelTitle, channel.description]
    for video in videos:
        parts.extend([video.title, video.description, *video.tags])
    return " ".join(parts).lower()


def _infer_category(channel: YouTubeChannelAnalysis, videos: list[YouTubeVideoAnalysis]) -> tuple[CreatorCategoryName, list[CategoryScore]]:
    text = _search_text(channel, videos)
    scores = [
        CategoryScore(
            category=category,
            score=len(matches := [keyword for keyword in CATEGORY_KEYWORDS[category] if keyword.lower() in text]),
            matchedKeywords=matches,
        )
        for category in CREATOR_CATEGORIES
    ]
    scores.sort(key=lambda score: (-score.score, CREATOR_CATEGORIES.index(score.category)))
    return (scores[0].category if scores else "일상", scores)


async def analyze_channel_for_recommendation(channel_url: str) -> ChannelAnalysisResult:
    channel = await get_youtube_channel(channel_url)
    recent_videos = await _get_recent_videos_for_channel(channel)
    inferred_category, category_scores = _infer_category(channel, recent_videos)
    return ChannelAnalysisResult(
        channel=channel,
        recentVideos=recent_videos,
        inferredCategory=inferred_category,
        categoryScores=category_scores,
    )


async def _get_category_id(category_name: CreatorCategoryName) -> str:
    rows = await _supabase_get(
        "creator_categories",
        {
            "select": "id,name",
            "name": f"eq.{category_name}",
            "limit": "1",
        },
    )
    if isinstance(rows, list) and rows and isinstance(rows[0], dict) and isinstance(rows[0].get("id"), str):
        return rows[0]["id"]
    raise BackendApiError(
        f'Creator category "{category_name}" is missing. Apply the latest Supabase migration first.',
        500,
        "SUPABASE_ERROR",
    )


def _video_from_row(row: dict[str, Any]) -> YouTubeVideoAnalysis:
    return YouTubeVideoAnalysis(
        youtubeVideoId=_as_str(row.get("youtube_video_id")),
        channelId=_as_str(row.get("youtube_channel_id")),
        publishedAt=_as_str(row.get("published_at")),
        title=_as_str(row.get("title"), "Untitled video"),
        description=_as_str(row.get("description")),
        thumbnails=_thumbnail_map(row.get("thumbnails")),
        tags=_as_str_list(row.get("tags")),
        viewCount=_as_int(row.get("view_count")),
        likeCount=_as_int(row.get("like_count")),
        commentCount=_as_int(row.get("comment_count")),
        raw=row.get("raw") if isinstance(row.get("raw"), dict) else {},
    )


async def _get_influencer_videos(category_name: CreatorCategoryName) -> list[YouTubeVideoAnalysis]:
    category_id = await _get_category_id(category_name)
    rows = await _supabase_get(
        "influencer_videos",
        {
            "select": "youtube_video_id,youtube_channel_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw",
            "category_id": f"eq.{category_id}",
            "order": "published_at.desc",
            "limit": "40",
        },
    )
    return [_video_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def _tokenize(value: str) -> list[str]:
    cleaned = re.sub(r"[^\w\s#가-힣]", " ", value.lower())
    return [token.removeprefix("#") for token in cleaned.split() if len(token.removeprefix("#")) >= 2]


def _token_overlap(user_video: YouTubeVideoAnalysis, influencer_video: YouTubeVideoAnalysis) -> float:
    user_tokens = set(_tokenize(" ".join([user_video.title, user_video.description, *user_video.tags])))
    influencer_tokens = set(_tokenize(" ".join([influencer_video.title, influencer_video.description, *influencer_video.tags])))
    if not user_tokens or not influencer_tokens:
        return 0.0
    return len(user_tokens & influencer_tokens) / min(len(user_tokens), len(influencer_tokens))


def _filter_duplicate_influencer_videos(
    user_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
    threshold: float = 0.34,
) -> tuple[list[YouTubeVideoAnalysis], int]:
    filtered: list[YouTubeVideoAnalysis] = []
    duplicate_count = 0

    for influencer_video in influencer_videos:
        max_score = max((_token_overlap(user_video, influencer_video) for user_video in user_videos), default=0.0)
        if max_score >= threshold:
            duplicate_count += 1
        else:
            filtered.append(influencer_video)

    return filtered, duplicate_count


def _compact_video(video: YouTubeVideoAnalysis) -> dict[str, Any]:
    return {
        "youtubeVideoId": video.youtubeVideoId,
        "publishedAt": video.publishedAt,
        "title": video.title,
        "description": video.description[:700],
        "tags": video.tags[:12],
        "viewCount": video.viewCount,
        "likeCount": video.likeCount,
        "commentCount": video.commentCount,
    }


def _build_llm_prompt(
    selected_category: CreatorCategoryName,
    channel: YouTubeChannelAnalysis,
    recent_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
) -> str:
    schema = {
        "selectedCategory": "string",
        "summary": "string",
        "recommendations": [
            {
                "title": "string",
                "format": "string",
                "reason": "string",
                "whyNotDuplicate": "string",
                "targetAudience": "string",
                "hashtags": ["string"],
                "thumbnailIdea": "string",
                "storyboard": [
                    {
                        "scene": 1,
                        "duration": "0-3s",
                        "description": "string",
                        "caption": "string",
                    }
                ],
            }
        ],
    }
    input_data = {
        "selectedCategory": selected_category,
        "userChannel": {
            "youtubeChannelId": channel.youtubeChannelId,
            "channelTitle": channel.channelTitle,
            "description": channel.description[:1000],
            "subscriberCount": channel.subscriberCount,
            "videoCount": channel.videoCount,
            "viewCount": channel.viewCount,
        },
        "userRecentVideos": [_compact_video(video) for video in recent_videos[:10]],
        "influencerRecentVideos": [_compact_video(video) for video in influencer_videos[:24]],
    }
    return "\n\n".join(
        [
            "Be-Celeb은 유튜브 크리에이터의 다음 콘텐츠 아이디어와 콘티를 추천하는 서비스다.",
            "아래 JSON 데이터를 분석해서 사용자가 이미 올린 콘텐츠와 중복되지 않는 다음 업로드 아이디어를 추천하라.",
            "카테고리별 인플루언서 최근 영상은 참고용 트렌드 데이터이며, 그대로 복제하지 말고 차별화된 아이디어로 재구성하라.",
            "반드시 JSON만 반환하라. 마크다운, 설명 문장, 코드펜스를 포함하지 말라.",
            "JSON schema:",
            json.dumps(schema, ensure_ascii=False, indent=2),
            "Input data:",
            json.dumps(input_data, ensure_ascii=False, indent=2),
        ]
    )


def _extract_json_text(raw_text: str) -> str:
    text = raw_text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text).strip()
    first = text.find("{")
    last = text.rfind("}")
    return text[first : last + 1] if first >= 0 and last > first else text


def _normalize_storyboard(value: Any) -> list[StoryboardScene]:
    if not isinstance(value, list):
        return []
    scenes: list[StoryboardScene] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            continue
        scenes.append(
            StoryboardScene(
                scene=_as_int(item.get("scene")) or index + 1,
                duration=_as_str(item.get("duration"), f"{index * 3}-{index * 3 + 3}s"),
                description=_as_str(item.get("description")),
                caption=_as_str(item.get("caption")),
            )
        )
    return scenes


def _normalize_recommendation(value: Any) -> ContentRecommendation | None:
    if not isinstance(value, dict) or not isinstance(value.get("title"), str):
        return None
    return ContentRecommendation(
        title=value["title"],
        format=_as_str(value.get("format"), "short-form"),
        reason=_as_str(value.get("reason")),
        whyNotDuplicate=_as_str(value.get("whyNotDuplicate")),
        targetAudience=_as_str(value.get("targetAudience")),
        hashtags=_as_str_list(value.get("hashtags")),
        thumbnailIdea=_as_str(value.get("thumbnailIdea")),
        storyboard=_normalize_storyboard(value.get("storyboard")),
    )


def _parse_llm_recommendation(
    raw_text: str,
    selected_category: CreatorCategoryName,
) -> tuple[LlmRecommendationResponse, str | None]:
    try:
        parsed = json.loads(_extract_json_text(raw_text))
        if not isinstance(parsed, dict):
            raise ValueError("Root value is not an object.")
        recommendations = [
            item
            for value in parsed.get("recommendations", [])
            if (item := _normalize_recommendation(value)) is not None
        ] if isinstance(parsed.get("recommendations"), list) else []
        return (
            LlmRecommendationResponse(
                selectedCategory=_as_str(parsed.get("selectedCategory"), selected_category),
                summary=_as_str(parsed.get("summary")),
                recommendations=recommendations,
            ),
            None,
        )
    except Exception as error:
        return (
            LlmRecommendationResponse(
                selectedCategory=selected_category,
                summary="LLM 응답을 JSON으로 파싱하지 못했습니다. 원문 응답을 확인해야 합니다.",
                recommendations=[],
            ),
            str(error),
        )


async def _generate_content_recommendations(
    selected_category: CreatorCategoryName,
    channel: YouTubeChannelAnalysis,
    recent_videos: list[YouTubeVideoAnalysis],
    influencer_videos: list[YouTubeVideoAnalysis],
) -> tuple[LlmRecommendationResponse, str | None, str]:
    settings = get_settings()
    if not settings.local_llm_api_url:
        raise missing_env("LOCAL_LLM_API_URL")

    headers = {"Content-Type": "application/json"}
    if settings.local_llm_api_key:
        headers["Authorization"] = f"Bearer {settings.local_llm_api_key}"

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            settings.local_llm_api_url,
            headers=headers,
            json={
                "model": settings.local_llm_model,
                "temperature": 0.65,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Be-Celeb's Korean YouTube content strategist. Return only valid JSON that matches the requested schema.",
                    },
                    {
                        "role": "user",
                        "content": _build_llm_prompt(selected_category, channel, recent_videos, influencer_videos),
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

    recommendation, parse_error = _parse_llm_recommendation(raw_text, selected_category)
    return recommendation, parse_error, raw_text


async def _save_recommendation(
    channel_url: str,
    analysis: ChannelAnalysisResult,
    selected_category: CreatorCategoryName,
    recommendation: LlmRecommendationResponse,
    input_payload: dict[str, Any],
) -> PersistenceResult:
    try:
        analysis_rows = await _supabase_post(
            "user_channel_analyses?select=id",
            {
                "user_id": None,
                "channel_url": channel_url,
                "youtube_channel_id": analysis.channel.youtubeChannelId,
                "channel_title": analysis.channel.channelTitle,
                "selected_category": selected_category,
                "inferred_category": analysis.inferredCategory,
                "channel_data": analysis.channel.model_dump(mode="json"),
                "recent_videos": [video.model_dump(mode="json") for video in analysis.recentVideos],
            },
            "return=representation",
        )
        analysis_id = analysis_rows[0].get("id") if isinstance(analysis_rows, list) and analysis_rows else None
        if not isinstance(analysis_id, str):
            return PersistenceResult(error="Analysis insert did not return an id.")

        recommendation_rows = await _supabase_post(
            "content_recommendations?select=id",
            {
                "user_id": None,
                "analysis_id": analysis_id,
                "selected_category": selected_category,
                "input_payload": input_payload,
                "llm_response": recommendation.model_dump(mode="json"),
            },
            "return=representation",
        )
        recommendation_id = recommendation_rows[0].get("id") if isinstance(recommendation_rows, list) and recommendation_rows else None

        return PersistenceResult(
            analysisId=analysis_id,
            recommendationId=recommendation_id if isinstance(recommendation_id, str) else None,
            error=None if isinstance(recommendation_id, str) else "Recommendation insert did not return an id.",
        )
    except Exception as error:
        return PersistenceResult(error=str(error))


async def recommend_content(channel_url: str, category: str | None) -> RecommendationApiResult:
    if category and not _normalize_category(category):
        raise BackendApiError(
            f"category must be one of: {', '.join(CREATOR_CATEGORIES)}.",
            400,
            "VALIDATION_ERROR",
        )

    analysis = await analyze_channel_for_recommendation(channel_url)
    selected_category = _normalize_category(category) or analysis.inferredCategory
    influencer_videos = await _get_influencer_videos(selected_category)
    filtered_videos, duplicate_count = _filter_duplicate_influencer_videos(analysis.recentVideos, influencer_videos)
    recommendation, parse_error, raw_text = await _generate_content_recommendations(
        selected_category,
        analysis.channel,
        analysis.recentVideos,
        filtered_videos,
    )
    recommendation.selectedCategory = selected_category
    persistence = await _save_recommendation(
        channel_url=channel_url,
        analysis=analysis,
        selected_category=selected_category,
        recommendation=recommendation,
        input_payload={
            "channelUrl": channel_url,
            "requestedCategory": category,
            "selectedCategory": selected_category,
            "inferredCategory": analysis.inferredCategory,
            "influencerVideosUsed": len(filtered_videos),
            "duplicateVideosExcluded": duplicate_count,
            "llmRawText": raw_text,
            "llmParseError": parse_error,
        },
    )

    return RecommendationApiResult(
        **analysis.model_dump(),
        selectedCategory=selected_category,
        influencerVideosUsed=len(filtered_videos),
        duplicateVideosExcluded=duplicate_count,
        llmParseError=parse_error,
        recommendation=recommendation,
        persistence=persistence,
    )


def _to_video_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def _first_str(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _raw_snippet(row: dict[str, Any]) -> dict[str, Any]:
    raw = row.get("raw")
    return raw.get("snippet") if isinstance(raw, dict) and isinstance(raw.get("snippet"), dict) else {}


def _first_int(row: dict[str, Any], *keys: str) -> int:
    for key in keys:
        parsed = _as_int(row.get(key))
        if parsed is not None:
            return parsed
    return 0


def _first_tags(row: dict[str, Any]) -> list[str]:
    for value in (row.get("tags"), row.get("tag_list"), _raw_snippet(row).get("tags")):
        if isinstance(value, list):
            return [item for item in value if isinstance(item, str)]
        if isinstance(value, str):
            return [item.strip().lstrip("#") for item in re.split(r"[,#]", value) if item.strip()]
    return []


def _popular_video_id(row: dict[str, Any]) -> str:
    raw = row.get("raw")
    content_details = raw.get("contentDetails") if isinstance(raw, dict) and isinstance(raw.get("contentDetails"), dict) else {}
    resource_id = _raw_snippet(row).get("resourceId")
    resource_id = resource_id if isinstance(resource_id, dict) else {}
    return (
        _first_str(row, "youtube_video_id", "youtubeVideoId", "video_id", "videoId")
        or _as_str(content_details.get("videoId"))
        or _as_str(resource_id.get("videoId"))
    )


def _thumbnail_url_from_row(row: dict[str, Any]) -> str | None:
    direct = _first_str(row, "thumbnail_url", "thumbnailUrl", "thumbnail")
    if direct:
        return direct
    thumbnails = row.get("thumbnails")
    if isinstance(thumbnails, dict):
        thumbnail_url = _best_thumbnail_url(thumbnails)
        if thumbnail_url:
            return thumbnail_url
    snippet = _raw_snippet(row)
    raw_thumbnails = snippet.get("thumbnails") if isinstance(snippet, dict) else None
    return _best_thumbnail_url(raw_thumbnails) if isinstance(raw_thumbnails, dict) else None


def _popular_category(row: dict[str, Any], category_map: dict[str, str]) -> str:
    category_id = row.get("category_id") or row.get("categoryId")
    mapped = category_map.get(category_id) if isinstance(category_id, str) else None
    return mapped or _first_str(row, "category_name", "categoryName", "category", "creator_category", "creatorCategory") or "기타"


def _popular_video_from_row(row: dict[str, Any], category: str) -> PopularTrendVideo:
    video_id = _popular_video_id(row)
    snippet = _raw_snippet(row)
    return PopularTrendVideo(
        category=category or "기타",
        youtubeVideoId=video_id,
        title=_first_str(row, "title", "video_title") or _as_str(snippet.get("title"), "Untitled video"),
        description=_first_str(row, "description", "video_description") or _as_str(snippet.get("description")),
        thumbnailUrl=_as_str(row.get("thumbnail_url")) or _thumbnail_url_from_row(row),
        tags=_first_tags(row),
        viewCount=_first_int(row, "view_count", "viewCount", "views"),
        likeCount=_first_int(row, "like_count", "likeCount", "likes"),
        commentCount=_first_int(row, "comment_count", "commentCount", "comments"),
        publishedAt=_first_str(row, "published_at", "publishedAt", "published") or _as_str(snippet.get("publishedAt")) or None,
        youtubeUrl=_to_video_url(video_id) if video_id else "",
    )


async def _popular_video_rows() -> list[dict[str, Any]]:
    select_candidates = [
        (
            "canonical",
            "category_id,youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw",
        ),
        (
            "video_id_thumbnail_url",
            "category_id,video_id,published_at,title,description,thumbnail_url,tags,view_count,like_count,comment_count,raw",
        ),
        (
            "category_name",
            "category_name,category,youtube_video_id,published_at,title,description,thumbnail_url,tags,view_count,like_count,comment_count,raw",
        ),
        ("wildcard", "*"),
    ]

    for label, select_value in select_candidates:
        try:
            rows = await _supabase_get(
                "influencer_videos",
                {
                    "select": select_value,
                    "limit": "1000",
                },
            )
            return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
        except Exception as error:
            logger.warning("Popular videos query failed with select=%s: %s", label, error)
    return []


async def get_popular_videos_by_category() -> PopularVideosResponse:
    try:
        categories = await _supabase_get("creator_categories", {"select": "id,name"})
        category_map = {
            row["id"]: row["name"]
            for row in categories
            if isinstance(row, dict) and isinstance(row.get("id"), str) and isinstance(row.get("name"), str)
        } if isinstance(categories, list) else {}
    except Exception as error:
        logger.exception("Failed to load creator_categories for popular videos.")
        category_map = {}

    rows = await _popular_video_rows()

    best_by_category: dict[str, PopularTrendVideo] = {}

    for row in rows:
        video_id = _popular_video_id(row)
        if not video_id:
            logger.warning("Skipping popular video row without a YouTube video id.")
            continue
        category = _popular_category(row, category_map)
        try:
            normalized = _popular_video_from_row(row, category)
        except Exception as error:
            logger.warning("Failed to normalize popular video row: %s", error)
            continue
        current = best_by_category.get(category)
        current_score = (current.viewCount or 0, current.publishedAt or "")
        normalized_score = (normalized.viewCount or 0, normalized.publishedAt or "")
        if current is None or normalized_score > current_score:
            best_by_category[category] = normalized

    videos = sorted(best_by_category.values(), key=lambda video: (video.viewCount or 0, video.publishedAt or ""), reverse=True)
    return PopularVideosResponse(videos=videos)


def _start_of_day(value: datetime) -> datetime:
    return datetime(value.year, value.month, value.day, tzinfo=UTC)


def _start_of_week(value: datetime) -> datetime:
    day = value.weekday()
    return _start_of_day(value) - timedelta(days=day)


def _add_months(value: datetime, months: int) -> datetime:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    return datetime(year, month, 1, tzinfo=UTC)


def _period_config(range_value: TrendKeywordRange) -> tuple[datetime, list[str], Any]:
    now = datetime.now(UTC)
    if range_value == "weekly":
        current_week = _start_of_week(now)
        start = current_week - timedelta(weeks=7)
        periods = [(start + timedelta(weeks=index)).date().isoformat() for index in range(8)]
        return start, periods, lambda date: _start_of_week(date).date().isoformat()
    if range_value == "monthly":
        current_month = datetime(now.year, now.month, 1, tzinfo=UTC)
        start = _add_months(current_month, -5)
        periods = [_add_months(start, index).strftime("%Y-%m") for index in range(6)]
        return start, periods, lambda date: date.strftime("%Y-%m")

    today = _start_of_day(now)
    start = today - timedelta(days=13)
    periods = [(start + timedelta(days=index)).date().isoformat() for index in range(14)]
    return start, periods, lambda date: _start_of_day(date).date().isoformat()


def _normalize_keyword_tag(value: str) -> str:
    return value.strip().lstrip("#").strip().lower()


def _parse_datetime(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


async def get_keyword_trends(range_value: TrendKeywordRange) -> TrendKeywordsResponse:
    start, periods, get_period = _period_config(range_value)
    rows = await _supabase_get(
        "influencer_videos",
        {
            "select": "published_at,tags",
            "published_at": f"gte.{start.isoformat().replace('+00:00', 'Z')}",
        },
    )
    total_counts: Counter[str] = Counter()
    period_counts: dict[str, Counter[str]] = {period: Counter() for period in periods}

    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            published_at = _parse_datetime(_as_str(row.get("published_at")))
            tags = _as_str_list(row.get("tags"))
            if not published_at or not tags:
                continue
            period = get_period(published_at)
            if period not in period_counts:
                continue
            normalized_tags = {_normalize_keyword_tag(tag) for tag in tags if _normalize_keyword_tag(tag)}
            for tag in normalized_tags:
                total_counts[tag] += 1
                period_counts[period][tag] += 1

    top_keywords = [
        TrendKeywordCount(keyword=keyword, count=count)
        for keyword, count in sorted(total_counts.items(), key=lambda item: (-item[1], item[0]))[:TOP_KEYWORD_COUNT]
    ]
    series_keywords = [item.keyword for item in top_keywords[:SERIES_KEYWORD_COUNT]]
    series = [
        {"period": period, **{keyword: period_counts[period].get(keyword, 0) for keyword in series_keywords}}
        for period in periods
    ]

    return TrendKeywordsResponse(
        range=range_value,
        topKeywords=top_keywords,
        seriesKeywords=series_keywords,
        series=series,
    )
