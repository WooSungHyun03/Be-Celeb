# Shared API response helpers.
from __future__ import annotations

from typing import Any, Generic, TypeVar

from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.exceptions import AppException

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T
    message: str | None = None


def success_response(data: Any, message: str | None = None) -> dict[str, Any]:
    return {"success": True, "data": data, "message": message}


def error_response(error: Exception) -> JSONResponse:
    if isinstance(error, AppException):
        return JSONResponse(
            status_code=error.status_code,
            content={"success": False, "message": str(error), "code": error.code},
        )
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error.", "code": "INTERNAL_SERVER_ERROR"},
    )


def paginated_response(items: list[Any], total: int | None, limit: int, offset: int) -> dict[str, Any]:
    return {
        "success": True,
        "data": {
            "items": items,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
            },
        },
    }
