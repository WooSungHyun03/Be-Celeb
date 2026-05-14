# Defines shared service-layer exceptions for configuration and integration failures.
class MissingConfigurationError(RuntimeError):
    pass


class BackendApiError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502, code: str = "INTERNAL_SERVER_ERROR"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


def missing_env(name: str) -> BackendApiError:
    return BackendApiError(
        message=f"Missing required environment variable: {name}",
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
    )
