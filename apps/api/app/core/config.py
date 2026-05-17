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
    local_llm_api_url: str | None = "https://llm-api.be-celeb.org/v1/chat/completions"
    local_llm_api_key: str | None = None
    local_llm_model: str = "local-model"
    admin_secret: str | None = None
    cron_secret: str | None = None
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4-mini"
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
