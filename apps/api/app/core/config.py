# Provides environment-backed settings for local FastAPI and Render runtime.
from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    app_name: str = "Be Celeb Analysis API"
    app_version: str = "0.1.0"
    fastapi_env: str = "local"
    environment: str = Field(default="local", validation_alias=AliasChoices("ENVIRONMENT", "FASTAPI_ENV"))
    log_level: str = "INFO"
    port: int = 8000
    frontend_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    allowed_origins: str | None = None
    supabase_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    )
    supabase_anon_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    )
    supabase_service_role_key: str | None = None
    youtube_api_key: str | None = None
    naver_client_id: str | None = None
    naver_client_secret: str | None = None
    naver_shopping_client_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("NAVER_SHOPPING_CLIENT_ID", "NAVER_SEARCH_CLIENT_ID"),
    )
    naver_shopping_client_secret: str | None = Field(
        default=None,
        validation_alias=AliasChoices("NAVER_SHOPPING_CLIENT_SECRET", "NAVER_SEARCH_CLIENT_SECRET"),
    )
    local_llm_api_url: str | None = "https://llm-api.be-celeb.org/v1/chat/completions"
    local_llm_api_key: str | None = None
    local_llm_model: str = "local-model"
    admin_secret: str | None = None
    cron_secret: str | None = None
    video_analysis_max_per_collection: int = 0
    daily_collection_concurrency: int = 2
    daily_collection_channel_limit: int = 20
    daily_collection_videos_per_channel: int = 8
    daily_collection_time_budget_seconds: int = 50
    daily_collection_channel_timeout_seconds: int = 45
    daily_collection_lock_ttl_minutes: int = 30
    cleanup_lock_ttl_minutes: int = 30
    cleanup_batch_size: int = 200
    cleanup_job_logs_retention_days: int = 30
    cleanup_admin_audit_retention_days: int = 180
    cleanup_influencer_videos_retention_days: int = 180
    cleanup_video_analysis_retention_days: int = 30
    cleanup_recommendation_options_retention_days: int = 30
    cleanup_growth_snapshots_retention_days: int = 400
    resend_api_key: str | None = None
    resend_from_email: str = "no-reply@be-celeb.org"

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            "http://localhost:3000",
            "https://be-celeb.org",
            "https://www.be-celeb.org",
            self.frontend_url,
        ]

        if self.allowed_origins:
            origins.extend(
                origin.strip()
                for origin in self.allowed_origins.split(",")
                if origin.strip()
            )

        return list(dict.fromkeys(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
