from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable, cast

import httpx

from app.common.datetime import kst_now, utc_now
from app.common.text import normalize_tag, normalize_text
from app.core.config import get_settings
from app.core.exceptions import BadRequestException, BackendApiError, ExternalAPIException, NotFoundException, missing_env
from app.core.logging import get_logger
from app.domains.trends.schemas import (
    CombinedTrendKeywordScore,
    CombinedTrendTag,
    CombinedTrendVideo,
    CombinedTrendsResponse,
    NaverCollectionSummary,
    NaverTrendKeywordsResponse,
    NaverTrendSeriesPoint,
    NaverTrendTopKeyword,
    TrendRange,
)
from app.services.youtube_content_service import (
    get_keyword_trends as get_youtube_keyword_trends,
    get_popular_videos_by_category,
)

logger = get_logger(__name__)

NAVER_DATALAB_URL = "https://openapi.naver.com/v1/datalab/search"
NAVER_DATALAB_JOB_NAME = "naver_datalab_daily_collection"
NAVER_DATALAB_SCHEDULE_TEXT = "Every day 06:00 KST"
NAVER_DATALAB_TIME_UNIT = "date"
NAVER_DATALAB_LOOKBACK_DAYS = 30
NAVER_DATALAB_MAX_GROUPS_PER_REQUEST = 5
TOP_NAVER_KEYWORD_COUNT = 10
SERIES_NAVER_KEYWORD_COUNT = 5
TOP_YOUTUBE_TAG_COUNT = 10
TOP_YOUTUBE_VIDEO_COUNT = 10

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
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _supabase_request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.request(
            method,
            f"{_normalize_supabase_url()}/rest/v1/{path}",
            headers=_supabase_headers(prefer),
            params=params,
            json=payload,
        )

    if response.status_code >= 400:
        raise BackendApiError(
            f"Supabase request failed: {response.text}",
            502 if response.status_code >= 500 else response.status_code,
            "SUPABASE_ERROR",
        )

    return response.json() if response.text else None


async def _supabase_get(path: str, params: dict[str, Any] | None = None) -> Any:
    return await _supabase_request("GET", path, params=params)


async def _supabase_post(path: str, payload: Any, prefer: str | None = "return=representation") -> Any:
    return await _supabase_request("POST", path, payload=payload, prefer=prefer)


async def _supabase_patch(path: str, params: dict[str, Any], payload: dict[str, Any], prefer: str | None = "return=representation") -> Any:
    return await _supabase_request("PATCH", path, params=params, payload=payload, prefer=prefer)


async def _supabase_delete(path: str, params: dict[str, Any], prefer: str | None = "return=representation") -> Any:
    return await _supabase_request("DELETE", path, params=params, prefer=prefer)


def _first_row(rows: Any, message: str = "Requested row was not found.") -> dict[str, Any]:
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        return rows[0]
    raise NotFoundException(message)


def _iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _clean_text(value: str | None) -> str:
    return (value or "").strip()


def _clean_keywords(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        item = _clean_text(value)
        key = normalize_text(item)
        if not item or key in seen:
            continue
        seen.add(key)
        cleaned.append(item)
    if not cleaned:
        raise BadRequestException("At least one keyword is required.", "VALIDATION_ERROR")
    return cleaned


def _as_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _as_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _as_float(value: Any) -> float:
    try:
        return round(float(value), 4)
    except (TypeError, ValueError):
        return 0.0


def _as_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _thumbnail_url(thumbnails: Any) -> str | None:
    if not isinstance(thumbnails, dict):
        return None
    for key in ("maxres", "standard", "high", "medium", "default"):
        item = thumbnails.get(key)
        if isinstance(item, dict) and isinstance(item.get("url"), str):
            return item["url"]
    return None


def _video_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def _in_filter(values: list[str]) -> str:
    return f"in.({','.join(values)})"


def _chunked(items: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def _collection_window() -> tuple[date, date]:
    end_date = kst_now().date() - timedelta(days=1)
    start_date = end_date - timedelta(days=NAVER_DATALAB_LOOKBACK_DAYS - 1)
    return start_date, end_date


def _require_naver_credentials() -> None:
    settings = get_settings()
    if not settings.naver_client_id:
        raise missing_env("NAVER_CLIENT_ID")
    if not settings.naver_client_secret:
        raise missing_env("NAVER_CLIENT_SECRET")


def _range_start(range_value: TrendRange) -> date:
    today = kst_now().date()
    if range_value == "weekly":
        current_week = today - timedelta(days=today.weekday())
        return current_week - timedelta(weeks=7)
    if range_value == "monthly":
        month_index = today.month - 1 - 11
        year = today.year + month_index // 12
        month = month_index % 12 + 1
        return date(year, month, 1)
    return today - timedelta(days=30)


def _period_key(value: date, range_value: TrendRange) -> str:
    if range_value == "weekly":
        return (value - timedelta(days=value.weekday())).isoformat()
    if range_value == "monthly":
        return value.strftime("%Y-%m")
    return value.isoformat()


async def _category_id_for_name(category_name: str) -> str | None:
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
    return None


def _group_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "categoryId": row.get("category_id"),
        "categoryName": row.get("category_name"),
        "title": row.get("title"),
        "keywords": row.get("keywords") if isinstance(row.get("keywords"), list) else [],
        "isActive": bool(row.get("is_active")),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


async def list_naver_keyword_groups(category_name: str | None = None, active: bool | None = None) -> dict[str, Any]:
    params: dict[str, Any] = {
        "select": "id,category_id,category_name,title,keywords,is_active,created_at,updated_at",
        "order": "category_name.asc,title.asc",
    }
    if category_name:
        params["category_name"] = f"eq.{category_name}"
    if active is not None:
        params["is_active"] = f"eq.{str(active).lower()}"

    rows = await _supabase_get("naver_trend_keyword_groups", params)
    groups = [_group_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return {"groups": groups}


async def create_naver_keyword_group(payload: dict[str, Any]) -> dict[str, Any]:
    category_name = _clean_text(payload.get("category_name"))
    title = _clean_text(payload.get("title"))
    if not category_name or not title:
        raise BadRequestException("categoryName and title are required.", "VALIDATION_ERROR")

    category_id = _clean_text(payload.get("category_id")) or await _category_id_for_name(category_name)
    row_payload = {
        "category_id": category_id,
        "category_name": category_name,
        "title": title,
        "keywords": _clean_keywords(payload.get("keywords") or []),
        "is_active": bool(payload.get("is_active", True)),
    }
    row = _first_row(await _supabase_post("naver_trend_keyword_groups", row_payload))
    return {"group": _group_from_row(row)}


async def update_naver_keyword_group(group_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    patch: dict[str, Any] = {}
    category_name = _clean_text(payload.get("category_name")) if "category_name" in payload else ""
    if category_name:
        patch["category_name"] = category_name
        patch["category_id"] = _clean_text(payload.get("category_id")) or await _category_id_for_name(category_name)
    elif "category_id" in payload:
        patch["category_id"] = _clean_text(payload.get("category_id")) or None
    if "title" in payload:
        title = _clean_text(payload.get("title"))
        if not title:
            raise BadRequestException("title is required.", "VALIDATION_ERROR")
        patch["title"] = title
    if "keywords" in payload:
        patch["keywords"] = _clean_keywords(payload.get("keywords") or [])
    if "is_active" in payload:
        patch["is_active"] = bool(payload.get("is_active"))
    if not patch:
        raise BadRequestException("No fields to update.", "VALIDATION_ERROR")
    patch["updated_at"] = _iso_utc(utc_now())

    row = _first_row(await _supabase_patch("naver_trend_keyword_groups", {"id": f"eq.{group_id}"}, patch))
    return {"group": _group_from_row(row)}


async def delete_naver_keyword_group(group_id: str) -> dict[str, Any]:
    rows = await _supabase_delete("naver_trend_keyword_groups", {"id": f"eq.{group_id}"})
    return {"deleted": len(rows) if isinstance(rows, list) else 0}


async def list_naver_collection_logs(limit: int = 20, offset: int = 0) -> dict[str, Any]:
    rows = await _supabase_get(
        "naver_trend_collection_logs",
        {
            "select": "id,job_name,started_at,finished_at,status,summary,error_message,created_at",
            "order": "started_at.desc",
            "limit": str(limit),
            "offset": str(offset),
        },
    )
    return {"logs": rows if isinstance(rows, list) else [], "limit": limit, "offset": offset}


async def _start_naver_collection_log(started_at: str) -> str | None:
    try:
        row = _first_row(
            await _supabase_post(
                "naver_trend_collection_logs",
                {
                    "job_name": NAVER_DATALAB_JOB_NAME,
                    "started_at": started_at,
                    "status": "running",
                    "summary": {},
                },
            )
        )
        return row.get("id") if isinstance(row.get("id"), str) else None
    except Exception as error:
        logger.warning("Failed to create Naver trend collection log: %s", error)
        return None


async def _finish_naver_collection_log(
    log_id: str | None,
    status: str,
    summary: dict[str, Any],
    error_message: str | None = None,
) -> None:
    if not log_id:
        return
    try:
        await _supabase_patch(
            "naver_trend_collection_logs",
            {"id": f"eq.{log_id}"},
            {
                "finished_at": _iso_utc(utc_now()),
                "status": status,
                "summary": summary,
                "error_message": error_message,
            },
            prefer="return=minimal",
        )
    except Exception as error:
        logger.warning("Failed to finish Naver trend collection log: %s", error)


async def _fetch_naver_datalab(groups: list[dict[str, Any]], start_date: date, end_date: date) -> dict[str, Any]:
    settings = get_settings()
    _require_naver_credentials()

    keyword_groups = []
    for group in groups:
        title = _clean_text(cast(str | None, group.get("title")))
        keywords = _clean_keywords(cast(list[str], group.get("keywords") or []))
        keyword_groups.append({"groupName": title, "keywords": keywords})

    payload = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "timeUnit": NAVER_DATALAB_TIME_UNIT,
        "keywordGroups": keyword_groups,
    }
    headers = {
        "X-Naver-Client-Id": settings.naver_client_id,
        "X-Naver-Client-Secret": settings.naver_client_secret,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(NAVER_DATALAB_URL, headers=headers, json=payload)

    if response.status_code >= 400:
        raise ExternalAPIException(f"Naver DataLab API request failed ({response.status_code}): {response.text[:500]}")

    data = response.json()
    if not isinstance(data, dict):
        raise ExternalAPIException("Naver DataLab API returned an invalid response.")
    return data


def _point_rows_from_response(
    groups: list[dict[str, Any]],
    response: dict[str, Any],
    start_date: date,
    end_date: date,
    collected_at: str,
) -> list[dict[str, Any]]:
    groups_by_title = {
        str(group.get("title")): group
        for group in groups
        if isinstance(group.get("title"), str) and isinstance(group.get("id"), str)
    }
    rows: list[dict[str, Any]] = []
    results = response.get("results")
    if not isinstance(results, list):
        return rows

    for result in results:
        if not isinstance(result, dict):
            continue
        title = str(result.get("title") or "")
        group = groups_by_title.get(title)
        data_points = result.get("data")
        if not group or not isinstance(data_points, list):
            continue

        for point in data_points:
            if not isinstance(point, dict):
                continue
            period = _as_date(point.get("period"))
            if not period:
                continue
            rows.append(
                {
                    "group_id": group.get("id"),
                    "category_name": group.get("category_name"),
                    "keyword_group_title": group.get("title"),
                    "period": period.isoformat(),
                    "ratio": _as_float(point.get("ratio")),
                    "time_unit": NAVER_DATALAB_TIME_UNIT,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "raw": {
                        "title": result.get("title"),
                        "keywords": result.get("keywords"),
                        "point": point,
                        "request": {
                            "startDate": start_date.isoformat(),
                            "endDate": end_date.isoformat(),
                            "timeUnit": NAVER_DATALAB_TIME_UNIT,
                        },
                    },
                    "collected_at": collected_at,
                }
            )
    return rows


async def collect_naver_trends() -> NaverCollectionSummary:
    started_at = _iso_utc(utc_now())
    collected_at = started_at
    start_date, end_date = _collection_window()
    log_id = await _start_naver_collection_log(started_at)
    errors: list[dict[str, Any]] = []
    points_upserted = 0

    try:
        _require_naver_credentials()
        active_groups_result = await list_naver_keyword_groups(active=True)
        active_groups = [
            group
            for group in active_groups_result["groups"]
            if isinstance(group.get("id"), str) and isinstance(group.get("title"), str)
        ]
        groups_by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for group in active_groups:
            groups_by_category[str(group.get("categoryName") or group.get("category_name") or "미분류")].append(
                {
                    "id": group.get("id"),
                    "category_id": group.get("categoryId"),
                    "category_name": group.get("categoryName"),
                    "title": group.get("title"),
                    "keywords": group.get("keywords") if isinstance(group.get("keywords"), list) else [],
                }
            )

        for category_name, groups in groups_by_category.items():
            for group_chunk in _chunked(groups, NAVER_DATALAB_MAX_GROUPS_PER_REQUEST):
                try:
                    response = await _fetch_naver_datalab(group_chunk, start_date, end_date)
                    rows = _point_rows_from_response(group_chunk, response, start_date, end_date, collected_at)
                    if rows:
                        await _supabase_post(
                            "naver_trend_daily_points?on_conflict=group_id,period,time_unit",
                            rows,
                            prefer="resolution=merge-duplicates,return=minimal",
                        )
                        points_upserted += len(rows)
                except Exception as error:
                    logger.exception("Naver trend collection failed for category %s", category_name)
                    errors.append(
                        {
                            "category": category_name,
                            "groups": [str(group.get("title")) for group in group_chunk],
                            "message": str(error),
                        }
                    )

        summary = NaverCollectionSummary(
            collectedAt=collected_at,
            startDate=start_date.isoformat(),
            endDate=end_date.isoformat(),
            timeUnit=NAVER_DATALAB_TIME_UNIT,
            categoriesChecked=len(groups_by_category),
            groupsChecked=len(active_groups),
            pointsUpserted=points_upserted,
            errors=errors,
        )
        await _finish_naver_collection_log(
            log_id,
            "partial_success" if errors else "success",
            summary.model_dump(mode="json"),
            f"{len(errors)} group batch(es) failed." if errors else None,
        )
        return summary
    except Exception as error:
        await _finish_naver_collection_log(log_id, "failed", {}, str(error))
        raise


async def _naver_daily_rows(category: str, range_value: TrendRange) -> list[dict[str, Any]]:
    start = _range_start(range_value)
    params: dict[str, Any] = {
        "select": "period,ratio,category_name,keyword_group_title,group_id",
        "period": f"gte.{start.isoformat()}",
        "order": "period.asc",
    }
    if category:
        params["category_name"] = f"eq.{category}"

    rows = await _supabase_get("naver_trend_daily_points", params)
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def _aggregate_naver_rows(rows: list[dict[str, Any]], category: str, range_value: TrendRange) -> NaverTrendKeywordsResponse:
    values: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        period = _as_date(row.get("period"))
        title = _clean_text(row.get("keyword_group_title") if isinstance(row.get("keyword_group_title"), str) else None)
        if not period or not title:
            continue
        values[_period_key(period, range_value)][title].append(_as_float(row.get("ratio")))

    period_values: dict[str, dict[str, float]] = {}
    for period, title_values in values.items():
        period_values[period] = {
            title: round(sum(ratios) / len(ratios), 2)
            for title, ratios in title_values.items()
            if ratios
        }

    periods = sorted(period_values)
    keyword_values: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for period in periods:
        for keyword, ratio in period_values[period].items():
            keyword_values[keyword].append((period, ratio))

    ranked_keywords = sorted(
        keyword_values.items(),
        key=lambda item: (-(sum(value for _period, value in item[1]) / max(len(item[1]), 1)), item[0]),
    )
    top_keywords: list[NaverTrendTopKeyword] = []
    for keyword, entries in ranked_keywords[:TOP_NAVER_KEYWORD_COUNT]:
        latest_period, latest_ratio = max(entries, key=lambda item: item[0])
        previous_entries = [entry for entry in entries if entry[0] < latest_period]
        previous_ratio = max(previous_entries, key=lambda item: item[0])[1] if previous_entries else latest_ratio
        average_ratio = round(sum(value for _period, value in entries) / max(len(entries), 1), 2)
        top_keywords.append(
            NaverTrendTopKeyword(
                keyword=keyword,
                ratio=average_ratio,
                trendDelta=round(latest_ratio - previous_ratio, 2),
            )
        )

    series_keywords = [item.keyword for item in top_keywords[:SERIES_NAVER_KEYWORD_COUNT]]
    series = [
        NaverTrendSeriesPoint(
            period=period,
            **{keyword: period_values[period].get(keyword, 0) for keyword in series_keywords},
        )
        for period in periods
    ]

    return NaverTrendKeywordsResponse(
        category=category,
        range=range_value,
        topKeywords=top_keywords,
        seriesKeywords=series_keywords,
        series=series,
    )


async def get_naver_trend_keywords(category: str, range_value: TrendRange) -> NaverTrendKeywordsResponse:
    rows = await _naver_daily_rows(category, range_value)
    return _aggregate_naver_rows(rows, category, range_value)


async def _category_id_map() -> dict[str, str]:
    rows = await _supabase_get("creator_categories", {"select": "id,name"})
    return {
        row["name"]: row["id"]
        for row in rows
        if isinstance(row, dict) and isinstance(row.get("id"), str) and isinstance(row.get("name"), str)
    } if isinstance(rows, list) else {}


async def _youtube_rows_for_category(category: str, range_value: TrendRange) -> list[dict[str, Any]]:
    category_map = await _category_id_map()
    category_id = category_map.get(category)
    if not category_id:
        return []

    start = datetime.combine(_range_start(range_value), datetime.min.time(), tzinfo=timezone.utc)
    try:
        linked_rows = await _supabase_get(
            "influencer_video_categories",
            {
                "select": "influencer_video_id",
                "category_id": f"eq.{category_id}",
                "limit": "1000",
            },
        )
        video_ids = [
            row["influencer_video_id"]
            for row in linked_rows
            if isinstance(row, dict) and isinstance(row.get("influencer_video_id"), str)
        ] if isinstance(linked_rows, list) else []
        if video_ids:
            rows = await _supabase_get(
                "influencer_videos",
                {
                    "select": "youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count",
                    "id": _in_filter(video_ids),
                    "published_at": f"gte.{_iso_utc(start)}",
                    "order": "view_count.desc.nullslast,published_at.desc",
                    "limit": "1000",
                },
            )
            return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    except Exception as error:
        logger.warning("Combined trends video-category join query failed category=%s: %s", category, error)

    rows = await _supabase_get(
        "influencer_videos",
        {
            "select": "youtube_video_id,published_at,title,description,thumbnails,tags,view_count,like_count,comment_count",
            "category_id": f"eq.{category_id}",
            "published_at": f"gte.{_iso_utc(start)}",
            "order": "view_count.desc.nullslast,published_at.desc",
            "limit": "1000",
        },
    )
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def _youtube_blocks(rows: list[dict[str, Any]]) -> tuple[list[CombinedTrendTag], list[CombinedTrendVideo], dict[str, dict[str, int]]]:
    tag_counts: Counter[str] = Counter()
    tag_views: Counter[str] = Counter()
    tag_display: dict[str, str] = {}

    for row in rows:
        tags = row.get("tags") if isinstance(row.get("tags"), list) else []
        view_count = _as_int(row.get("view_count"))
        normalized_tags = {normalize_tag(tag) for tag in tags if isinstance(tag, str) and normalize_tag(tag)}
        for normalized in normalized_tags:
            tag_counts[normalized] += 1
            tag_views[normalized] += view_count
            tag_display.setdefault(normalized, normalized)

    top_tags = [
        CombinedTrendTag(keyword=tag_display.get(tag, tag), count=count, views=tag_views[tag])
        for tag, count in sorted(tag_counts.items(), key=lambda item: (-item[1], -tag_views[item[0]], item[0]))[:TOP_YOUTUBE_TAG_COUNT]
    ]

    top_videos: list[CombinedTrendVideo] = []
    for row in sorted(rows, key=lambda item: (_as_int(item.get("view_count")), _as_datetime(item.get("published_at")) or datetime.min.replace(tzinfo=timezone.utc)), reverse=True)[
        :TOP_YOUTUBE_VIDEO_COUNT
    ]:
        video_id = str(row.get("youtube_video_id") or "")
        if not video_id:
            continue
        top_videos.append(
            CombinedTrendVideo(
                youtubeVideoId=video_id,
                title=str(row.get("title") or "Untitled video"),
                youtubeUrl=_video_url(video_id),
                thumbnailUrl=_thumbnail_url(row.get("thumbnails")),
                viewCount=_as_int(row.get("view_count")),
                publishedAt=row.get("published_at") if isinstance(row.get("published_at"), str) else None,
                tags=[tag for tag in row.get("tags", []) if isinstance(tag, str)] if isinstance(row.get("tags"), list) else [],
            )
        )

    metrics = {
        tag: {
            "count": tag_counts[tag],
            "views": tag_views[tag],
        }
        for tag in tag_counts
    }
    return top_tags, top_videos, metrics


def _combined_scores(naver: NaverTrendKeywordsResponse, youtube_metrics: dict[str, dict[str, int]]) -> list[CombinedTrendKeywordScore]:
    naver_by_keyword = {normalize_text(item.keyword): item.ratio for item in naver.topKeywords}
    all_keywords = sorted(set(naver_by_keyword) | set(youtube_metrics))
    max_count = max((value["count"] for value in youtube_metrics.values()), default=0)
    max_views = max((value["views"] for value in youtube_metrics.values()), default=0)
    max_naver = max(naver_by_keyword.values(), default=0)
    scores: list[CombinedTrendKeywordScore] = []

    for normalized in all_keywords:
        youtube_count = youtube_metrics.get(normalized, {}).get("count", 0)
        youtube_views = youtube_metrics.get(normalized, {}).get("views", 0)
        naver_ratio = naver_by_keyword.get(normalized, 0.0)
        normalized_youtube_count = (youtube_count / max_count * 100) if max_count else 0.0
        normalized_youtube_views = (youtube_views / max_views * 100) if max_views else 0.0
        normalized_naver_ratio = (naver_ratio / max_naver * 100) if max_naver else 0.0
        score = normalized_youtube_count * 0.4 + normalized_youtube_views * 0.3 + normalized_naver_ratio * 0.3
        display_keyword = next((item.keyword for item in naver.topKeywords if normalize_text(item.keyword) == normalized), normalized)
        scores.append(
            CombinedTrendKeywordScore(
                keyword=display_keyword,
                score=round(score, 2),
                youtubeCount=youtube_count,
                youtubeViews=youtube_views,
                naverRatio=round(naver_ratio, 2),
            )
        )

    return sorted(scores, key=lambda item: (-item.score, item.keyword))[:10]


async def get_combined_trends(category: str, range_value: TrendRange) -> CombinedTrendsResponse:
    naver = await get_naver_trend_keywords(category, range_value)
    youtube_rows = await _youtube_rows_for_category(category, range_value)
    top_tags, top_videos, youtube_metrics = _youtube_blocks(youtube_rows)
    combined_scores = _combined_scores(naver, youtube_metrics)

    return CombinedTrendsResponse(
        category=category,
        range=range_value,
        youtube={
            "topTags": top_tags,
            "topVideos": top_videos,
        },
        naver={
            "topKeywords": naver.topKeywords,
            "seriesKeywords": naver.seriesKeywords,
            "series": naver.series,
        },
        combined={"keywords": combined_scores},
    )


def validate_range(range_value: str) -> TrendRange:
    if range_value not in {"daily", "weekly", "monthly"}:
        raise BadRequestException("range must be one of: daily, weekly, monthly.", "VALIDATION_ERROR")
    return cast(TrendRange, range_value)


get_keyword_trends = get_youtube_keyword_trends

__all__ = [
    "collect_naver_trends",
    "create_naver_keyword_group",
    "delete_naver_keyword_group",
    "get_combined_trends",
    "get_keyword_trends",
    "get_naver_trend_keywords",
    "get_popular_videos_by_category",
    "list_naver_collection_logs",
    "list_naver_keyword_groups",
    "update_naver_keyword_group",
    "validate_range",
]
