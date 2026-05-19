from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ProductionBoardStatus = Literal["idea", "script", "filming", "editing", "uploaded"]
ProductionBoardPriority = Literal["low", "normal", "high"]


class ProductionBoardCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    favorite_id: str | None = Field(default=None, alias="favoriteId")
    recommendation_id: str | None = Field(default=None, alias="recommendationId")


class ProductionBoardStatusUpdatePayload(BaseModel):
    status: str = Field(min_length=1)


class ProductionBoardItem(BaseModel):
    id: str
    userId: str
    favoriteId: str | None = None
    recommendationId: str | None = None
    title: str
    hook: str | None = None
    reason: str | None = None
    hashtags: list[str] = Field(default_factory=list)
    storyboard: Any | None = None
    category: str | None = None
    status: ProductionBoardStatus
    priority: ProductionBoardPriority
    memo: str | None = None
    dueDate: str | None = None
    uploadScheduledAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
