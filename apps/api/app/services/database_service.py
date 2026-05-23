# Provides Supabase persistence helpers for the two-step recommendation flow.
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.schemas.youtube_content import (
    ContentPlan,
    CreatorCategoryName,
    RecommendationDetailResponse,
    RecommendationFieldOptions,
    RecommendationOption,
    RecommendationResponseChannel,
    SingleContentRecommendation,
    StoryboardScene,
    YouTubeChannelAnalysis,
    YouTubeVideoAnalysis,
)
from app.services.youtube_content_service import _as_int, _as_str, _as_str_list, _thumbnail_map


@dataclass
class StoredChannelAnalysis:
    analysis_id: str
    channel_url: str
    selected_category: CreatorCategoryName
    inferred_category: CreatorCategoryName | None
    channel: YouTubeChannelAnalysis
    recent_videos: list[YouTubeVideoAnalysis]


def _normalize_supabase_url() -> str:
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
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def _in_filter(values: list[str]) -> str:
    return f"in.({','.join(values)})"


async def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=_headers(),
            params=params,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )
    return response.json()


async def _post(path: str, payload: Any, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=_headers(prefer),
            json=payload,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )
    return response.json() if response.text else None


async def _get_category_id(category_name: CreatorCategoryName) -> str:
    rows = await _get(
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


async def fetch_category_videos(category_name: CreatorCategoryName) -> list[YouTubeVideoAnalysis]:
    category_id = await _get_category_id(category_name)
    video_id_rows: list[dict[str, Any]] = []
    try:
        linked_rows = await _get(
            "influencer_video_categories",
            {
                "select": "influencer_video_id",
                "category_id": f"eq.{category_id}",
                "limit": "80",
            },
        )
        video_ids = [
            row["influencer_video_id"]
            for row in linked_rows
            if isinstance(row, dict) and isinstance(row.get("influencer_video_id"), str)
        ] if isinstance(linked_rows, list) else []
        if video_ids:
            video_id_rows = await _get(
                "influencer_videos",
                {
                    "select": "youtube_video_id,youtube_channel_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw",
                    "id": _in_filter(video_ids),
                    "order": "published_at.desc",
                    "limit": "40",
                },
            )
    except Exception:
        video_id_rows = []

    if isinstance(video_id_rows, list) and video_id_rows:
        return [_video_from_row(row) for row in video_id_rows if isinstance(row, dict)]

    rows = await _get(
        "influencer_videos",
        {
            "select": "youtube_video_id,youtube_channel_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count,raw",
            "category_id": f"eq.{category_id}",
            "order": "published_at.desc",
            "limit": "40",
        },
    )
    return [_video_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def save_channel_analysis(
    channel_url: str,
    requested_category: str | None,
    selected_category: CreatorCategoryName,
    inferred_category: CreatorCategoryName,
    channel: YouTubeChannelAnalysis,
    recent_videos: list[YouTubeVideoAnalysis],
    user_id: str | None = None,
) -> str:
    rows = await _post(
        "user_channel_analyses?select=id",
        {
            "user_id": user_id,
            "channel_url": channel_url,
            "youtube_channel_id": channel.youtubeChannelId,
            "channel_title": channel.channelTitle,
            "selected_category": selected_category,
            "inferred_category": inferred_category,
            "channel_data": {
                **channel.model_dump(mode="json"),
                "requestedCategory": requested_category,
            },
            "recent_videos": [video.model_dump(mode="json") for video in recent_videos],
        },
        "return=representation",
    )
    analysis_id = rows[0].get("id") if isinstance(rows, list) and rows else None
    if not isinstance(analysis_id, str):
        raise BackendApiError("Analysis insert did not return an id.", 502, "SUPABASE_ERROR")
    return analysis_id


async def save_recommendation_options(
    analysis_id: str,
    selected_category: CreatorCategoryName,
    options: list[RecommendationOption],
    raw: dict[str, Any],
) -> str | None:
    try:
        rows = [
            {
                "analysis_id": analysis_id,
                "option_id": option.optionId,
                "selected_category": selected_category,
                "option_payload": option.model_dump(mode="json"),
                "raw": raw,
            }
            for option in options
        ]
        await _post("recommendation_options", rows)
        return None
    except Exception as error:
        return str(error)


async def fetch_channel_analysis(analysis_id: str) -> StoredChannelAnalysis:
    rows = await _get(
        "user_channel_analyses",
        {
            "select": "id,channel_url,selected_category,inferred_category,channel_data,recent_videos",
            "id": f"eq.{analysis_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Channel analysis not found.", 404, "NOT_FOUND")

    channel_data = row.get("channel_data") if isinstance(row.get("channel_data"), dict) else {}
    recent_video_rows = row.get("recent_videos") if isinstance(row.get("recent_videos"), list) else []
    selected_category = row.get("selected_category")
    if selected_category not in {"게임", "운동", "IT", "노래", "OTT", "일상", "뷰티", "스터디", "코미디", "먹방", "춤"}:
        raise BackendApiError("Stored channel analysis is missing selectedCategory.", 500, "SUPABASE_ERROR")

    return StoredChannelAnalysis(
        analysis_id=analysis_id,
        channel_url=_as_str(row.get("channel_url")),
        selected_category=selected_category,
        inferred_category=row.get("inferred_category") if isinstance(row.get("inferred_category"), str) else None,
        channel=YouTubeChannelAnalysis.model_validate(channel_data),
        recent_videos=[YouTubeVideoAnalysis.model_validate(video) for video in recent_video_rows if isinstance(video, dict)],
    )


async def save_content_plan(
    analysis: StoredChannelAnalysis,
    selected_option_id: str,
    option_payload: dict[str, Any],
    plan: ContentPlan,
    raw: dict[str, Any],
) -> str | None:
    try:
        await _post(
            "content_recommendations",
            {
                "user_id": None,
                "analysis_id": analysis.analysis_id,
                "selected_category": analysis.selected_category,
                "input_payload": {
                    "selectedOptionId": selected_option_id,
                    "option": option_payload,
                },
                "llm_response": {
                    "plan": plan.model_dump(mode="json"),
                    "raw": raw,
                },
            },
        )
        return None
    except Exception as error:
        return str(error)


async def save_single_content_recommendation(
    analysis_id: str,
    user_id: str | None,
    selected_category: CreatorCategoryName,
    input_payload: dict[str, Any],
    llm_response: dict[str, Any],
) -> str | None:
    try:
        rows = await _post(
            "content_recommendations?select=id",
            {
                "user_id": user_id,
                "analysis_id": analysis_id,
                "selected_category": selected_category,
                "input_payload": input_payload,
                "llm_response": llm_response,
            },
            "return=representation",
        )
        recommendation_id = rows[0].get("id") if isinstance(rows, list) and rows else None
        return recommendation_id if isinstance(recommendation_id, str) else None
    except Exception:
        return None


def _storyboard_scene_from_value(value: dict[str, Any], index: int) -> StoryboardScene:
    return StoryboardScene(
        scene=value.get("scene") if isinstance(value.get("scene"), int) else index + 1,
        duration=_as_str(value.get("duration"), f"{index * 5}-{index * 5 + 5}s"),
        visual=_as_str(value.get("visual"), _as_str(value.get("description"))),
        dialogue=_as_str(value.get("dialogue")),
        caption=_as_str(value.get("caption")),
        shootingTip=_as_str(value.get("shootingTip")),
        description=_as_str(value.get("description")),
    )


def _single_recommendation_from_row(row: dict[str, Any]) -> SingleContentRecommendation:
    llm_response = row.get("llm_response") if isinstance(row.get("llm_response"), dict) else {}
    raw_recommendation = llm_response.get("recommendation") if isinstance(llm_response.get("recommendation"), dict) else {}
    storyboard_values = raw_recommendation.get("storyboard") if isinstance(raw_recommendation.get("storyboard"), list) else []
    storyboard = [
        _storyboard_scene_from_value(scene, index)
        for index, scene in enumerate(storyboard_values)
        if isinstance(scene, dict)
    ]
    return SingleContentRecommendation(
        title=_as_str(raw_recommendation.get("title"), "콘텐츠 추천 결과"),
        format=_as_str(raw_recommendation.get("format"), "YouTube"),
        hashtags=_as_str_list(raw_recommendation.get("hashtags")),
        thumbnailIdea=_as_str(raw_recommendation.get("thumbnailIdea")),
        targetAudience=_as_str(raw_recommendation.get("targetAudience")),
        hook=_as_str(raw_recommendation.get("hook")),
        reason=_as_str(raw_recommendation.get("reason"), "채널 분석과 카테고리 데이터를 기반으로 추천했습니다."),
        whyNotDuplicate=_as_str(raw_recommendation.get("whyNotDuplicate")),
        storyboard=storyboard,
        uploadTips=_as_str_list(raw_recommendation.get("uploadTips")),
    )


def _recommendation_options_from_row(row: dict[str, Any]) -> RecommendationFieldOptions:
    llm_response = row.get("llm_response") if isinstance(row.get("llm_response"), dict) else {}
    input_payload = row.get("input_payload") if isinstance(row.get("input_payload"), dict) else {}
    value = llm_response.get("options") if isinstance(llm_response.get("options"), dict) else input_payload.get("options")
    if isinstance(value, dict):
        return RecommendationFieldOptions.model_validate(value)
    return RecommendationFieldOptions()


async def fetch_content_recommendation_detail(
    recommendation_id: str,
    requester_user_id: str | None = None,
) -> RecommendationDetailResponse:
    rows = await _get(
        "content_recommendations",
        {
            "select": "id,user_id,analysis_id,selected_category,input_payload,llm_response,created_at",
            "id": f"eq.{recommendation_id}",
            "limit": "1",
        },
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Recommendation not found.", 404, "NOT_FOUND")

    owner_user_id = row.get("user_id") if isinstance(row.get("user_id"), str) else None
    if owner_user_id and owner_user_id != requester_user_id:
        raise BackendApiError("You do not have access to this recommendation.", 403, "FORBIDDEN")

    selected_category = row.get("selected_category")
    if selected_category not in {"게임", "운동", "IT", "노래", "OTT", "일상", "뷰티", "스터디", "코미디", "먹방", "춤"}:
        raise BackendApiError("Stored recommendation is missing selectedCategory.", 500, "SUPABASE_ERROR")

    analysis = await fetch_channel_analysis(_as_str(row.get("analysis_id")))

    return RecommendationDetailResponse(
        recommendationId=recommendation_id,
        analysisId=analysis.analysis_id,
        selectedCategory=selected_category,
        channel=RecommendationResponseChannel(
            youtubeChannelId=analysis.channel.youtubeChannelId,
            title=analysis.channel.channelTitle,
            channelUrl=analysis.channel_url,
            thumbnailUrl=analysis.channel.thumbnailUrl,
        ),
        recommendation=_single_recommendation_from_row(row),
        options=_recommendation_options_from_row(row),
        createdAt=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
    )
