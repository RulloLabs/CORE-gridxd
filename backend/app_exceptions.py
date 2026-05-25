"""
GridXD Backend — Excepciones estandarizadas.
Todas las excepcions HTTP deben usar estas clases para consistencia.
"""

from fastapi import HTTPException


class AppException(HTTPException):
    """Base exception for all GridXD backend errors."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        context: dict | None = None,
    ):
        detail = {
            "code": code,
            "message": message,
            "context": context or {},
        }
        super().__init__(status_code=status_code, detail=detail)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message=message,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message,
        )


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=message,
        )


class RateLimitException(AppException):
    def __init__(self, message: str = "Daily limit reached. Upgrade your plan."):
        super().__init__(
            status_code=429,
            code="RATE_LIMITED",
            message=message,
        )


class TokenExpiredException(AppException):
    def __init__(self, message: str = "Token expired. Please re-authenticate."):
        super().__init__(
            status_code=401,
            code="TOKEN_EXPIRED",
            message=message,
        )


class ValidationException(AppException):
    def __init__(self, message: str, context: dict | None = None):
        super().__init__(
            status_code=400,
            code="VALIDATION_ERROR",
            message=message,
            context=context,
        )


class InternalException(AppException):
    def __init__(self, message: str = "Internal server error", context: dict | None = None):
        super().__init__(
            status_code=500,
            code="INTERNAL_ERROR",
            message=message,
            context=context,
        )


class ServiceUnavailableException(AppException):
    def __init__(self, service: str):
        super().__init__(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message=f"Service unavailable: {service}",
            context={"service": service},
        )
