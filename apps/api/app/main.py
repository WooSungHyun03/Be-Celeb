# Creates the FastAPI application and registers API routers.
from fastapi import FastAPI

from app.api.routes import account, admin, health, recommendations, trends, main, youtube_content
from app.core.config import get_settings
from app.core.cors import configure_cors

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI support service for Be Celeb YouTube analysis workflows.",
)

configure_cors(app, settings)

app.include_router(health)
app.include_router(trends)
app.include_router(recommendations)
app.include_router(youtube_content)
app.include_router(admin)
app.include_router(account)
app.include_router(main, prefix="/api/v1")
