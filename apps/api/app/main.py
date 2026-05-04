# Creates the FastAPI application and registers mock API routers.
from fastapi import FastAPI

from app.api.routes import analysis, health, recommendations, trends
from app.core.config import get_settings
from app.core.cors import configure_cors

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Mock-only FastAPI skeleton for Be Celeb AI/Data Analysis.",
)

configure_cors(app, settings)

app.include_router(health.router)
app.include_router(trends.router)
app.include_router(recommendations.router)
app.include_router(analysis.router)
