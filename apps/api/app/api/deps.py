# Provides dependency placeholders for future auth, DB, and request context.
from app.core.config import Settings, get_settings


def get_request_settings() -> Settings:
    # TODO: Add auth/session dependencies when Supabase Auth is connected.
    return get_settings()
