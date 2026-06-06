"""
GridXD Backend — JWT Auth Middleware
Validates Supabase JWT tokens (ES256 via JWKS, fallback HS256) to protect Cloud Run endpoints.
"""
import os
import time
import logging
from typing import Optional

from fastapi import Request
from jose import jwt, JWTError, jwk
import httpx

from supabase_service import check_rate_limit
from app_exceptions import UnauthorizedException, RateLimitException, InternalException

logger = logging.getLogger(__name__)

SUPABASE_JWT_SECRET: Optional[str] = os.environ.get("SUPABASE_JWT_SECRET")
SUPABASE_URL: Optional[str] = os.environ.get("SUPABASE_URL")
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"

JWKS_CACHE: Optional[dict] = None
JWKS_CACHE_TIME: float = 0
JWKS_CACHE_TTL: int = 3600


async def _fetch_jwks() -> dict:
    global JWKS_CACHE, JWKS_CACHE_TIME
    now = time.time()
    if JWKS_CACHE and (now - JWKS_CACHE_TIME) < JWKS_CACHE_TTL:
        return JWKS_CACHE
    if not SUPABASE_URL:
        return {}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
            if resp.status_code == 200:
                data = resp.json()
                JWKS_CACHE = data
                JWKS_CACHE_TIME = now
                return data
            logger.warning(f"JWKS fetch returned {resp.status_code}")
            return JWKS_CACHE or {}
    except Exception as e:
        logger.warning(f"JWKS fetch error: {e}")
        return JWKS_CACHE or {}


def _find_jwk_key(jwks: dict, kid: str) -> Optional[dict]:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


async def verify_supabase_jwt(request: Request) -> str:
    if not SUPABASE_JWT_SECRET and not SUPABASE_URL:
        if DEBUG:
            logger.warning("Auth unconfigured — in DEBUG mode, returning anonymous-dev")
            return "anonymous-dev"
        raise InternalException(message="Server misconfigured: no JWT secret or Supabase URL")

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise UnauthorizedException(message="Authorization header missing or malformed. Expected: Bearer <token>")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise UnauthorizedException(message="Empty token")

    payload = None

    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg", "HS256")

        if kid and (alg == "ES256" or alg == "ES384"):
            jwks = await _fetch_jwks()
            key_data = _find_jwk_key(jwks, kid)
            if key_data:
                public_key = jwk.construct(key_data)
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=[alg],
                    options={"verify_aud": False},
                )
    except Exception:
        pass

    if not payload and SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except JWTError as e:
            logger.warning(f"JWT validation failed (HS256 fallback): {e}")
            raise UnauthorizedException(message="Invalid or expired token")

    if not payload:
        raise UnauthorizedException(message="Invalid or expired token")

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(message="Token missing sub claim")

    is_allowed = await check_rate_limit(user_id)
    if not is_allowed:
        raise RateLimitException()

    request.state.user_id = user_id
    request.state.user_role = payload.get("role", "authenticated")
    return user_id
