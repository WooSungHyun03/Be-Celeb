# Provides Supabase-backed data for the public main page.
from __future__ import annotations

import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env
from app.schemas.main import MainResponse, SampleRecommendation, ServiceContent, ServiceStats, TrendSummary


def _normalize_supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers(count: bool = False) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")

    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if count:
        headers["Prefer"] = "count=exact"
    return headers


async def _get(
    path: str,
    params: dict[str, Any] | None = None,
    *,
    count: bool = False,
    limit: int | None = None,
) -> tuple[Any, httpx.Headers]:
    headers = _headers(count=count)
    if limit is not None:
        safe_limit = max(1, limit)
        headers["Range"] = f"0-{safe_limit - 1}"

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=headers,
            params=params,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )

    return (response.json() if response.text else None), response.headers


def _parse_count(headers: httpx.Headers) -> int:
    content_range = headers.get("content-range", "")
    match = re.search(r"/(\d+|\*)$", content_range)
    if match and match.group(1).isdigit():
        return int(match.group(1))
    return 0


async def _count(path: str, params: dict[str, Any] | None = None) -> int:
    _data, headers = await _get(
        path,
        {"select": "id", **(params or {})},
        count=True,
        limit=1,
    )
    return _parse_count(headers)


def _as_str(value: Any, fallback: str = "") -> str:
    return value if isinstance(value, str) and value.strip() else fallback


def _as_int(value: Any, fallback: int = 0) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return fallback


def _as_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _trend_direction(score: int) -> str:
    if score >= 85:
        return "rising"
    if score >= 70:
        return "stable"
    return "watch"


def _trend_from_row(row: dict[str, Any]) -> TrendSummary:
    score = max(0, min(100, _as_int(row.get("score"))))
    tags = _as_str_list(row.get("hashtags")) or _as_str_list(row.get("keywords"))

    return TrendSummary(
        id=_as_str(row.get("id"), _as_str(row.get("title"), "trend")),
        title=_as_str(row.get("title"), "Untitled trend"),
        description=_as_str(row.get("summary"), "최근 반응이 좋은 콘텐츠 트렌드입니다."),
        category=_as_str(row.get("category"), "general"),
        platforms=["YouTube"],
        score=score,
        growth_rate=max(3, min(45, score - 55)),
        direction=_trend_direction(score),
        tags=tags[:5],
        predicted_peak=None,
        created_at=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
    )


def _service_content_from_row(row: dict[str, Any]) -> ServiceContent:
    return ServiceContent(
        section=_as_str(row.get("section"), "content"),
        title=_as_str(row.get("title"), "서비스 콘텐츠"),
        description=_as_str(row.get("description"), "Be Celeb의 주요 기능을 소개합니다."),
        sort_order=_as_int(row.get("sort_order")),
    )


def _sample_from_row(row: dict[str, Any], trend_ids: list[str]) -> SampleRecommendation:
    hashtags = _as_str_list(row.get("hashtags"))
    category = _as_str(row.get("category"), "general")

    return SampleRecommendation(
        id=_as_str(row.get("id"), "sample"),
        title=_as_str(row.get("title"), "YouTube 콘텐츠 아이디어"),
        summary=_as_str(row.get("summary"), "채널 성향과 트렌드를 바탕으로 만든 샘플 추천입니다."),
        category=category,
        platforms=["YouTube"],
        priority="high",
        expected_score=86,
        hook_text=_as_str(row.get("hook"), "첫 3초에 결과를 먼저 보여주세요."),
        content_plan=[
            "결과 또는 반전 장면을 먼저 보여주기",
            "핵심 과정 2-3가지를 빠르게 전개하기",
            "댓글 질문으로 다음 행동 유도하기",
        ],
        hashtags=hashtags[:8],
        reason=f"{category} 카테고리의 반복 시청 패턴과 저장하기 좋은 구성에 맞춘 추천입니다.",
        steps=["채널 톤 확인", "트렌드 훅 선택", "콘티 작성"],
        related_trend_ids=trend_ids[:3],
        is_saved=False,
    )


FALLBACK_SERVICE_CONTENTS = [
    ServiceContent(
        section="hero",
        title="트렌드를 콘텐츠 아이디어로 바꾸는 가장 빠른 방법",
        description="Be Celeb은 채널 성향과 인기 영상 흐름을 분석해 다음 콘텐츠 방향을 제안합니다.",
        sort_order=1,
    ),
    ServiceContent(
        section="trend_analysis",
        title="지금 반응이 좋은 키워드를 분석합니다",
        description="카테고리별 인기 영상과 태그 흐름을 기반으로 실행 가능한 주제를 정리합니다.",
        sort_order=2,
    ),
    ServiceContent(
        section="recommendation",
        title="채널에 맞는 콘텐츠를 추천합니다",
        description="내 채널의 최근 업로드와 겹치지 않는 새 콘텐츠 아이디어를 생성합니다.",
        sort_order=3,
    ),
]

FALLBACK_TRENDS = [
    TrendSummary(
        id="fallback-trend-1",
        title="루틴형 콘텐츠",
        description="전후 차이를 명확하게 보여주는 루틴 콘텐츠가 꾸준히 반응을 얻고 있습니다.",
        category="lifestyle",
        platforms=["YouTube"],
        score=88,
        growth_rate=24,
        direction="rising",
        tags=["#루틴", "#콘텐츠아이디어", "#브이로그"],
    ),
    TrendSummary(
        id="fallback-trend-2",
        title="초보자 가이드",
        description="따라 하기 쉬운 단계형 가이드 콘텐츠가 검색과 저장 모두에 유리합니다.",
        category="education",
        platforms=["YouTube"],
        score=82,
        growth_rate=18,
        direction="stable",
        tags=["#초보자", "#가이드", "#팁"],
    ),
]

FALLBACK_SAMPLE = SampleRecommendation(
    id="fallback-sample-1",
    title="내 채널에서 바로 시도할 수 있는 30초 튜토리얼",
    summary="시청자가 바로 따라 할 수 있는 과정을 3단계로 정리한 콘텐츠 아이디어입니다.",
    category="general",
    platforms=["YouTube"],
    priority="high",
    expected_score=84,
    hook_text="이 방법 하나로 결과가 달라집니다.",
    content_plan=["완성 결과 먼저 보여주기", "핵심 단계 3개 설명", "댓글 질문으로 마무리"],
    hashtags=["#YouTube", "#콘텐츠아이디어", "#튜토리얼"],
    reason="저장과 반복 시청을 유도하기 좋은 구조입니다.",
    steps=["소재 선택", "촬영 컷 정리", "업로드 문구 작성"],
    related_trend_ids=["fallback-trend-1"],
    is_saved=False,
)


def _has_supabase_config() -> bool:
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_service_role_key)


def _fallback_response() -> MainResponse:
    return MainResponse(
        stats=ServiceStats(
            total_users=0,
            total_recommendations=0,
            active_trends_count=0,
        ),
        service_contents=FALLBACK_SERVICE_CONTENTS,
        popular_trends=FALLBACK_TRENDS,
        sample_recommendation=FALLBACK_SAMPLE,
    )


async def get_main_page_data() -> MainResponse:
    if not _has_supabase_config():
        return _fallback_response()

    stats = ServiceStats(
        total_users=await _count("profiles", {"is_deleted": "eq.false"}),
        total_recommendations=await _count("content_recommendations"),
        active_trends_count=await _count("trends", {"is_active": "eq.true"}),
    )

    service_rows, _service_headers = await _get(
        "service_contents",
        {
            "select": "section,title,description,sort_order",
            "is_active": "eq.true",
            "order": "sort_order.asc",
            "limit": "6",
        },
    )
    trend_rows, _trend_headers = await _get(
        "trends",
        {
            "select": "id,title,category,summary,score,keywords,hashtags,created_at",
            "is_active": "eq.true",
            "order": "score.desc,created_at.desc",
            "limit": "5",
        },
    )

    service_contents = [
        _service_content_from_row(row)
        for row in service_rows
        if isinstance(row, dict)
    ] if isinstance(service_rows, list) else []
    popular_trends = [
        _trend_from_row(row)
        for row in trend_rows
        if isinstance(row, dict)
    ] if isinstance(trend_rows, list) else []

    sample_rows, _sample_headers = await _get(
        "sample_recommendations",
        {
            "select": "id,title,category,hook,hashtags,summary",
            "is_active": "eq.true",
            "order": "sort_order.asc,created_at.desc",
            "limit": "1",
        },
    )
    sample_row = sample_rows[0] if isinstance(sample_rows, list) and sample_rows and isinstance(sample_rows[0], dict) else None

    return MainResponse(
        stats=stats,
        service_contents=service_contents or FALLBACK_SERVICE_CONTENTS,
        popular_trends=popular_trends or FALLBACK_TRENDS,
        sample_recommendation=_sample_from_row(sample_row, [trend.id for trend in popular_trends]) if sample_row else FALLBACK_SAMPLE,
    )
