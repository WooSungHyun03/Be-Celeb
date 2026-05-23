from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

import httpx

from app.common.text import strip_html_tags
from app.core.config import get_settings
from app.core.exceptions import BackendApiError, ExternalAPIException, missing_env
from app.core.logging import get_logger
from app.domains.shop.schemas import (
    ShopCollectionSummary,
    ShopProduct,
    ShopSection,
    ShopSectionInfo,
    ShopSectionsResponse,
    ShopSet,
    ShopSetsResponse,
)

logger = get_logger(__name__)

NAVER_SHOP_URL = "https://openapi.naver.com/v1/search/shop.json"
SHOP_JOB_NAME = "creator_shop_products_daily_collection"
DEFAULT_LIMIT = 8
MAX_LIMIT = 20
SHOP_FALLBACK_MESSAGE = "수집된 상품 캐시가 없어 기본 추천 장비를 표시합니다."
DEFAULT_SORT = "popular"
SORT_OPTIONS = {"price_asc", "price_desc", "popular", "latest"}

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

FALLBACK_PRODUCTS: dict[str, list[str]] = {
    "카메라": ["브이로그 카메라", "유튜브 카메라", "액션캠", "스마트폰 짐벌", "웹캠 카메라"],
    "마이크": ["기본 마이크", "유튜브 마이크", "무선 핀마이크", "USB 마이크", "샷건 마이크"],
    "조명": ["링라이트", "유튜브 조명", "촬영 조명", "스튜디오 조명", "고성능 조명"],
    "편집툴": ["영상 편집 키보드", "편집 모니터", "외장 SSD", "편집 컨트롤러", "컬러 캘리브레이터"],
    "삼각대/거치대": ["카메라 삼각대", "스마트폰 삼각대", "책상 거치대", "미니 삼각대", "모니터 암"],
    "배경/소품": ["촬영 배경지", "크로마키 배경", "제품 촬영 소품", "테이블 매트", "촬영 소품 박스"],
    "저장장치": ["외장 SSD", "SD 카드", "CFexpress 카드", "카드 리더기", "백업 외장하드"],
    "라이브/스트리밍 장비": ["웹캠", "캡처보드", "스트림덱", "방송용 오디오 믹서", "라이브 조명"],
}

SHOP_SET_CONFIG: list[dict[str, Any]] = [
    {
        "level": "beginner",
        "title": "입문용 세트",
        "description": "스마트폰이나 기본 카메라로 바로 촬영을 시작할 때 필요한 기본 구성입니다.",
        "items": ["기본 마이크", "링라이트", "스마트폰 삼각대"],
    },
    {
        "level": "intermediate",
        "title": "중급자용 세트",
        "description": "음성 품질과 촬영 안정성을 함께 올리고 편집 파일을 안정적으로 관리하는 구성입니다.",
        "items": ["무선 핀마이크", "촬영 조명", "카메라 삼각대", "외장 SSD"],
    },
    {
        "level": "advanced",
        "title": "고급자용 세트",
        "description": "라이브, 리뷰, 스튜디오 촬영까지 확장할 수 있는 고급 제작 장비 구성입니다.",
        "items": ["고급 카메라", "오디오 인터페이스", "캡처보드", "스트림덱", "고성능 조명"],
    },
]


class NaverShoppingAuthError(ExternalAPIException):
    def __init__(self) -> None:
        super().__init__(SHOP_FALLBACK_MESSAGE, "NAVER_SHOPPING_AUTH_ERROR")


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


def _as_float(value: Any) -> float:
    try:
        parsed = float(value)
        return parsed if parsed >= 0 else 0
    except (TypeError, ValueError):
        return 0


def _normalize_limit(limit: int | None) -> int:
    if limit is None:
        return DEFAULT_LIMIT
    return min(max(int(limit), 1), MAX_LIMIT)


def _normalize_sort(sort: str | None) -> str:
    normalized = (sort or DEFAULT_SORT).strip().lower()
    return normalized if normalized in SORT_OPTIONS else DEFAULT_SORT


def _normalize_level(level: str | None) -> str | None:
    normalized = (level or "").strip().lower()
    known_levels = {item["level"] for item in SHOP_SET_CONFIG}
    return normalized if normalized in known_levels else None


def _search_url(keyword: str) -> str:
    return f"https://search.shopping.naver.com/search/all?query={quote_plus(keyword)}"


def _safe_text(value: Any) -> str:
    return strip_html_tags(str(value or "")).strip()


def _recommended_level_for_keyword(keyword: str) -> str | None:
    normalized = keyword.lower().replace(" ", "")
    beginner = {"기본마이크", "링라이트", "스마트폰삼각대", "usb마이크", "책상거치대"}
    intermediate = {"무선핀마이크", "촬영조명", "카메라삼각대", "외장ssd", "유튜브조명"}
    advanced = {"고급카메라", "오디오인터페이스", "캡처보드", "스트림덱", "고성능조명", "액션캠"}
    if normalized in beginner:
        return "beginner"
    if normalized in intermediate:
        return "intermediate"
    if normalized in advanced:
        return "advanced"
    return None


def _sort_products(products: list[ShopProduct], sort: str) -> list[ShopProduct]:
    if sort == "price_asc":
        return sorted(products, key=lambda product: (product.price is None, product.price or 0, -product.popularityScore))
    if sort == "price_desc":
        return sorted(products, key=lambda product: (product.price is None, -(product.price or 0), -product.popularityScore))
    if sort == "latest":
        return sorted(products, key=lambda product: product.collectedAt or "", reverse=True)
    return sorted(products, key=lambda product: (product.popularityScore, product.collectedAt or ""), reverse=True)


def _naver_credentials() -> tuple[str, str, str]:
    settings = get_settings()
    client_id = settings.naver_shopping_client_id or settings.naver_client_id
    client_secret = settings.naver_shopping_client_secret or settings.naver_client_secret
    credential_source = "NAVER_SHOPPING_CLIENT_*" if settings.naver_shopping_client_id or settings.naver_shopping_client_secret else "NAVER_CLIENT_*"
    has_client_id = bool(client_id)
    has_client_secret = bool(client_secret)
    if not has_client_id or not has_client_secret:
        logger.warning(
            "Naver Shopping credentials missing: hasClientId=%s hasClientSecret=%s hasDedicatedClientId=%s hasDedicatedClientSecret=%s hasSharedClientId=%s hasSharedClientSecret=%s",
            has_client_id,
            has_client_secret,
            bool(settings.naver_shopping_client_id),
            bool(settings.naver_shopping_client_secret),
            bool(settings.naver_client_id),
            bool(settings.naver_client_secret),
        )
    if not client_id:
        raise missing_env("NAVER_SHOPPING_CLIENT_ID or NAVER_CLIENT_ID")
    if not client_secret:
        raise missing_env("NAVER_SHOPPING_CLIENT_SECRET or NAVER_CLIENT_SECRET")
    return client_id, client_secret, credential_source


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
        popularityScore=_as_float(row.get("popularity_score")),
        recommendedLevel=row.get("recommended_level") if isinstance(row.get("recommended_level"), str) else None,
        collectedAt=row.get("collected_at") if isinstance(row.get("collected_at"), str) else None,
    )


def _row_from_naver_item(
    item: dict[str, Any],
    equipment_category: str,
    keyword: str,
    collected_at: str,
    rank: int = 0,
) -> dict[str, Any]:
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
        "popularity_score": max(0, 100 - rank),
        "recommended_level": _recommended_level_for_keyword(keyword),
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


def _supabase_order(sort: str) -> str:
    if sort == "price_asc":
        return "price.asc.nullslast,popularity_score.desc.nullslast,collected_at.desc"
    if sort == "price_desc":
        return "price.desc.nullslast,popularity_score.desc.nullslast,collected_at.desc"
    if sort == "latest":
        return "collected_at.desc,popularity_score.desc.nullslast"
    return "popularity_score.desc.nullslast,collected_at.desc,price.asc.nullslast"


async def _cached_products(
    equipment_category: str,
    limit: int,
    sort: str = DEFAULT_SORT,
    level: str | None = None,
) -> list[ShopProduct]:
    params: dict[str, Any] = {
        "select": (
            "id,source,source_product_id,title,image_url,price,mall_name,product_url,brand,maker,"
            "equipment_category,search_keyword,popularity_score,recommended_level,collected_at"
        ),
        "equipment_category": f"eq.{equipment_category}",
        "order": _supabase_order(sort),
        "limit": str(max(limit * 4, limit)),
    }
    if level:
        params["recommended_level"] = f"eq.{level}"
    rows = await _get(
        "creator_shop_products",
        params,
    )
    products = [_product_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    return _dedupe_products(products, limit)


async def _fetch_naver_shop(keyword: str, display: int) -> list[dict[str, Any]]:
    client_id, client_secret, credential_source = _naver_credentials()
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
            "Naver Shopping API failed: status=%s errorCode=%s query=%s hasClientId=%s hasClientSecret=%s credentialSource=%s",
            response.status_code,
            error_code,
            keyword,
            bool(client_id),
            bool(client_secret),
            credential_source,
        )
        if response.status_code == 401 and error_code == "024":
            raise NaverShoppingAuthError()
        raise ExternalAPIException(f"Naver Shopping API request failed ({response.status_code}).")

    items = payload.get("items")
    return [item for item in items if isinstance(item, dict)] if isinstance(items, list) else []


async def check_naver_shopping_connection(keyword: str = "유튜브 마이크") -> dict[str, Any]:
    settings = get_settings()
    detail: dict[str, Any] = {
        "endpoint": NAVER_SHOP_URL,
        "query": keyword,
        "hasDedicatedClientId": bool(settings.naver_shopping_client_id),
        "hasDedicatedClientSecret": bool(settings.naver_shopping_client_secret),
        "hasSharedClientId": bool(settings.naver_client_id),
        "hasSharedClientSecret": bool(settings.naver_client_secret),
        "credentialSource": "NAVER_SHOPPING_CLIENT_*" if settings.naver_shopping_client_id or settings.naver_shopping_client_secret else "NAVER_CLIENT_*",
    }

    try:
        client_id, client_secret, credential_source = _naver_credentials()
    except Exception as error:
        detail["credentialError"] = str(error)
        return {
            "ok": False,
            "message": "Naver Shopping API credentials are not configured for the backend runtime.",
            "detail": detail,
        }

    detail["credentialSource"] = credential_source
    params = {"query": keyword, "display": "1", "start": "1", "sort": "sim"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                NAVER_SHOP_URL,
                headers={
                    "X-Naver-Client-Id": client_id,
                    "X-Naver-Client-Secret": client_secret,
                },
                params=params,
            )
    except Exception as error:
        logger.warning("Naver Shopping API connectivity check failed: query=%s error=%s", keyword, error)
        detail["networkError"] = str(error)
        return {"ok": False, "message": "Naver Shopping API request failed before receiving a response.", "detail": detail}

    payload: dict[str, Any] = {}
    if response.content:
        try:
            parsed = response.json()
            payload = parsed if isinstance(parsed, dict) else {}
        except ValueError:
            payload = {}

    items = payload.get("items")
    detail.update(
        {
            "statusCode": response.status_code,
            "errorCode": payload.get("errorCode"),
            "errorMessage": payload.get("errorMessage"),
            "itemCount": len(items) if isinstance(items, list) else 0,
        }
    )
    if response.status_code >= 400:
        logger.warning(
            "Naver Shopping API connectivity check returned failure: status=%s errorCode=%s query=%s credentialSource=%s",
            response.status_code,
            payload.get("errorCode"),
            keyword,
            credential_source,
        )
        return {"ok": False, "message": f"Naver Shopping API request failed ({response.status_code}).", "detail": detail}

    return {"ok": True, "message": "Naver Shopping API connection succeeded.", "detail": detail}


async def _upsert_products(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    await _post(
        "creator_shop_products?on_conflict=source,source_product_id,equipment_category,search_keyword",
        rows,
        prefer="resolution=merge-duplicates,return=minimal",
    )
    return len(rows)


def _fallback_products(
    equipment_category: str,
    limit: int,
    sort: str = DEFAULT_SORT,
    level: str | None = None,
) -> list[ShopProduct]:
    products: list[ShopProduct] = []
    candidates = FALLBACK_PRODUCTS.get(equipment_category, EQUIPMENT_KEYWORDS.get(equipment_category, []))
    for index, keyword in enumerate(candidates):
        recommended_level = _recommended_level_for_keyword(keyword)
        if level and recommended_level != level:
            continue
        products.append(
            ShopProduct(
                id=None,
                source="fallback",
                sourceProductId=f"fallback-{equipment_category}-{keyword}",
                title=f"{keyword} 추천 검색",
                imageUrl=None,
                price=None,
                mallName="기본 추천 장비",
                productUrl=_search_url(keyword),
                brand=None,
                maker=None,
                equipmentCategory=equipment_category,
                searchKeyword=keyword,
                popularityScore=max(0, 100 - index * 5),
                recommendedLevel=recommended_level,
                collectedAt=None,
            )
        )
    return _sort_products(products, sort)[:limit]


def _fallback_message(error: Exception) -> str:
    text = str(error)
    if isinstance(error, NaverShoppingAuthError) or "NAVER_CLIENT" in text or "NAVER_SHOPPING_AUTH_ERROR" in text:
        return SHOP_FALLBACK_MESSAGE
    return SHOP_FALLBACK_MESSAGE


async def _section_products(equipment_category: str, limit: int, sort: str, level: str | None) -> ShopSection:
    try:
        cached = await _cached_products(equipment_category, limit, sort, level)
        if cached:
            return ShopSection(equipmentCategory=equipment_category, items=cached, isFallback=False)
    except Exception as error:
        logger.warning("Failed to read shop product cache for %s: %s", equipment_category, error)
        return ShopSection(
            equipmentCategory=equipment_category,
            items=_fallback_products(equipment_category, limit, sort, level),
            error=_fallback_message(error),
            isFallback=True,
        )

    return ShopSection(
        equipmentCategory=equipment_category,
        items=_fallback_products(equipment_category, limit, sort, level),
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


def _configured_set(level: str) -> dict[str, Any] | None:
    return next((item for item in SHOP_SET_CONFIG if item["level"] == level), None)


async def list_shop_sets() -> ShopSetsResponse:
    rows: list[dict[str, Any]] = []
    try:
        payload = await _get("creator_shop_sets", {"select": "level,title,description,product_ids", "order": "created_at.asc"})
        rows = [row for row in payload if isinstance(row, dict)] if isinstance(payload, list) else []
    except Exception as error:
        logger.warning("Failed to load creator shop sets from cache: %s", error)

    source_rows = rows or SHOP_SET_CONFIG
    sets: list[ShopSet] = []
    for row in source_rows:
        level = str(row.get("level") or "")
        config = _configured_set(level) or row
        sets.append(
            ShopSet(
                level=level,
                title=str(row.get("title") or config.get("title") or level),
                description=row.get("description") if isinstance(row.get("description"), str) else config.get("description"),
                items=list(config.get("items") or []),
            )
        )
    return ShopSetsResponse(sets=sets)


async def get_shop_products(
    equipment_category: str | None = None,
    limit: int | None = None,
    sort: str | None = None,
    level: str | None = None,
) -> ShopSectionsResponse:
    normalized_limit = _normalize_limit(limit)
    normalized_sort = _normalize_sort(sort)
    normalized_level = _normalize_level(level)
    sections = [equipment_category] if equipment_category else list(EQUIPMENT_KEYWORDS)
    sections = [section for section in sections if section in EQUIPMENT_KEYWORDS]
    if equipment_category and not sections:
        return ShopSectionsResponse(sections=[])
    return ShopSectionsResponse(
        sections=[
            await _section_products(section, normalized_limit, normalized_sort, normalized_level)
            for section in sections
        ]
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
    valid_rows = [row for row in rows if str(row.get("equipment_category") or "") in EQUIPMENT_KEYWORDS]
    return valid_rows or _default_keyword_rows()


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
                product_rows = [
                    _row_from_naver_item(item, equipment_category, keyword, collected_at, rank=index)
                    for index, item in enumerate(items)
                ]
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
