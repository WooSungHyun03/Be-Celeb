from __future__ import annotations

from typing import Any

from fastapi import Header
from fastapi.responses import JSONResponse

from app.core.errors import BackendApiError
from app.core.responses import ApiResponse, error_response
from app.domains.video_analysis.schemas import GenerateStoryboardRequest, GenerateStoryboardResponse, TranscribeRequest, TranscribeResponse
from app.domains.video_analysis.service import create_video_analysis_from_url, create_video_analysis_from_youtube_video, generate_storyboard_from_analysis, get_video_analysis
from app.services.auth_service import access_token_from_authorization, get_user_from_access_token


async def transcribe_video(
    request: TranscribeRequest,
    authorization: str | None = Header(default=None),
) -> ApiResponse[TranscribeResponse] | JSONResponse:
    try:
        user = await get_user_from_access_token(access_token_from_authorization(authorization))
        user_id = user.get("id") if user else None
        if request.youtubeVideoId:
            analysis = await create_video_analysis_from_youtube_video(request.youtubeVideoId)
            if analysis is None:
                raise BackendApiError("Video analysis already exists for this YouTube video.", 409, "VIDEO_ANALYSIS_EXISTS")
        elif request.videoUrl:
            analysis = await create_video_analysis_from_url(request.videoUrl, user_id=user_id)
        else:
            raise BackendApiError("videoUrl or youtubeVideoId is required.", 400, "VALIDATION_ERROR")
        return ApiResponse(success=True, data=TranscribeResponse(analysis=analysis))
    except Exception as error:
        return error_response(error)


async def generate_storyboard(
    request: GenerateStoryboardRequest,
    authorization: str | None = Header(default=None),
) -> ApiResponse[GenerateStoryboardResponse] | JSONResponse:
    try:
        user = await get_user_from_access_token(access_token_from_authorization(authorization))
        user_id = user.get("id") if user else None
        storyboard = await generate_storyboard_from_analysis(
            request.videoAnalysisId,
            user_id=user_id,
            channel_url=request.channelUrl,
            category=request.category,
        )
        analysis = await get_video_analysis(request.videoAnalysisId, user_id)
        return ApiResponse(success=True, data=GenerateStoryboardResponse(analysis=analysis, storyboard=storyboard))
    except Exception as error:
        return error_response(error)


async def video_analysis_detail(
    analysis_id: str,
    authorization: str | None = Header(default=None),
) -> ApiResponse[Any] | JSONResponse:
    try:
        user = await get_user_from_access_token(access_token_from_authorization(authorization))
        return ApiResponse(success=True, data={"analysis": await get_video_analysis(analysis_id, user.get("id") if user else None)})
    except Exception as error:
        return error_response(error)
