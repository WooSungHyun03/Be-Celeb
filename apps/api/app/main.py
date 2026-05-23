# Creates the FastAPI application and registers API routers.
from fastapi import FastAPI

from app.api.routes import health, main
from app.core.config import get_settings
from app.core.cors import configure_cors
from app.core.logging import configure_logging
from app.domains.admin.router import router as admin_router
from app.domains.calendar.router import router as calendar_router
from app.domains.collection.router import router as collection_router
from app.domains.growth.router import router as growth_router
from app.domains.production_board.router import production_items_router, router as production_board_router
from app.domains.recommendations.router import router as recommendation_router
from app.domains.shop.router import router as shop_router
from app.domains.trends.router import router as trend_router
from app.domains.users.router import router as user_router

configure_logging()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI support service for Be Celeb YouTube analysis workflows.",
)

configure_cors(app, settings)

app.include_router(health)
app.include_router(trend_router)
app.include_router(recommendation_router)
app.include_router(admin_router)
app.include_router(user_router)
app.include_router(calendar_router)
app.include_router(growth_router)
app.include_router(shop_router)
app.include_router(production_board_router)
app.include_router(production_items_router)
app.include_router(collection_router)
app.include_router(main, prefix="/api/v1")
