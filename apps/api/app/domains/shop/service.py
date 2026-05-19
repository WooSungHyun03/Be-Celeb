from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import httpx

from app.common.text import strip_html_tags
from app.core.config import get_settings
from app.core.exceptions import BackendApiError, ExternalAPIException, missing_env
from app.core.logging import get_logger
from app.domains.shop.schemas import ShopCollectionSummary, ShopProduct, ShopSection, ShopSectionInfo, ShopSectionsResponse

logger = get_logger(__name__)

NAVER_SHOP_URL = "https://openapi.naver.com/v1/search/shop.json"
SHOP_JOB_NAME = "creator_shop_products_daily_collection"
DEFAULT_LIMIT = 8
MAX_LIMIT = 20
NAVER_AUTH_ERROR_MESSAGE = "네이버 쇼핑 API 인증 설정이 올바르지 않습니다. 관리자에게 문의하세요."
SHOP_FALLBACK_MESSAGE = "실시간 상품 정보를 불러오지 못해 기본 추천 장비를 표시합니다."

EQUIPMENT_KEYWORDS: dict[str, list[str]] = {
    "카메라": ["브이로그 카메라", "유튜브 카메라", "액션캠"],
    "마이크": ["유튜브 마이크", "무선 핀마이크", "USB 마이크"],
    "조명": ["링라이트", "유튜브 조명", "촬영 조명"],
    "편집툴": ["영상 편집 키보드", "편집 모니터", "외장 SSD"],
    "삼각대/거치대": ["카메라 삼각대", "스마트폰 삼각대", "책상 거치대"],
    "배경/소품": ["촬영 배경지", "크로마키 배경", "제품 촬영 소품"],
    "저장장치": ["외장 SSD", "SD 카드", "CFexpress 카드"],
    "라이브/스트리밍 장비": ["웹캠", "캡처보드", "스트림덱"],
}


class NaverShoppingAuthError(ExternalAPIException):
    def __init__(self) -> None:
        super().__init__(NAVER_AUTH_ERROR_MESSAGE, "NAVER_SHOPPING_AUTH_ERROR")


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


def _as_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed >= 0 else None
    except (TypeError, ValueError):
        return None


def _normalize_limit(limit: int | None) -> int:
    if limit is None:
        return DEFAULT_LIMIT
    return min(max(int(limit), 1), MAX_LIMIT)


def _search_url(keyword: str) -> str:
    return f"https://search.shopping.naver.com/search/all?query={quote_plus(keyword)}"


def _safe_text(value: Any) -> str:
    return strip_html_tags(str(value or "")).strip()


def _naver_credentials() -> tuple[str, str]:
    settings = get_settings()
    has_client_id = bool(settings.naver_client_id)
    has_client_secret = bool(settings.naver_client_secret)
    if not has_client_id or not has_client_secret:
        logger.warning(
            "Naver Shopping credentials missing: hasClientId=%s hasClientSecret=%s",
            has_client_id,
            has_client_secret,
        )
    if not settings.naver_client_id:
        raise missing_env("NAVER_CLIENT_ID")
    if not settings.naver_client_secret:
        raise missing_env("NAVER_CLIENT_SECRET")
    return settings.naver_client_id, settings.naver_client_secret


def _product_from_row(row: dict[str, Any]) -> ShopProduct:
    equipment_category = str(
        row.get("equipment_category")
        or row.get("shop_category")
        or row.get("creator_category")
        or row.get("category")
        or "기타"
    )
    product_url = str(row.get("product_url") or "")
    keyword = str(row.get("search_keyword") or equipment_category)
    return ShopProduct(
        id=row.get("id") if isinstance(row.get("id"), str) else None,
        source=str(row.get("source") or "naver"),
        sourceProductId=row.get("source_product_id") if isinstance(row.get("source_product_id"), str) else None,
        title=_safe_text(row.get("title")) or "Naver Shopping product",
        imageUrl=row.get("image_url") if isinstance(row.get("image_url"), str) else None,
        price=_as_int(row.get("price")),
        mallName=row.get("mall_name") if isinstance(row.get("mall_name"), str) else None,
        productUrl=product_url or _search_url(keyword),
        brand=row.get("brand") if isinstance(row.get("brand"), str) else None,
        maker=row.get("maker") if isinstance(row.get("maker"), str) else None,
        equipmentCategory=equipment_category,
        searchKeyword=keyword,
        collectedAt=row.get("collected_at") if isinstance(row.get("collected_at"), str) else None,
    )


def _row_from_naver_item(item: dict[str, Any], equipment_category: str, keyword: str, collected_at: str) -> dict[str, Any]:
    product_url = str(item.get("link") or "").strip()
    source_product_id = str(item.get("productId") or "").strip() or product_url
    return {
        "source": "naver",
        "source_product_id": source_product_id,
        "title": _safe_text(item.get("title")) or "Naver Shopping product",
        "image_url": str(item.get("image") or "").strip() or None,
        "price": _as_int(item.get("lprice")),
        "mall_name": _safe_text(item.get("mallName")) or None,
        "product_url": product_url or _search_url(keyword),
        "brand": _safe_text(item.get("brand")) or None,
        "maker": _safe_text(item.get("maker")) or None,
        "equipment_category": equipment_category,
        "search_keyword": keyword,
        "raw": item,
        "collected_at": collected_at,
    }


def _dedupe_products(products: list[ShopProduct], limit: int) -> list[ShopProduct]:
    seen: set[str] = set()
    deduped: list[ShopProduct] = []
    for product in products:
        key = product.sourceProductId or product.productUrl or product.title
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(product)
        if len(deduped) >= limit:
            break
    return deduped


async def _active_keywords(equipment_category: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, Any] = {
        "select": "id,equipment_category,keyword,source,is_active",
        "is_active": "eq.true",
        "source": "eq.naver",
        "order": "equipment_category.asc,keyword.asc",
    }
    if equipment_category:
        params["equipment_category"] = f"eq.{equipment_category}"
    rows = await _get("creator_shop_keywords", params)
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def _default_keyword_rows(equipment_category: str | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for section, keywords in EQUIPMENT_KEYWORDS.items():
        if equipment_category and section != equipment_category:
            continue
        rows.extend({"equipment_category": section, "keyword": keyword, "source": "naver", "is_active": True} for keyword in keywords)
    return rows


async def _keywords_for_section(equipment_category: str) -> list[str]:
    try:
        rows = await _active_keywords(equipment_category)
    except Exception as error:
        logger.warning("Failed to load shop keywords from cache for %s: %s", equipment_category, error)
        rows = []
    keywords = [str(row.get("keyword")) for row in rows if isinstance(row.get("keyword"), str) and row.get("keyword")]
    return keywords or EQUIPMENT_KEYWORDS.get(equipment_category, [])


async def _cached_products(equipment_category: str, limit: int) -> list[ShopProduct]:
    rows = await _get(
        "creator_shop_products",
        {
            "select": "id,source,source_product_id,title,image_url,price,mall_name,product_url,brand,maker,equipment_category,search_keyword,collected_at",
            "equipment_category": f"eq.{equipment_category}",
            "order": "collected_at.desc,price.asc.nullslast",
            "limit": str(max(limit * 3, limit)),
        },
    )
    products = [_product_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return _dedupe_products(products, limit)


async def _fetch_naver_shop(keyword: str, display: int) -> list[dict[str, Any]]:
    client_id, client_secret = _naver_credentials()
    params = {
        "query": keyword,
        "display": str(min(max(display, 1), 100)),
        "start": "1",
        "sort": "sim",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            NAVER_SHOP_URL,
            headers={
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret,
            },
            params=params,
        )

    payload: dict[str, Any] = {}
    if response.content:
        try:
            parsed = response.json()
            payload = parsed if isinstance(parsed, dict) else {}
        except ValueError:
            payload = {}

    if response.status_code >= 400:
        error_code = payload.get("errorCode")
        logger.warning(
            "Naver Shopping API failed: status=%s errorCode=%s query=%s hasClientId=%s hasClientSecret=%s",
            response.status_code,
            error_code,
            keyword,
            bool(client_id),
            bool(client_secret),
        )
        if response.status_code == 401 and error_code == "024":
            raise NaverShoppingAuthError()
        raise ExternalAPIException(f"Naver Shopping API request failed ({response.status_code}).")

    items = payload.get("items")
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


async def _upsert_products(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    await _post(
        "creator_shop_products?on_conflict=source,source_product_id,equipment_category,search_keyword",
        rows,
        prefer="resolution=merge-duplicates,return=minimal",
    )
    return len(rows)


async def _fetch_and_cache(equipment_category: str, keywords: list[str], limit: int) -> list[ShopProduct]:
    collected_at = _now_iso()
    rows: list[dict[str, Any]] = []
    per_keyword_limit = max(4, min(10, limit))

    for keyword in keywords:
        items = await _fetch_naver_shop(keyword, per_keyword_limit)
        rows.extend(_row_from_naver_item(item, equipment_category, keyword, collected_at) for item in items)
        if len(rows) >= limit:
            break

    try:
        await _upsert_products(rows)
    except Exception as error:
        logger.warning("Failed to upsert shop product cache for %s: %s", equipment_category, error)

    products = [_product_from_row(row) for row in rows]
    products.sort(key=lambda product: (product.price is None, product.price or 0, product.title))
    return _dedupe_products(products, limit)


def _fallback_products(equipment_category: str, limit: int) -> list[ShopProduct]:
    products: list[ShopProduct] = []
    for keyword in EQUIPMENT_KEYWORDS.get(equipment_category, [])[:limit]:
        products.append(
            ShopProduct(
                id=None,
                source="fallback",
                sourceProductId=f"fallback-{equipment_category}-{keyword}",
                title=f"{keyword} 추천 검색",
                imageUrl=None,
                price=None,
                mallName="Naver Shopping 검색",
                productUrl=_search_url(keyword),
                brand=None,
                maker=None,
                equipmentCategory=equipment_category,
                searchKeyword=keyword,
                collectedAt=None,
            )
        )
    return products


def _fallback_message(error: Exception) -> str:
    text = str(error)
    if isinstance(error, NaverShoppingAuthError) or "NAVER_CLIENT" in text or "NAVER_SHOPPING_AUTH_ERROR" in text:
        return NAVER_AUTH_ERROR_MESSAGE
    return SHOP_FALLBACK_MESSAGE


async def _section_products(equipment_category: str, limit: int, refresh: bool) -> ShopSection:
    cached: list[ShopProduct] = []
    if not refresh:
        try:
            cached = await _cached_products(equipment_category, limit)
            if len(cached) >= min(4, limit):
                return ShopSection(equipmentCategory=equipment_category, items=cached, isFallback=False)
        except Exception as error:
            logger.warning("Failed to read shop product cache for %s: %s", equipment_category, error)

    try:
        keywords = await _keywords_for_section(equipment_category)
        products = await _fetch_and_cache(equipment_category, keywords, limit)
        if products:
            return ShopSection(equipmentCategory=equipment_category, items=products, isFallback=False)
    except Exception as error:
        logger.warning("Shop live product load failed for %s: %s", equipment_category, error)
        if cached:
            return ShopSection(
                equipmentCategory=equipment_category,
                items=cached,
                error=_fallback_message(error),
                isFallback=False,
            )
        return ShopSection(
            equipmentCategory=equipment_category,
            items=_fallback_products(equipment_category, limit),
            error=_fallback_message(error),
            isFallback=True,
        )

    if cached:
        return ShopSection(equipmentCategory=equipment_category, items=cached, error=SHOP_FALLBACK_MESSAGE, isFallback=False)
    return ShopSection(
        equipmentCategory=equipment_category,
        items=_fallback_products(equipment_category, limit),
        error=SHOP_FALLBACK_MESSAGE,
        isFallback=True,
    )


async def list_shop_sections() -> dict[str, list[ShopSectionInfo]]:
    return {
        "sections": [
            ShopSectionInfo(equipmentCategory=equipment_category, keywords=keywords)
            for equipment_category, keywords in EQUIPMENT_KEYWORDS.items()
        ]
    }


async def get_shop_products(
    equipment_category: str | None = None,
    limit: int | None = None,
    refresh: bool = False,
) -> ShopSectionsResponse:
    normalized_limit = _normalize_limit(limit)
    sections = [equipment_category] if equipment_category else list(EQUIPMENT_KEYWORDS)
    sections = [section for section in sections if section in EQUIPMENT_KEYWORDS]
    if equipment_category and not sections:
        return ShopSectionsResponse(sections=[])
    return ShopSectionsResponse(
        sections=[await _section_products(section, normalized_limit, refresh) for section in sections]
    )


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


async def _collection_keywords() -> list[dict[str, Any]]:
    try:
        rows = await _active_keywords()
    except Exception as error:
        logger.warning("Failed to load active shop keywords for collection: %s", error)
        rows = []
    return rows or _default_keyword_rows()


async def collect_shop_products() -> ShopCollectionSummary:
    started_at = _now_iso()
    log_id = await _start_collection_log(started_at)
    errors: list[dict[str, str]] = []
    products_upserted = 0
    sections: set[str] = set()

    try:
        _naver_credentials()
        keywords = await _collection_keywords()
        for row in keywords:
            equipment_category = str(row.get("equipment_category") or "")
            keyword = str(row.get("keyword") or "")
            if not equipment_category or not keyword:
                continue
            sections.add(equipment_category)
            try:
                items = await _fetch_naver_shop(keyword, 10)
                collected_at = _now_iso()
                product_rows = [_row_from_naver_item(item, equipment_category, keyword, collected_at) for item in items]
                products_upserted += await _upsert_products(product_rows)
            except Exception as error:
                logger.exception("Shop product collection failed for %s / %s", equipment_category, keyword)
                errors.append(
                    {
                        "equipmentCategory": equipment_category,
                        "keyword": keyword,
                        "message": str(error),
                    }
                )

        summary = ShopCollectionSummary(
            sectionsChecked=len(sections),
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
