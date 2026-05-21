from fastapi import APIRouter

from app.domains.collection.controller import collect_daily_videos, refresh_growth_reports_cron

router = APIRouter(prefix="/api/cron", tags=["collection"])

router.add_api_route("/collect-daily-videos", collect_daily_videos, methods=["POST"], response_model=None)
router.add_api_route("/refresh-growth-reports", refresh_growth_reports_cron, methods=["POST"], response_model=None)
