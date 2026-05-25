"""
GridXD Backend — JWT Auth Middleware
Validates Supabase JWT tokens to protect Cloud Run endpoints.
"""
import os
import logging
from functools import wraps
from typing import Optional

from fastapi import Request
from jose import jwt, JWTError

from supabase_service import check_rate_limit
from app_exceptions import UnauthorizedException, RateLimitException, InternalException

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET: Optional[str] = os.environ.get("SUPABASE_JWT_SECRET")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"


async def verify_supabase_jwt(request: Request) -> str:
    """
    FastAPI dependency that validates a Supabase JWT Bearer token.
    Returns the user_id (sub claim) if valid.
    Raises AppException otherwise.
    """
    if not SUPABASE_JWT_SECRET:
        if DEBUG:
            logger.warning("SUPABASE_JWT_SECRET not set — auth disabled in DEBUG mode")
            return "anonymous-dev"
        raise InternalException(message="Server misconfigured: SUPABASE_JWT_SECRET not set")

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise UnauthorizedException(message="Authorization header missing or malformed. Expected: Bearer <token>")

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise UnauthorizedException(message="Empty token")

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(message="Token missing sub claim")

        # ─── Rate Limit Check ────────────────────────────────────────────────
        is_allowed = await check_rate_limit(user_id)
        if not is_allowed:
            raise RateLimitException()

        request.state.user_id = user_id
        request.state.user_role = payload.get("role", "authenticated")
        return user_id

    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise UnauthorizedException(message="Invalid or expired token")
