from __future__ import annotations

from typing import Any

from fastapi import Header
from fastapi.responses import JSONResponse

from app.core.responses import ApiResponse, error_response
from app.core.security import verify_cron_secret
from app.domains.collection.service import collect_admin_now


async def collect_daily_videos(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        verify_cron_secret(authorization, x_cron_secret)
        return ApiResponse(success=True, data=await collect_admin_now())
    except Exception as error:
        return error_response(error)
