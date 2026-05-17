# Shared pagination validation.
from __future__ import annotations

from app.core.exceptions import BadRequestException


def clamp_limit(value: int, default: int = 50, maximum: int = 100) -> int:
    if value <= 0:
        return default
    return min(value, maximum)


def validate_offset(value: int) -> int:
    if value < 0:
        raise BadRequestException("offset must be greater than or equal to 0.")
    return value
