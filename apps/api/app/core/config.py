# Provides environment-backed settings for local FastAPI and Render runtime.
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Be Celeb Analysis API"
    app_version: str = "0.1.0"
    fastapi_env: str = "local"
    frontend_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    supabase_url: str | None = Field(default=None, validation_alias="NEXT_PUBLIC_SUPABASE_URL")
    supabase_anon_key: str | None = Field(default=None, validation_alias="NEXT_PUBLIC_SUPABASE_ANON_KEY")
    supabase_service_role_key: str | None = None
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4-mini"
    resend_api_key: str | None = None
    resend_from_email: str = "no-reply@be-celeb.org"

    @property
    def cors_origins(self) -> list[str]:
        return [
            "http://localhost:3000",
            "https://be-celeb.org",
            "https://www.be-celeb.org",
            self.frontend_url,
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
