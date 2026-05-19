from __future__ import annotations

import html
import re
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import BadRequestException, BackendApiError, ExternalAPIException, missing_env
from app.core.logging import get_logger
from app.domains.shop.schemas import ShopCollectionSummary, ShopProduct, ShopProductsResponse

logger = get_logger(__name__)

NAVER_SHOP_URL = "https://openapi.naver.com/v1/search/shop.json"
SHOP_JOB_NAME = "creator_shop_products_daily_collection"
DEFAULT_LIMIT = 20
MAX_LIMIT = 50
CREATOR_CATEGORIES = {"게임", "운동", "IT", "노래", "OTT", "일상", "뷰티", "스터디", "코미디", "먹방", "춤"}


def _supabase_url() -> str:
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
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _request(
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
            f"{_supabase_url()}/rest/v1/{path}",
            headers=_headers(prefer),
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


async def _get(path: str, params: dict[str, Any]) -> Any:
    return await _request("GET", path, params=params)


async def _post(path: str, payload: Any, prefer: str | None = "return=representation") -> Any:
    return await _request("POST", path, payload=payload, prefer=prefer)


async def _patch(path: str, params: dict[str, Any], payload: dict[str, Any], prefer: str | None = "return=representation") -> Any:
    return await _request("PATCH", path, params=params, payload=payload, prefer=prefer)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _clean_html(value: Any) -> str:
    text = html.unescape(str(value or ""))
    return re.sub(r"<[^>]+>", "", text).strip()


def _as_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def _validate_category(category: str) -> str:
    value = category.strip()
    if value not in CREATOR_CATEGORIES:
        raise BadRequestException(f"category must be one of: {', '.join(sorted(CREATOR_CATEGORIES))}.", "VALIDATION_ERROR")
    return value


def _normalize_limit(limit: int | None) -> int:
    if limit is None:
        return DEFAULT_LIMIT
    return min(max(int(limit), 1), MAX_LIMIT)


def _require_naver_credentials() -> tuple[str, str]:
    settings = get_settings()
    if not settings.naver_client_id:
        raise missing_env("NAVER_CLIENT_ID")
    if not settings.naver_client_secret:
        raise missing_env("NAVER_CLIENT_SECRET")
    return settings.naver_client_id, settings.naver_client_secret


def _product_from_row(row: dict[str, Any]) -> ShopProduct:
    return ShopProduct(
        id=row.get("id") if isinstance(row.get("id"), str) else None,
        source=str(row.get("source") or "naver"),
        sourceProductId=row.get("source_product_id") if isinstance(row.get("source_product_id"), str) else None,
        title=str(row.get("title") or "Naver Shopping product"),
        imageUrl=row.get("image_url") if isinstance(row.get("image_url"), str) else None,
        price=_as_int(row.get("price")),
        mallName=row.get("mall_name") if isinstance(row.get("mall_name"), str) else None,
        productUrl=str(row.get("product_url") or ""),
        brand=row.get("brand") if isinstance(row.get("brand"), str) else None,
        maker=row.get("maker") if isinstance(row.get("maker"), str) else None,
        category=row.get("category") if isinstance(row.get("category"), str) else None,
        creatorCategory=str(row.get("creator_category") or ""),
        searchKeyword=str(row.get("search_keyword") or ""),
        collectedAt=row.get("collected_at") if isinstance(row.get("collected_at"), str) else None,
    )


def _row_from_naver_item(item: dict[str, Any], creator_category: str, keyword: str, collected_at: str) -> dict[str, Any]:
    product_url = str(item.get("link") or "").strip()
    source_product_id = str(item.get("productId") or "").strip() or product_url
    category_parts = [
        _clean_html(item.get(key))
        for key in ("category1", "category2", "category3", "category4")
        if _clean_html(item.get(key))
    ]
    return {
        "source": "naver",
        "source_product_id": source_product_id,
        "title": _clean_html(item.get("title")) or "Naver Shopping product",
        "image_url": str(item.get("image") or "").strip() or None,
        "price": _as_int(item.get("lprice")),
        "mall_name": _clean_html(item.get("mallName")) or None,
        "product_url": product_url,
        "brand": _clean_html(item.get("brand")) or None,
        "maker": _clean_html(item.get("maker")) or None,
        "category": " > ".join(category_parts) if category_parts else None,
        "creator_category": creator_category,
        "search_keyword": keyword,
        "raw": item,
        "collected_at": collected_at,
    }


async def _active_keywords(category: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "select": "id,creator_category,shop_category,keyword,source,is_active",
        "is_active": "eq.true",
        "source": "eq.naver",
        "order": "creator_category.asc,keyword.asc",
    }
    if category:
        params["creator_category"] = f"eq.{category}"
    rows = await _get("creator_shop_keywords", params)
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def _cached_products(category: str, query: str | None, limit: int) -> list[ShopProduct]:
    params: dict[str, Any] = {
        "select": "id,source,source_product_id,title,image_url,price,mall_name,product_url,brand,maker,category,creator_category,search_keyword,collected_at",
        "creator_category": f"eq.{category}",
        "order": "collected_at.desc,price.asc.nullslast",
        "limit": str(limit),
    }
    if query:
        params["search_keyword"] = f"eq.{query}"
    rows = await _get("creator_shop_products", params)
    return [_product_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


async def _fetch_naver_shop(keyword: str, display: int) -> list[dict[str, Any]]:
    client_id, client_secret = _require_naver_credentials()
    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
    }
    params = {
        "query": keyword,
        "display": str(min(max(display, 1), 100)),
        "start": "1",
        "sort": "sim",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(NAVER_SHOP_URL, headers=headers, params=params)
    if response.status_code >= 400:
        raise ExternalAPIException(f"Naver Shopping API request failed ({response.status_code}): {response.text[:500]}")
    payload = response.json()
    items = payload.get("items") if isinstance(payload, dict) else None
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


async def _upsert_products(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    await _post(
        "creator_shop_products?on_conflict=source,source_product_id,creator_category,search_keyword",
        rows,
        prefer="resolution=merge-duplicates,return=minimal",
    )
    return len(rows)


async def _fetch_and_cache(category: str, keywords: list[str], limit: int) -> list[ShopProduct]:
    collected_at = _now_iso()
    rows: list[dict[str, Any]] = []
    per_keyword_limit = max(5, min(20, limit))
    for keyword in keywords:
        items = await _fetch_naver_shop(keyword, per_keyword_limit)
        rows.extend(_row_from_naver_item(item, category, keyword, collected_at) for item in items)
    await _upsert_products(rows)
    products = [_product_from_row(row) for row in rows]
    products.sort(key=lambda product: (product.price is None, product.price or 0, product.title))
    return products[:limit]


async def get_shop_products(category: str = "IT", query: str | None = None, limit: int | None = None, refresh: bool = False) -> ShopProductsResponse:
    creator_category = _validate_category(category)
    normalized_query = query.strip() if query and query.strip() else None
    normalized_limit = _normalize_limit(limit)

    if not refresh:
        cached = await _cached_products(creator_category, normalized_query, normalized_limit)
        if cached:
            return ShopProductsResponse(category=creator_category, query=normalized_query, fromCache=True, products=cached)

    if normalized_query:
        keywords = [normalized_query]
    else:
        keyword_rows = await _active_keywords(creator_category)
        keywords = [str(row.get("keyword")) for row in keyword_rows if isinstance(row.get("keyword"), str)]
        if not keywords:
            return ShopProductsResponse(category=creator_category, query=None, fromCache=True, products=[])

    products = await _fetch_and_cache(creator_category, keywords, normalized_limit)
    return ShopProductsResponse(category=creator_category, query=normalized_query, fromCache=False, products=products)


async def _start_collection_log(started_at: str) -> str | None:
    try:
        rows = await _post(
            "creator_shop_collection_logs",
            {
                "job_name": SHOP_JOB_NAME,
                "started_at": started_at,
                "status": "running",
                "summary": {},
            },
        )
        row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
        return row.get("id") if row and isinstance(row.get("id"), str) else None
    except Exception as error:
        logger.warning("Failed to create shop collection log: %s", error)
        return None


async def _finish_collection_log(log_id: str | None, status: str, summary: dict[str, Any], error_message: str | None = None) -> None:
    if not log_id:
        return
    try:
        await _patch(
            "creator_shop_collection_logs",
            {"id": f"eq.{log_id}"},
            {
                "finished_at": _now_iso(),
                "status": status,
                "summary": summary,
                "error_message": error_message,
            },
            prefer="return=minimal",
        )
    except Exception as error:
        logger.warning("Failed to finish shop collection log: %s", error)


async def collect_shop_products() -> ShopCollectionSummary:
    started_at = _now_iso()
    log_id = await _start_collection_log(started_at)
    errors: list[dict[str, str]] = []
    products_upserted = 0
    categories: set[str] = set()

    try:
        _require_naver_credentials()
        keywords = await _active_keywords()
        for row in keywords:
            creator_category = str(row.get("creator_category") or "")
            keyword = str(row.get("keyword") or "")
            if not creator_category or not keyword:
                continue
            categories.add(creator_category)
            try:
                items = await _fetch_naver_shop(keyword, 10)
                collected_at = _now_iso()
                product_rows = [_row_from_naver_item(item, creator_category, keyword, collected_at) for item in items]
                products_upserted += await _upsert_products(product_rows)
            except Exception as error:
                logger.exception("Shop product collection failed for %s / %s", creator_category, keyword)
                errors.append(
                    {
                        "category": creator_category,
                        "keyword": keyword,
                        "message": str(error),
                    }
                )

        summary = ShopCollectionSummary(
            categoriesChecked=len(categories),
            keywordsChecked=len(keywords),
            productsUpserted=products_upserted,
            errors=errors,
        )
        await _finish_collection_log(
            log_id,
            "partial_success" if errors else "success",
            summary.model_dump(mode="json"),
            f"{len(errors)} keyword(s) failed." if errors else None,
        )
        return summary
    except Exception as error:
        await _finish_collection_log(log_id, "failed", {}, str(error))
        raise
