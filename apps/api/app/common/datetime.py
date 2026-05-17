# Shared datetime helpers.
from __future__ import annotations

from datetime import datetime, timedelta, timezone

UTC = timezone.utc
KST = timezone(timedelta(hours=9), name="KST")


def utc_now() -> datetime:
    return datetime.now(UTC)


def kst_now() -> datetime:
    return utc_now().astimezone(KST)


def is_within_last_24h(value: datetime, now: datetime | None = None) -> bool:
    reference = now or utc_now()
    normalized = value.astimezone(UTC)
    return reference - timedelta(hours=24) <= normalized <= reference
