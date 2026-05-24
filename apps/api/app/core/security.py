# Shared authentication and secret verification helpers.
from __future__ import annotations

from hmac import compare_digest

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedException, missing_env


def bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    prefix = "Bearer "
    if authorization.startswith(prefix):
        return authorization[len(prefix) :].strip()
    return None


def _secret_matches(candidate: str | None, expected: str) -> bool:
    if not candidate:
        return False
    return compare_digest(candidate, expected)


def verify_admin_secret(authorization: str | None, x_admin_secret: str | None = None) -> None:
    settings = get_settings()
    if not settings.admin_secret:
        raise missing_env("ADMIN_SECRET")
    token = bearer_token(authorization)
    if not _secret_matches(token, settings.admin_secret) and not _secret_matches(x_admin_secret, settings.admin_secret):
        raise UnauthorizedException("Unauthorized admin request.")


def verify_cron_secret(authorization: str | None, x_cron_secret: str | None = None) -> None:
    settings = get_settings()
    if not settings.cron_secret:
        raise missing_env("CRON_SECRET")
    token = bearer_token(authorization)
    if not _secret_matches(token, settings.cron_secret) and not _secret_matches(x_cron_secret, settings.cron_secret):
        raise UnauthorizedException("Unauthorized cron request.")
