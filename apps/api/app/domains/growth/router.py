from fastapi import APIRouter

from app.domains.growth.controller import growth_report, growth_video_report, refresh_all_reports, refresh_report

router = APIRouter(prefix="/api/growth-report", tags=["growth"])

router.add_api_route("", growth_report, methods=["GET"], response_model=None)
router.add_api_route("/refresh", refresh_report, methods=["POST"], response_model=None)
router.add_api_route("/videos/{youtube_video_id}", growth_video_report, methods=["GET"], response_model=None)
router.add_api_route("/refresh-all", refresh_all_reports, methods=["POST"], response_model=None)
