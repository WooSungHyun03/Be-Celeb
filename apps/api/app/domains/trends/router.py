from fastapi import APIRouter

from app.domains.trends.controller import list_trends, popular_videos, trend_keywords

router = APIRouter(tags=["trends"])

router.add_api_route("/trends", list_trends, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/popular-videos", popular_videos, methods=["GET"], response_model=None)
router.add_api_route("/api/trends/keywords", trend_keywords, methods=["GET"], response_model=None)
