# Shared application exceptions used by routers and services.
from __future__ import annotations


class AppException(RuntimeError):
    def __init__(self, message: str, status_code: int = 500, code: str = "INTERNAL_SERVER_ERROR"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class BadRequestException(AppException):
    def __init__(self, message: str, code: str = "BAD_REQUEST"):
        super().__init__(message, 400, code)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized.", code: str = "UNAUTHORIZED"):
        super().__init__(message, 401, code)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden.", code: str = "FORBIDDEN"):
        super().__init__(message, 403, code)


class NotFoundException(AppException):
    def __init__(self, message: str = "Not found.", code: str = "NOT_FOUND"):
        super().__init__(message, 404, code)


class ExternalAPIException(AppException):
    def __init__(self, message: str, code: str = "EXTERNAL_API_ERROR"):
        super().__init__(message, 502, code)


class DatabaseException(AppException):
    def __init__(self, message: str, code: str = "DATABASE_ERROR"):
        super().__init__(message, 502, code)


class LLMException(AppException):
    def __init__(self, message: str, code: str = "LLM_ERROR"):
        super().__init__(message, 502, code)


class MissingConfigurationError(RuntimeError):
    pass


class BackendApiError(AppException):
    pass


def missing_env(name: str) -> BackendApiError:
    return BackendApiError(
        message=f"Missing required environment variable: {name}",
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
    )
