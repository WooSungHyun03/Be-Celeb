# Creates the FastAPI application and registers API routers.
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import health, main
from app.core.config import get_settings
from app.core.cors import configure_cors
from app.core.exceptions import AppException
from app.core.logging import configure_logging, get_logger
from app.domains.admin.router import router as admin_router
from app.domains.calendar.router import router as calendar_router
from app.domains.collection.router import router as collection_router
from app.domains.growth.router import router as growth_router
from app.domains.production_board.router import production_items_router, router as production_board_router
from app.domains.recommendations.router import router as recommendation_router
from app.domains.shop.router import router as shop_router
from app.domains.trends.router import router as trend_router
from app.domains.users.router import router as user_router
from app.domains.video_analysis.router import router as video_analysis_router

configure_logging()
settings = get_settings()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI support service for Be Celeb YouTube analysis workflows.",
)

configure_cors(app, settings)


@app.exception_handler(AppException)
async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    logger.warning("Handled API error: %s", exc)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": str(exc), "code": exc.code},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": message, "code": "HTTP_ERROR"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.info("Request validation failed: %s", exc.errors())
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "요청 값이 올바르지 않습니다.", "code": "VALIDATION_ERROR"},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error.", "code": "INTERNAL_SERVER_ERROR"},
    )

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
app.include_router(video_analysis_router)
app.include_router(main, prefix="/api/v1")
