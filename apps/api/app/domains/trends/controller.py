from app.domains.recommendations.controller import popular_videos, trend_keywords
from app.api.routes.trends import list_trends

__all__ = ["list_trends", "popular_videos", "trend_keywords"]
