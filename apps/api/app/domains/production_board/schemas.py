from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProductionBoardStatus = Literal["idea", "planned", "filming", "editing", "scheduled", "uploaded"]
ProductionBoardPriority = Literal["low", "normal", "high"]


class ProductionBoardCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    favorite_id: str | None = Field(default=None, alias="favoriteId")
    recommendation_id: str | None = Field(default=None, alias="recommendationId")
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    memo: str | None = Field(default=None, max_length=3000)
    hashtags: list[str] | None = None
    storyboard: Any | None = None
    status: ProductionBoardStatus = "idea"
    shoot_start_date: str | None = Field(default=None, alias="shootStartDate")
    shoot_end_date: str | None = Field(default=None, alias="shootEndDate")
    metadata: dict[str, Any] | None = None


class ProductionBoardUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=3000)
    memo: str | None = Field(default=None, max_length=3000)
    hashtags: list[str] | None = None
    storyboard: Any | None = None
    status: ProductionBoardStatus | None = None
    shoot_start_date: str | None = Field(default=None, alias="shootStartDate")
    shoot_end_date: str | None = Field(default=None, alias="shootEndDate")
    metadata: dict[str, Any] | None = None


class ProductionBoardStatusUpdatePayload(BaseModel):
    status: str = Field(min_length=1)


class ProductionBoardMemoUpdatePayload(BaseModel):
    memo: str = Field(default="", max_length=1000)


class ProductionBoardChecklistCreatePayload(BaseModel):
    text: str = Field(min_length=1, max_length=200)


class ProductionBoardChecklistUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str | None = Field(default=None, min_length=1, max_length=200)
    is_done: bool | None = Field(default=None, alias="isDone")


class ProductionBoardItem(BaseModel):
    id: str
    userId: str
    favoriteId: str | None = None
    recommendationId: str | None = None
    calendarEventId: str | None = None
    title: str
    description: str | None = None
    hook: str | None = None
    reason: str | None = None
    hashtags: list[str] = Field(default_factory=list)
    storyboard: Any | None = None
    category: str | None = None
    status: ProductionBoardStatus
    priority: ProductionBoardPriority
    memo: str | None = None
    shootStartDate: str | None = None
    shootEndDate: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    checklistTotal: int = 0
    checklistDone: int = 0
    dueDate: str | None = None
    uploadScheduledAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
