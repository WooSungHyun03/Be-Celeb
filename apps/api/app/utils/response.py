# Defines a generic API response envelope for FastAPI routes.
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: T
    message: str | None = None
