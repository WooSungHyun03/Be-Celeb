from fastapi import APIRouter

from app.domains.trends.controller import (
    combined_trends,
    collect_naver_trends_cron,
    list_trends,
    naver_keywords,
    popular_videos,
    trend_keywords,
)

router = APIRouter(tags=["trends"])

router.add_api_route("/trends", list_trends, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/popular-videos", popular_videos, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/keywords", trend_keywords, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/naver-keywords", naver_keywords, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/combined", combined_trends, methods=["GET"], response_model=None)
router.add_api_route("/api/cron/collect-naver-trends", collect_naver_trends_cron, methods=["POST"], response_model=None)
