from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CalendarEventStatus = Literal["planned", "scripted", "filmed", "edited", "uploaded", "filming", "editing", "scheduled"]


class CalendarEventPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    favorite_id: str | None = Field(default=None, alias="favoriteId")
    production_item_id: str | None = Field(default=None, alias="productionItemId")
    title: str = Field(min_length=1)
    description: str | None = None
    scheduled_date: str | None = Field(default=None, alias="scheduledDate", min_length=10, max_length=10)
    start_date: str | None = Field(default=None, alias="startDate", min_length=10, max_length=10)
    end_date: str | None = Field(default=None, alias="endDate", min_length=10, max_length=10)
    start_time: str | None = Field(default=None, alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    status: CalendarEventStatus = "planned"
    color: str | None = None
    platform: str = "youtube"
    metadata: dict[str, Any] | None = None


class CalendarEventUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    favorite_id: str | None = Field(default=None, alias="favoriteId")
    production_item_id: str | None = Field(default=None, alias="productionItemId")
    title: str | None = None
    description: str | None = None
    scheduled_date: str | None = Field(default=None, alias="scheduledDate")
    start_date: str | None = Field(default=None, alias="startDate")
    end_date: str | None = Field(default=None, alias="endDate")
    start_time: str | None = Field(default=None, alias="startTime")
    end_time: str | None = Field(default=None, alias="endTime")
    status: CalendarEventStatus | None = None
    color: str | None = None
    platform: str | None = None
    metadata: dict[str, Any] | None = None
