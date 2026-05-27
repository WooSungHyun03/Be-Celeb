# Shared datetime helpers.
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Literal

UTC = timezone.utc
KST = timezone(timedelta(hours=9), name="KST")
TrendPeriod = Literal["daily", "weekly", "monthly"]


@dataclass(frozen=True)
class DateRangeByPeriod:
    start: datetime
    end: datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def kst_now() -> datetime:
    return utc_now().astimezone(KST)


def is_within_last_24h(value: datetime, now: datetime | None = None) -> bool:
    reference = now or utc_now()
    normalized = value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
    return reference - timedelta(hours=24) <= normalized <= reference


def normalize_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def parse_utc_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return normalize_utc(value)
    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=UTC)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return normalize_utc(parsed)


def _subtract_one_month(value: datetime) -> datetime:
    month = value.month - 1
    year = value.year
    if month == 0:
        month = 12
        year -= 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def get_date_range_by_period(period: TrendPeriod | str, now: datetime | None = None) -> DateRangeByPeriod:
    reference = normalize_utc(now or utc_now())
    if period == "daily":
        start = reference - timedelta(hours=24)
    elif period == "weekly":
        start = reference - timedelta(days=7)
    elif period == "monthly":
        start = _subtract_one_month(reference)
    else:
        raise ValueError("period must be one of: daily, weekly, monthly.")
    return DateRangeByPeriod(start=start, end=reference)
