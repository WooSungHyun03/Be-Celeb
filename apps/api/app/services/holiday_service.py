"""Holiday service for managing public holidays and special dates."""
from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, missing_env


def _supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    payload: Any | None = None,
) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(
            method,
            f"{_supabase_url()}/rest/v1/{path}",
            headers=_headers(),
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


# Korean holidays (2024-2027). Keep these as YYYY-MM-DD local Korea calendar dates.
KOREAN_HOLIDAYS = [
    # 2024
    {"date": "2024-01-01", "name": "신년", "category": "public_holiday"},
    {"date": "2024-02-09", "name": "설날", "category": "public_holiday"},
    {"date": "2024-02-10", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2024-02-11", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2024-02-12", "name": "설날 대체공휴일", "category": "public_holiday"},
    {"date": "2024-03-01", "name": "삼일절", "category": "public_holiday"},
    {"date": "2024-04-10", "name": "국회의원선거일", "category": "observance"},
    {"date": "2024-05-05", "name": "어린이날", "category": "public_holiday"},
    {"date": "2024-05-06", "name": "대체공휴일", "category": "public_holiday"},
    {"date": "2024-05-15", "name": "부처님오신날", "category": "public_holiday"},
    {"date": "2024-06-06", "name": "현충일", "category": "public_holiday"},
    {"date": "2024-08-15", "name": "광복절", "category": "public_holiday"},
    {"date": "2024-09-16", "name": "추석", "category": "public_holiday"},
    {"date": "2024-09-17", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2024-09-18", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2024-10-03", "name": "개천절", "category": "public_holiday"},
    {"date": "2024-10-09", "name": "한글날", "category": "public_holiday"},
    {"date": "2024-12-25", "name": "크리스마스", "category": "public_holiday"},
    # 2025
    {"date": "2025-01-01", "name": "신년", "category": "public_holiday"},
    {"date": "2025-01-27", "name": "임시공휴일", "category": "public_holiday"},
    {"date": "2025-01-28", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2025-01-29", "name": "설날", "category": "public_holiday"},
    {"date": "2025-01-30", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2025-03-01", "name": "삼일절", "category": "public_holiday"},
    {"date": "2025-03-03", "name": "삼일절 대체공휴일", "category": "public_holiday"},
    {"date": "2025-05-05", "name": "어린이날", "category": "public_holiday"},
    {"date": "2025-05-05", "name": "부처님오신날", "category": "public_holiday"},
    {"date": "2025-05-06", "name": "부처님오신날 대체공휴일", "category": "public_holiday"},
    {"date": "2025-06-06", "name": "현충일", "category": "public_holiday"},
    {"date": "2025-08-15", "name": "광복절", "category": "public_holiday"},
    {"date": "2025-10-05", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2025-10-06", "name": "추석", "category": "public_holiday"},
    {"date": "2025-10-07", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2025-10-08", "name": "추석 대체공휴일", "category": "public_holiday"},
    {"date": "2025-10-03", "name": "개천절", "category": "public_holiday"},
    {"date": "2025-10-09", "name": "한글날", "category": "public_holiday"},
    {"date": "2025-12-25", "name": "크리스마스", "category": "public_holiday"},
    # 2026
    {"date": "2026-01-01", "name": "신년", "category": "public_holiday"},
    {"date": "2026-02-16", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2026-02-17", "name": "설날", "category": "public_holiday"},
    {"date": "2026-02-18", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2026-03-01", "name": "삼일절", "category": "public_holiday"},
    {"date": "2026-03-02", "name": "삼일절 대체공휴일", "category": "public_holiday"},
    {"date": "2026-05-01", "name": "근로자의날", "category": "public_holiday"},
    {"date": "2026-05-05", "name": "어린이날", "category": "public_holiday"},
    {"date": "2026-05-24", "name": "부처님오신날", "category": "public_holiday"},
    {"date": "2026-05-25", "name": "부처님오신날 대체공휴일", "category": "public_holiday"},
    {"date": "2026-06-03", "name": "전국동시지방선거", "category": "public_holiday"},
    {"date": "2026-06-06", "name": "현충일", "category": "public_holiday"},
    {"date": "2026-08-15", "name": "광복절", "category": "public_holiday"},
    {"date": "2026-08-17", "name": "광복절 대체공휴일", "category": "public_holiday"},
    {"date": "2026-09-24", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2026-09-25", "name": "추석", "category": "public_holiday"},
    {"date": "2026-09-26", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2026-10-03", "name": "개천절", "category": "public_holiday"},
    {"date": "2026-10-05", "name": "개천절 대체공휴일", "category": "public_holiday"},
    {"date": "2026-10-09", "name": "한글날", "category": "public_holiday"},
    {"date": "2026-12-25", "name": "크리스마스", "category": "public_holiday"},
    # 2027
    {"date": "2027-01-01", "name": "신년", "category": "public_holiday"},
    {"date": "2027-02-06", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2027-02-07", "name": "설날", "category": "public_holiday"},
    {"date": "2027-02-08", "name": "설날 연휴", "category": "public_holiday"},
    {"date": "2027-02-09", "name": "설날 대체공휴일", "category": "public_holiday"},
    {"date": "2027-03-01", "name": "삼일절", "category": "public_holiday"},
    {"date": "2027-05-03", "name": "근로자의날 대체공휴일", "category": "public_holiday"},
    {"date": "2027-05-05", "name": "어린이날", "category": "public_holiday"},
    {"date": "2027-05-13", "name": "부처님오신날", "category": "public_holiday"},
    {"date": "2027-06-06", "name": "현충일", "category": "public_holiday"},
    {"date": "2027-08-15", "name": "광복절", "category": "public_holiday"},
    {"date": "2027-08-16", "name": "광복절 대체공휴일", "category": "public_holiday"},
    {"date": "2027-09-14", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2027-09-15", "name": "추석", "category": "public_holiday"},
    {"date": "2027-09-16", "name": "추석 연휴", "category": "public_holiday"},
    {"date": "2027-10-03", "name": "개천절", "category": "public_holiday"},
    {"date": "2027-10-04", "name": "개천절 대체공휴일", "category": "public_holiday"},
    {"date": "2027-10-09", "name": "한글날", "category": "public_holiday"},
    {"date": "2027-10-11", "name": "한글날 대체공휴일", "category": "public_holiday"},
    {"date": "2027-12-25", "name": "크리스마스", "category": "public_holiday"},
]


async def get_holidays(
    start_date: str | None = None,
    end_date: str | None = None,
    category: str | None = None,
) -> list[dict[str, Any]]:
    """Get holidays within a date range.
    
    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        category: Filter by category (public_holiday, observance, special_date)
    
    Returns:
        List of holiday dictionaries
    """
    params = {
        "select": "id,date,name,category,description",
        "is_active": "eq.true",
        "order": "date.asc",
    }
    
    if start_date:
        params["date"] = f"gte.{start_date}"
    if end_date:
        if "date" in params:
            params["and"] = f"(date.gte.{start_date},date.lte.{end_date})"
        else:
            params["date"] = f"lte.{end_date}"
    if category:
        params["category"] = f"eq.{category}"
    
    try:
        holidays = await _request("GET", "holidays", params=params)
        return holidays if isinstance(holidays, list) else []
    except Exception:
        # Return empty list on error instead of raising
        return []


async def sync_holidays() -> dict[str, Any]:
    """Sync Korean holidays to the database.
    
    Returns:
        Dictionary with sync results
    """
    try:
        # Get existing holidays
        existing = await _request("GET", "holidays", params={"select": "date"})
        existing_dates = {h.get("date") for h in (existing or [])}
        
        # Filter new holidays
        new_holidays = [h for h in KOREAN_HOLIDAYS if h["date"] not in existing_dates]
        
        if not new_holidays:
            return {"status": "success", "synced": 0, "message": "No new holidays to sync"}
        
        # Insert new holidays
        result = await _request("POST", "holidays", payload=new_holidays)
        return {
            "status": "success",
            "synced": len(new_holidays),
            "message": f"Successfully synced {len(new_holidays)} holidays",
        }
    except Exception as e:
        return {
            "status": "error",
            "synced": 0,
            "message": f"Failed to sync holidays: {str(e)}",
        }
