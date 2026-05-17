from fastapi import APIRouter

from app.domains.collection.controller import collect_daily_videos

router = APIRouter(prefix="/api/cron", tags=["collection"])

router.add_api_route("/collect-daily-videos", collect_daily_videos, methods=["POST"], response_model=None)
