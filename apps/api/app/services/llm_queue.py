from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass
from time import monotonic
from uuid import uuid4

from app.core.errors import BackendApiError
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class LLMQueueEntry:
    id: str
    owner_id: str | None
    purpose: str
    queued_at: float


_state_lock = asyncio.Lock()
_execution_lock = asyncio.Lock()
_pending: list[LLMQueueEntry] = []
_processing: LLMQueueEntry | None = None
_active_owner_ids: set[str] = set()


def _entry_position(entry_id: str) -> int | None:
    for index, entry in enumerate(_pending, start=1):
        if entry.id == entry_id:
            return index
    return None


@asynccontextmanager
async def queued_llm_call(owner_id: str | None = None, purpose: str = "local_llm"):
    global _processing

    entry = LLMQueueEntry(id=str(uuid4()), owner_id=owner_id, purpose=purpose, queued_at=monotonic())

    async with _state_lock:
        if owner_id and owner_id in _active_owner_ids:
            raise BackendApiError("이미 처리 중인 콘텐츠 추천 요청이 있습니다.", 409, "LLM_REQUEST_IN_PROGRESS")
        if owner_id:
            _active_owner_ids.add(owner_id)
        _pending.append(entry)
        position = _entry_position(entry.id) or len(_pending)

    logger.info("LLM request queued: purpose=%s owner=%s position=%s", purpose, bool(owner_id), position)

    try:
        async with _execution_lock:
            async with _state_lock:
                _pending[:] = [item for item in _pending if item.id != entry.id]
                _processing = entry
                waited_seconds = monotonic() - entry.queued_at

            logger.info("LLM request started: purpose=%s waitedSeconds=%.2f", purpose, waited_seconds)
            yield {
                "id": entry.id,
                "purpose": entry.purpose,
                "waitedSeconds": waited_seconds,
            }
    finally:
        async with _state_lock:
            if _processing and _processing.id == entry.id:
                _processing = None
            _pending[:] = [item for item in _pending if item.id != entry.id]
            if owner_id:
                _active_owner_ids.discard(owner_id)


async def get_llm_queue_status(owner_id: str | None = None) -> dict[str, int | str | bool | None]:
    async with _state_lock:
        owner_pending_index = None
        if owner_id:
            for index, entry in enumerate(_pending, start=1):
                if entry.owner_id == owner_id:
                    owner_pending_index = index
                    break

        is_owner_processing = bool(owner_id and _processing and _processing.owner_id == owner_id)
        if owner_pending_index is not None:
            state = "queued"
            position = owner_pending_index
        elif is_owner_processing:
            state = "processing"
            position = 0
        else:
            state = "idle"
            position = None

        return {
            "state": state,
            "position": position,
            "pendingCount": len(_pending),
            "isProcessing": _processing is not None,
        }
