"""
GridXD Backend — JWT Auth Middleware
Validates Supabase JWT tokens to protect Cloud Run endpoints.
"""
import os
import logging
from functools import wraps
from typing import Optional

from fastapi import Request, HTTPException
from jose import jwt, JWTError

from supabase_service import check_rate_limit

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET: Optional[str] = os.environ.get("SUPABASE_JWT_SECRET")


async def verify_supabase_jwt(request: Request) -> str:
    """
    FastAPI dependency that validates a Supabase JWT Bearer token.
    Returns the user_id (sub claim) if valid.
    Raises 401 HTTPException otherwise.
    """
    if not SUPABASE_JWT_SECRET:
        # In dev mode without secret configured, allow through but log a warning
        if os.environ.get("DEBUG", "false").lower() == "true":
            logger.warning("SUPABASE_JWT_SECRET not set — auth disabled in DEBUG mode")
            return "anonymous-dev"
        raise HTTPException(
            status_code=500,
            detail="Server misconfigured: SUPABASE_JWT_SECRET not set"
        )

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or malformed. Expected: Bearer <token>"
        )

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase uses role as audience
        )
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing sub claim")

        # ─── Rate Limit Check ────────────────────────────────────────────────
        # This prevents credit exhaustion by enforcing daily limits per user.
        is_allowed = await check_rate_limit(user_id)
        if not is_allowed:
            raise HTTPException(
                status_code=429,
                detail="Daily limit reached. Upgrade your plan for more uses."
            )

        # Attach to request state for downstream use
        request.state.user_id = user_id
        request.state.user_role = payload.get("role", "authenticated")
        return user_id

    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
