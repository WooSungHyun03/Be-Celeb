from __future__ import annotations

import asyncio
import re
import json
import mimetypes
import os
import shutil
import stat
import tempfile
from html import unescape
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.core.errors import BackendApiError, ForbiddenException, missing_env
from app.core.logging import get_logger
from app.domains.video_analysis.schemas import TranscriptSegment, VideoAnalysisRecord
from app.services.llm_service import call_local_llm, parse_llm_json_with_fallback
from app.services.text_sanitizer import KOREAN_ONLY_OUTPUT_INSTRUCTION, sanitize_user_facing_text

logger = get_logger(__name__)

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

YOUTUBE_COOKIE_REQUIRED_MARKERS = (
    "sign in to confirm",
    "confirm you're not a bot",
    "confirm you’re not a bot",
    "not a bot",
    "use --cookies-from-browser or --cookies",
    "cookies are no longer valid",
    "cookies file",
)
YOUTUBE_UNAVAILABLE_FOR_ANALYSIS_MARKERS = (
    "this live event will begin",
    "premieres in",
    "not made this video available in your country",
    "private video",
    "video unavailable",
    "this video is unavailable",
    "has been removed",
    "copyright",
    "members-only",
    "requires payment",
)
YOUTUBE_SUBTITLE_LANGUAGES = ("ko", "ko-KR", "en", "en-US")
YTDLP_TIMEOUT_SECONDS = 120

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
    return await _insert_video_analysis(
        transcript=transcript,
        segments=segments,
        raw=raw,
        source="whisper",
        user_id=user_id,
        video_url=video_url,
        youtube_video_id=youtube_video_id,
        influencer_video_id=influencer_video_id,
        title=title,
        source_filename=filename,
        content_type=content_type,
    )


async def _insert_video_analysis(
    *,
    transcript: str,
    segments: list[TranscriptSegment],
    raw: dict[str, Any],
    source: str,
    user_id: str | None = None,
    video_url: str | None = None,
    youtube_video_id: str | None = None,
    influencer_video_id: str | None = None,
    title: str | None = None,
    source_filename: str | None = None,
    content_type: str | None = None,
) -> VideoAnalysisRecord:
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
                "source": source,
                "sourceFilename": source_filename,
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
    video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
    subtitle_result = await _extract_youtube_subtitles(youtube_video_id)
    if subtitle_result:
        transcript, segments, raw = subtitle_result
        return await _insert_video_analysis(
            transcript=transcript,
            segments=segments,
            raw=raw,
            source="youtube_subtitles",
            video_url=video_url,
            youtube_video_id=youtube_video_id,
            influencer_video_id=influencer_video_id,
            title=title,
            source_filename=f"{youtube_video_id}.subtitles",
            content_type="text/plain",
        )

    try:
        media, filename, content_type = await _download_youtube_audio(youtube_video_id)
    except BackendApiError as error:
        if error.code in {"YOUTUBE_REQUIRES_COOKIES", "YOUTUBE_UNAVAILABLE_FOR_ANALYSIS"}:
            raise BackendApiError(
                f"No public or automatic YouTube subtitles were found before audio fallback. {error}",
                error.status_code,
                error.code,
            ) from error
        raise
    return await create_video_analysis(
        media=media,
        filename=filename,
        content_type=content_type,
        video_url=video_url,
        youtube_video_id=youtube_video_id,
        influencer_video_id=influencer_video_id,
        title=title,
    )


async def _extract_youtube_subtitles(youtube_video_id: str) -> tuple[str, list[TranscriptSegment], dict[str, Any]] | None:
    try:
        from yt_dlp import YoutubeDL
    except ImportError:
        return None

    video_url = f"https://www.youtube.com/watch?v={youtube_video_id}"
    with tempfile.TemporaryDirectory() as temp_dir:
        options: dict[str, Any] = {
            "quiet": True,
            "skip_download": True,
            "noplaylist": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": list(YOUTUBE_SUBTITLE_LANGUAGES),
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
            "cachedir": str(Path(temp_dir) / "yt-dlp-cache"),
            "paths": {"home": temp_dir, "temp": temp_dir},
            "socket_timeout": 30,
            "retries": 2,
            "fragment_retries": 2,
        }
        _set_ytdlp_cookiefile_option(options, temp_dir)
        try:
            with YoutubeDL(options) as downloader:
                info = await _run_ytdlp_info(downloader, video_url)
        except Exception as error:
            _raise_youtube_extraction_error(error)

    subtitle_entry = _select_subtitle_entry(info)
    if not subtitle_entry:
        return None

    segments = await _download_subtitle_segments(str(subtitle_entry["url"]), str(subtitle_entry.get("ext") or ""))
    transcript = sanitize_user_facing_text(" ".join(segment.text for segment in segments))
    if not transcript:
        return None
    return transcript, segments, {
        "duration": info.get("duration") if isinstance(info, dict) else None,
        "subtitleLanguage": subtitle_entry.get("language"),
        "subtitleExtension": subtitle_entry.get("ext"),
        "subtitleSource": subtitle_entry.get("source"),
    }


def _select_subtitle_entry(info: Any) -> dict[str, Any] | None:
    if not isinstance(info, dict):
        return None
    sources = (("subtitles", info.get("subtitles")), ("automatic_captions", info.get("automatic_captions")))
    for source_name, source in sources:
        if not isinstance(source, dict):
            continue
        for language in YOUTUBE_SUBTITLE_LANGUAGES:
            entries = source.get(language)
            if not isinstance(entries, list):
                continue
            for preferred_ext in ("json3", "vtt", "srv3", "ttml"):
                for entry in entries:
                    if not isinstance(entry, dict) or not entry.get("url"):
                        continue
                    if str(entry.get("ext") or "").lower() == preferred_ext:
                        return {**entry, "language": language, "source": source_name}
    return None


async def _download_subtitle_segments(url: str, extension: str) -> list[TranscriptSegment]:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url)
    if response.status_code >= 400:
        return []
    text = response.text
    if extension.lower() == "json3":
        return _parse_json3_subtitles(text)
    return _parse_timed_text_subtitles(text)


def _parse_json3_subtitles(text: str) -> list[TranscriptSegment]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return []
    segments: list[TranscriptSegment] = []
    events = payload.get("events") if isinstance(payload, dict) else None
    if not isinstance(events, list):
        return []
    for event in events:
        if not isinstance(event, dict):
            continue
        pieces = event.get("segs")
        if not isinstance(pieces, list):
            continue
        line = sanitize_user_facing_text("".join(str(piece.get("utf8") or "") for piece in pieces if isinstance(piece, dict)))
        if not line:
            continue
        start_ms = event.get("tStartMs")
        duration_ms = event.get("dDurationMs")
        start = float(start_ms) / 1000 if isinstance(start_ms, (int, float)) else None
        end = start + (float(duration_ms) / 1000) if start is not None and isinstance(duration_ms, (int, float)) else None
        segments.append(TranscriptSegment(start=start, end=end, text=line))
    return segments


def _parse_timed_text_subtitles(text: str) -> list[TranscriptSegment]:
    segments: list[TranscriptSegment] = []
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n"))
    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        time_index = next((index for index, line in enumerate(lines) if "-->" in line), None)
        if time_index is None:
            continue
        start, end = _parse_subtitle_time_range(lines[time_index])
        caption_text = sanitize_user_facing_text(
            " ".join(_strip_subtitle_markup(line) for line in lines[time_index + 1 :])
        )
        if caption_text:
            segments.append(TranscriptSegment(start=start, end=end, text=caption_text))
    return segments


def _parse_subtitle_time_range(value: str) -> tuple[float | None, float | None]:
    parts = value.split("-->", 1)
    if len(parts) != 2:
        return None, None
    return _parse_subtitle_time(parts[0]), _parse_subtitle_time(parts[1].split()[0])


def _parse_subtitle_time(value: str) -> float | None:
    match = re.search(r"(?:(\d+):)?(\d+):(\d+(?:[\.,]\d+)?)", value.strip())
    if not match:
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2))
    seconds = float(match.group(3).replace(",", "."))
    return hours * 3600 + minutes * 60 + seconds


def _strip_subtitle_markup(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", "", value)
    return unescape(without_tags).strip()


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
            "format": "worstaudio[filesize<24M]/worstaudio[filesize_approx<24M]/worstaudio/worst",
            "outtmpl": outtmpl,
            "quiet": True,
            "noplaylist": True,
            "max_filesize": settings.video_analysis_max_bytes,
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
            "cachedir": str(Path(temp_dir) / "yt-dlp-cache"),
            "paths": {"home": temp_dir, "temp": temp_dir},
            "socket_timeout": 30,
            "retries": 2,
            "fragment_retries": 2,
        }
        _set_ytdlp_cookiefile_option(options, temp_dir)
        try:
            with YoutubeDL(options) as downloader:
                info = await _run_ytdlp_extract(downloader, video_url)
                downloaded = Path(downloader.prepare_filename(info))
        except Exception as error:
            _raise_youtube_extraction_error(error)
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
    return await asyncio.wait_for(
        asyncio.to_thread(downloader.extract_info, video_url, True),
        timeout=YTDLP_TIMEOUT_SECONDS,
    )


async def _run_ytdlp_info(downloader: Any, video_url: str) -> dict[str, Any]:
    return await asyncio.wait_for(
        asyncio.to_thread(downloader.extract_info, video_url, False),
        timeout=YTDLP_TIMEOUT_SECONDS,
    )


def _set_ytdlp_cookiefile_option(options: dict[str, Any], temp_dir: str) -> None:
    runtime_cookie_file = _prepare_runtime_cookie_file(temp_dir)
    if not runtime_cookie_file:
        return
    options["cookiefile"] = runtime_cookie_file


def _prepare_runtime_cookie_file(temp_dir: str) -> str | None:
    settings = get_settings()
    cookie_file = settings.youtube_cookies_file
    if not cookie_file:
        return None

    source = Path(cookie_file)
    source_label = _masked_path(source)
    try:
        if not source.is_file():
            logger.warning("YouTube cookies source is configured but not readable as a file: %s", source_label)
            return None

        runtime_path = _runtime_cookie_path(temp_dir, settings.youtube_cookies_runtime_file)
        runtime_path.parent.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as source_handle:
            fd = os.open(str(runtime_path), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "wb") as runtime_handle:
                shutil.copyfileobj(source_handle, runtime_handle)
        try:
            runtime_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
        except OSError:
            logger.debug("Could not chmod YouTube runtime cookies file; continuing with platform defaults.")
        logger.debug(
            "Prepared YouTube runtime cookies file sourceReadable=%s runtimeWritable=%s",
            True,
            _is_writable_file(runtime_path),
        )
        return str(runtime_path)
    except OSError as error:
        logger.warning(
            "Failed to prepare writable YouTube runtime cookies file source=%s reason=%s",
            source_label,
            error.__class__.__name__,
        )
        return None


def _runtime_cookie_path(temp_dir: str, configured_runtime_path: str | None) -> Path:
    if not configured_runtime_path:
        return Path(temp_dir) / "youtube-cookies.txt"

    configured = Path(configured_runtime_path)
    configured_text = str(configured)
    if configured_text.endswith(("/", "\\")) or configured.suffix == "":
        runtime_dir = configured
        filename = "youtube-cookies.txt"
    else:
        runtime_dir = configured.parent
        filename = configured.name
    stem = Path(filename).stem or "youtube-cookies"
    suffix = Path(filename).suffix or ".txt"
    return runtime_dir / f"{stem}-{uuid4().hex}{suffix}"


def _is_writable_file(path: Path) -> bool:
    return path.is_file() and os.access(path, os.W_OK)


def _masked_path(path: Path) -> str:
    name = path.name or "configured-file"
    parent = path.parent.name
    return f".../{parent}/{name}" if parent else f".../{name}"


def _raise_youtube_extraction_error(error: Exception) -> None:
    error_message = str(error)
    normalized_message = error_message.lower()
    if isinstance(error, asyncio.TimeoutError):
        raise BackendApiError(
            "YouTube analysis timed out while fetching subtitles or audio.",
            504,
            "YOUTUBE_ANALYSIS_TIMEOUT",
        ) from error
    if _looks_like_cookie_file_runtime_error(normalized_message):
        raise BackendApiError(
            f"YouTube cookies could not be prepared for analysis. {_youtube_cookie_status_message()}",
            409,
            "YOUTUBE_COOKIE_FILE_UNAVAILABLE",
        ) from error
    if any(marker in normalized_message for marker in YOUTUBE_COOKIE_REQUIRED_MARKERS):
        raise BackendApiError(
            f"YouTube requires a signed-in cookies file for this video. {_youtube_cookie_status_message()}",
            409,
            "YOUTUBE_REQUIRES_COOKIES",
        ) from error
    if any(marker in normalized_message for marker in YOUTUBE_UNAVAILABLE_FOR_ANALYSIS_MARKERS):
        raise BackendApiError(
            "This YouTube video is not currently available for transcript analysis.",
            409,
            "YOUTUBE_UNAVAILABLE_FOR_ANALYSIS",
        ) from error
    raise BackendApiError(
        f"YouTube audio extraction failed: {_safe_ytdlp_error_message(error_message)}",
        502,
        "YOUTUBE_AUDIO_EXTRACTION_FAILED",
    ) from error


def _looks_like_cookie_file_runtime_error(error_message: str) -> bool:
    if "read-only file system" in error_message or "[errno 30]" in error_message:
        return "cookie" in error_message or "cookies" in error_message or "/etc/secrets" in error_message
    if "permission denied" in error_message:
        return "cookie" in error_message or "cookies" in error_message
    return False


def _safe_ytdlp_error_message(error_message: str) -> str:
    sanitized = re.sub(r"(/[A-Za-z0-9._-]+)+/youtube-cookies\.txt", ".../youtube-cookies.txt", error_message)
    sanitized = re.sub(r"([A-Za-z]:\\(?:[^\\/:*?\"<>|\r\n]+\\)*youtube-cookies\.txt)", r"...\\youtube-cookies.txt", sanitized)
    return sanitized[:500]


def _youtube_cookie_status_message() -> str:
    cookie_file = get_settings().youtube_cookies_file
    if not cookie_file:
        return "YOUTUBE_COOKIES_FILE/YOUTUBE_COOKIES_PATH is not configured."
    if Path(cookie_file).is_file():
        return "A cookies source is configured and readable; a writable runtime copy will be used."
    return "A cookies source is configured but the file is not readable in the backend runtime."


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
