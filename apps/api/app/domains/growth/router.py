from fastapi import APIRouter

from app.domains.growth.controller import growth_report, refresh_report

router = APIRouter(prefix="/api/growth-report", tags=["growth"])

router.add_api_route("", growth_report, methods=["GET"], response_model=None)
router.add_api_route("/refresh", refresh_report, methods=["POST"], response_model=None)
