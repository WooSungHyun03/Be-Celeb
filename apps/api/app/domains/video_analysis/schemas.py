from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    start: float | None = None
    end: float | None = None
    text: str


class VideoAnalysisRecord(BaseModel):
    id: str
    userId: str | None = None
    influencerVideoId: str | None = None
    youtubeVideoId: str | None = None
    title: str | None = None
    videoUrl: str | None = None
    transcript: str
    transcriptSegments: list[TranscriptSegment] = Field(default_factory=list)
    sceneSummary: str | None = None
    storyboardResult: dict[str, Any] | None = None
    analysisResult: dict[str, Any] | None = None
    createdAt: str | None = None


class TranscribeResponse(BaseModel):
    analysis: VideoAnalysisRecord


class TranscribeRequest(BaseModel):
    videoUrl: str | None = None
    youtubeVideoId: str | None = None


class GenerateStoryboardRequest(BaseModel):
    videoAnalysisId: str
    channelUrl: str | None = None
    category: str | None = None


class GenerateStoryboardResponse(BaseModel):
    analysis: VideoAnalysisRecord
    storyboard: dict[str, Any]
