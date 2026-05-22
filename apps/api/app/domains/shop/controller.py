from __future__ import annotations

from fastapi import Header, Query
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.core.security import verify_cron_secret
from app.domains.shop.schemas import ShopCollectionSummary, ShopSectionInfo, ShopSectionsResponse, ShopSetsResponse
from app.domains.shop.service import collect_shop_products, get_shop_products, list_shop_sections, list_shop_sets


async def shop_sections() -> ApiResponse[dict[str, list[ShopSectionInfo]]] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_shop_sections())
    except Exception as error:
        return error_response(error)


async def shop_products(
    equipmentCategory: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=20),
    sort: str = Query(default="popular"),
    level: str | None = Query(default=None),
) -> ApiResponse[ShopSectionsResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await get_shop_products(equipmentCategory, limit, sort, level))
    except Exception as error:
        return error_response(error)


async def shop_sets() -> ApiResponse[ShopSetsResponse] | JSONResponse:
    try:
        return ApiResponse(success=True, data=await list_shop_sets())
    except Exception as error:
        return error_response(error)


async def collect_shop_products_cron(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> ApiResponse[ShopCollectionSummary] | JSONResponse:
    try:
        verify_cron_secret(authorization, x_cron_secret)
        return ApiResponse(success=True, data=await collect_shop_products())
    except Exception as error:
        return error_response(error)


__all__ = ["collect_shop_products_cron", "shop_products", "shop_sections", "shop_sets"]
