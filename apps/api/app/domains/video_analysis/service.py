from __future__ import annotations

import asyncio
import json
import mimetypes
import tempfile
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, ForbiddenException, missing_env
from app.domains.video_analysis.schemas import TranscriptSegment, VideoAnalysisRecord
from app.services.llm_service import call_local_llm, parse_llm_json_with_fallback
from app.services.text_sanitizer import KOREAN_ONLY_OUTPUT_INSTRUCTION, sanitize_user_facing_text

MEDIA_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/webm",
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/quicktime",
}

SELECT_COLUMNS = (
    "id,user_id,influencer_video_id,youtube_video_id,title,video_url,transcript,"
    "transcript_segments,scene_summary,storyboard_result,analysis_result,created_at"
)


def _supabase_url() -> str:
    settings = get_settings()
    if not settings.supabase_url:
        raise missing_env("SUPABASE_URL")
    return settings.supabase_url.rstrip("/").removesuffix("/rest/v1")


def _headers(prefer: str | None = None) -> dict[str, str]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise missing_env("SUPABASE_SERVICE_ROLE_KEY")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method,
            f"{_supabase_url()}/rest/v1/{path}",
            headers=_headers(prefer),
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


def _segment_from_value(value: Any) -> TranscriptSegment | None:
    if not isinstance(value, dict):
        return None
    text = value.get("text")
    if not isinstance(text, str) or not text.strip():
        return None
    start = value.get("start")
    end = value.get("end")
    return TranscriptSegment(
        start=float(start) if isinstance(start, (int, float)) else None,
        end=float(end) if isinstance(end, (int, float)) else None,
        text=sanitize_user_facing_text(text),
    )


def _record_from_row(row: dict[str, Any]) -> VideoAnalysisRecord:
    segments = row.get("transcript_segments") if isinstance(row.get("transcript_segments"), list) else []
    return VideoAnalysisRecord(
        id=str(row.get("id")),
        userId=row.get("user_id") if isinstance(row.get("user_id"), str) else None,
        influencerVideoId=row.get("influencer_video_id") if isinstance(row.get("influencer_video_id"), str) else None,
        youtubeVideoId=row.get("youtube_video_id") if isinstance(row.get("youtube_video_id"), str) else None,
        title=row.get("title") if isinstance(row.get("title"), str) else None,
        videoUrl=row.get("video_url") if isinstance(row.get("video_url"), str) else None,
        transcript=sanitize_user_facing_text(row.get("transcript")) if isinstance(row.get("transcript"), str) else "",
        transcriptSegments=[segment for value in segments if (segment := _segment_from_value(value))],
        sceneSummary=sanitize_user_facing_text(row.get("scene_summary")) if isinstance(row.get("scene_summary"), str) else None,
        storyboardResult=row.get("storyboard_result") if isinstance(row.get("storyboard_result"), dict) else None,
        analysisResult=row.get("analysis_result") if isinstance(row.get("analysis_result"), dict) else None,
        createdAt=row.get("created_at") if isinstance(row.get("created_at"), str) else None,
    )


def _media_filename(filename: str | None, content_type: str | None) -> str:
    suffix = Path(filename or "").suffix
    if not suffix:
        suffix = mimetypes.guess_extension(content_type or "") or ".mp4"
    return f"video-analysis-{uuid4().hex}{suffix}"


def _compact_segments(segments: list[TranscriptSegment], limit: int = 18) -> list[dict[str, Any]]:
    return [segment.model_dump(mode="json") for segment in segments[:limit]]


def _build_scene_summary(segments: list[TranscriptSegment], transcript: str) -> str:
    if not segments:
        return transcript[:1200]
    summaries: list[str] = []
    for index, segment in enumerate(segments[:8], start=1):
        time_label = ""
        if segment.start is not None:
            time_label = f"{int(segment.start)}s"
            if segment.end is not None:
                time_label = f"{int(segment.start)}-{int(segment.end)}s"
        summaries.append(f"{index}. {time_label} {segment.text}".strip())
    return "\n".join(summaries)


async def _download_media(video_url: str) -> tuple[bytes, str, str]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        response = await client.get(video_url)
    if response.status_code >= 400:
        raise BackendApiError("Video file could not be downloaded from the URL.", 400, "VIDEO_DOWNLOAD_FAILED")
    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    if content_type and content_type not in MEDIA_CONTENT_TYPES:
        raise BackendApiError(
            "Only directly downloadable audio/video file URLs are supported by this endpoint.",
            400,
            "UNSUPPORTED_VIDEO_URL",
        )
    if len(response.content) > settings.video_analysis_max_bytes:
        raise BackendApiError("Video analysis file is too large.", 413, "VIDEO_TOO_LARGE")
    return response.content, _media_filename(None, content_type), content_type or "video/mp4"


async def transcribe_media(media: bytes, filename: str, content_type: str | None) -> tuple[str, list[TranscriptSegment], dict[str, Any]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise missing_env("OPENAI_API_KEY")
    if len(media) > settings.video_analysis_max_bytes:
        raise BackendApiError("Video analysis file is too large.", 413, "VIDEO_TOO_LARGE")

    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    data = {
        "model": settings.openai_transcription_model,
        "response_format": "verbose_json",
        "timestamp_granularities[]": "segment",
    }
    files = {"file": (filename, media, content_type or "application/octet-stream")}
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post("https://api.openai.com/v1/audio/transcriptions", headers=headers, data=data, files=files)
    if response.status_code >= 400:
        raise BackendApiError(response.text or "Whisper transcription failed.", 502, "WHISPER_API_ERROR")

    payload = response.json()
    transcript = sanitize_user_facing_text(payload.get("text")) if isinstance(payload.get("text"), str) else ""
    segments = [
        segment
        for value in payload.get("segments", [])
        if (segment := _segment_from_value(value)) is not None
    ] if isinstance(payload.get("segments"), list) else []
    if not transcript:
        transcript = sanitize_user_facing_text(" ".join(segment.text for segment in segments))
    if not transcript:
        raise BackendApiError("Whisper did not return transcript text.", 502, "EMPTY_TRANSCRIPT")
    return transcript, segments, payload


async def create_video_analysis_from_url(video_url: str, user_id: str | None = None) -> VideoAnalysisRecord:
    if not video_url.strip():
        raise BackendApiError("videoUrl is required.", 400, "VALIDATION_ERROR")
    media, filename, content_type = await _download_media(video_url.strip())
    return await create_video_analysis(
        media=media,
        filename=filename,
        content_type=content_type,
        user_id=user_id,
        video_url=video_url.strip(),
    )


async def create_video_analysis(
    media: bytes,
    filename: str | None,
    content_type: str | None,
    user_id: str | None = None,
    video_url: str | None = None,
    youtube_video_id: str | None = None,
    influencer_video_id: str | None = None,
    title: str | None = None,
) -> VideoAnalysisRecord:
    transcript, segments, raw = await transcribe_media(media, _media_filename(filename, content_type), content_type)
    scene_summary = _build_scene_summary(segments, transcript)
    rows = await _request(
        "POST",
        "video_analysis?on_conflict=youtube_video_id" if youtube_video_id else "video_analysis",
        payload={
            "user_id": user_id,
            "influencer_video_id": influencer_video_id,
            "youtube_video_id": youtube_video_id,
            "title": title,
            "video_url": video_url,
            "transcript": transcript,
            "transcript_segments": [segment.model_dump(mode="json") for segment in segments],
            "scene_summary": scene_summary,
            "analysis_result": {
                "sourceFilename": filename,
                "contentType": content_type,
                "segmentCount": len(segments),
                "rawDuration": raw.get("duration") if isinstance(raw, dict) else None,
            },
        },
        prefer="resolution=merge-duplicates,return=representation" if youtube_video_id else "return=representation",
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Video analysis insert did not return a row.", 502, "SUPABASE_ERROR")
    return _record_from_row(row)


async def get_video_analysis(analysis_id: str, user_id: str | None = None) -> VideoAnalysisRecord:
    rows = await _request(
        "GET",
        "video_analysis",
        params={"select": SELECT_COLUMNS, "id": f"eq.{analysis_id}", "limit": "1"},
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    if not row:
        raise BackendApiError("Video analysis was not found.", 404, "NOT_FOUND")
    owner = row.get("user_id")
    if isinstance(owner, str) and owner and (not user_id or owner != user_id):
        raise ForbiddenException("You do not have access to this video analysis.")
    return _record_from_row(row)


async def get_video_analysis_prompt_context(analysis_id: str | None, user_id: str | None = None) -> str | None:
    if not analysis_id:
        return None
    analysis = await get_video_analysis(analysis_id, user_id)
    context = {
        "videoAnalysisId": analysis.id,
        "videoUrl": analysis.videoUrl,
        "sceneSummary": analysis.sceneSummary,
        "transcript": analysis.transcript[:8000],
        "transcriptSegments": _compact_segments(analysis.transcriptSegments),
    }
    return json.dumps(context, ensure_ascii=False, indent=2)


async def get_video_analysis_by_youtube_id(youtube_video_id: str) -> VideoAnalysisRecord | None:
    rows = await _request(
        "GET",
        "video_analysis",
        params={"select": SELECT_COLUMNS, "youtube_video_id": f"eq.{youtube_video_id}", "limit": "1"},
    )
    row = rows[0] if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    return _record_from_row(row) if row else None


def _postgrest_in(values: list[str]) -> str:
    quoted = []
    for value in values:
        safe_value = value.replace('"', "")
        quoted.append(f'"{safe_value}"')
    return f"in.({','.join(quoted)})"


async def get_video_analysis_context_for_youtube_ids(youtube_video_ids: list[str], limit: int = 4) -> str | None:
    ids = [video_id for video_id in dict.fromkeys(youtube_video_ids) if video_id]
    if not ids:
        return None
    rows = await _request(
        "GET",
        "video_analysis",
        params={
            "select": SELECT_COLUMNS,
            "youtube_video_id": _postgrest_in(ids[:20]),
            "limit": str(limit),
        },
    )
    records = [_record_from_row(row) for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []
    if not records:
        return None
    context = [
        {
            "youtubeVideoId": record.youtubeVideoId,
            "title": record.title,
            "videoUrl": record.videoUrl,
            "sceneSummary": record.sceneSummary,
            "transcript": record.transcript[:4000],
            "transcriptSegments": _compact_segments(record.transcriptSegments, limit=10),
        }
        for record in records[:limit]
    ]
    return json.dumps(context, ensure_ascii=False, indent=2)


async def create_video_analysis_from_youtube_video(
    youtube_video_id: str,
    influencer_video_id: str | None = None,
    title: str | None = None,
) -> VideoAnalysisRecord | None:
    if await get_video_analysis_by_youtube_id(youtube_video_id):
        return None
    media, filename, content_type = await _download_youtube_audio(youtube_video_id)
    video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
    return await create_video_analysis(
        media=media,
        filename=filename,
        content_type=content_type,
        video_url=video_url,
        youtube_video_id=youtube_video_id,
        influencer_video_id=influencer_video_id,
        title=title,
    )


async def _download_youtube_audio(youtube_video_id: str) -> tuple[bytes, str, str]:
    try:
        from yt_dlp import YoutubeDL
    except ImportError as error:
        raise BackendApiError("yt-dlp dependency is required for YouTube audio extraction.", 500, "YTDLP_NOT_INSTALLED") from error

    settings = get_settings()
    video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
    with tempfile.TemporaryDirectory() as temp_dir:
        outtmpl = str(Path(temp_dir) / "%(id)s.%(ext)s")
        options = {
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            "quiet": True,
            "noplaylist": True,
            "max_filesize": settings.video_analysis_max_bytes,
        }
        try:
            with YoutubeDL(options) as downloader:
                info = await _run_ytdlp_extract(downloader, video_url)
                downloaded = Path(downloader.prepare_filename(info))
        except Exception as error:
            raise BackendApiError(f"YouTube audio extraction failed: {error}", 502, "YOUTUBE_AUDIO_EXTRACTION_FAILED") from error
        if not downloaded.exists():
            candidates = list(Path(temp_dir).glob(f"{youtube_video_id}.*"))
            downloaded = candidates[0] if candidates else downloaded
        if not downloaded.exists():
            raise BackendApiError("Downloaded YouTube audio file was not found.", 502, "YOUTUBE_AUDIO_NOT_FOUND")
        media = downloaded.read_bytes()
        if len(media) > settings.video_analysis_max_bytes:
            raise BackendApiError("Video analysis file is too large.", 413, "VIDEO_TOO_LARGE")
        content_type = mimetypes.guess_type(downloaded.name)[0] or "audio/webm"
        return media, downloaded.name, content_type


async def _run_ytdlp_extract(downloader: Any, video_url: str) -> dict[str, Any]:
    return await asyncio.to_thread(downloader.extract_info, video_url, True)


async def generate_storyboard_from_analysis(
    analysis_id: str,
    user_id: str | None = None,
    channel_url: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    analysis = await get_video_analysis(analysis_id, user_id)
    schema = {
        "hook": "첫 3초 후킹 멘트",
        "toneAnalysis": "말투/톤 분석",
        "captionStyle": "자막 스타일 제안",
        "hashtags": ["#추천태그"],
        "flowSummary": "영상 흐름 요약",
        "sceneSummary": "장면 요약",
        "storyboard": [
            {
                "scene": 1,
                "duration": "0-5s",
                "visual": "장면 구성",
                "dialogue": "대사 또는 내레이션",
                "caption": "자막",
                "shootingTip": "촬영/편집 팁",
            }
        ],
    }
    prompt = "\n\n".join(
        [
            "You are Be-Celeb's Korean YouTube storyboard strategist.",
            KOREAN_ONLY_OUTPUT_INSTRUCTION,
            "Use the transcript and timestamp segments to create an improved storyboard.",
            "Return valid JSON only.",
            "Required JSON schema:",
            json.dumps(schema, ensure_ascii=False, indent=2),
            "Context:",
            json.dumps(
                {
                    "channelUrl": channel_url,
                    "category": category,
                    "videoUrl": analysis.videoUrl,
                    "sceneSummary": analysis.sceneSummary,
                    "transcript": analysis.transcript[:10000],
                    "segments": _compact_segments(analysis.transcriptSegments, limit=40),
                },
                ensure_ascii=False,
                indent=2,
            ),
        ]
    )
    raw_text = await call_local_llm(prompt, max_tokens=5000)
    fallback = {
        "hook": analysis.transcript[:80],
        "toneAnalysis": "실제 말투를 바탕으로 자연스럽고 정보 전달 중심의 톤을 제안합니다.",
        "captionStyle": "핵심 단어를 짧게 강조하는 자막을 사용합니다.",
        "hashtags": ["#BeCeleb", "#콘텐츠기획"],
        "flowSummary": analysis.sceneSummary or analysis.transcript[:500],
        "sceneSummary": analysis.sceneSummary,
        "storyboard": [],
    }
    storyboard, _parse_error = parse_llm_json_with_fallback(raw_text, fallback)
    storyboard = _sanitize_storyboard_result(storyboard)
    rows = await _request(
        "PATCH",
        "video_analysis",
        params={"id": f"eq.{analysis.id}"},
        payload={
            "scene_summary": storyboard.get("sceneSummary") or analysis.sceneSummary,
            "storyboard_result": storyboard,
        },
        prefer="return=representation",
    )
    if not isinstance(rows, list) or not rows:
        raise BackendApiError("Storyboard update did not return a row.", 502, "SUPABASE_ERROR")
    return storyboard


def _sanitize_storyboard_result(value: dict[str, Any]) -> dict[str, Any]:
    sanitized: dict[str, Any] = {}
    for key, item in value.items():
        if isinstance(item, str):
            sanitized[key] = sanitize_user_facing_text(item)
        elif isinstance(item, list):
            if key == "storyboard":
                sanitized[key] = [_sanitize_scene(scene) for scene in item if isinstance(scene, dict)]
            else:
                sanitized[key] = [sanitize_user_facing_text(part) if isinstance(part, str) else part for part in item]
        else:
            sanitized[key] = item
    return sanitized


def _sanitize_scene(scene: dict[str, Any]) -> dict[str, Any]:
    return {
        key: sanitize_user_facing_text(value) if isinstance(value, str) else value
        for key, value in scene.items()
    }
