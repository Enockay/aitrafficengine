import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.redis_client import get_redis
from app.utils.security import InvalidTokenError, decode_token

# Redis-backed sliding window (sorted-set timestamps), per §12.3 of the blueprint.
AUTHENTICATED_LIMIT = 1000
AUTHENTICATED_WINDOW_SECONDS = 15 * 60
UNAUTHENTICATED_LIMIT = 20
UNAUTHENTICATED_WINDOW_SECONDS = 60

# Account creation gets its own, much tighter budget than general unauthenticated
# traffic — the generic 20/minute limit is fine for browsing but is still enough to
# script hundreds of signups an hour from a single IP.
REGISTER_LIMIT = 5
REGISTER_WINDOW_SECONDS = 60 * 60

EXEMPT_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}


def _identify(request: Request) -> tuple[str, int, int]:
    """Returns (redis_key, limit, window_seconds) for this request."""
    auth_header = request.headers.get("authorization", "")
    token = auth_header[7:] if auth_header.lower().startswith("bearer ") else request.cookies.get("access_token")

    if token:
        try:
            user_id = decode_token(token, expected_type="access")
            return f"ratelimit:user:{user_id}", AUTHENTICATED_LIMIT, AUTHENTICATED_WINDOW_SECONDS
        except InvalidTokenError:
            pass

    client_ip = request.client.host if request.client else "unknown"
    if request.method == "POST" and request.url.path.endswith("/auth/register"):
        return f"ratelimit:register:ip:{client_ip}", REGISTER_LIMIT, REGISTER_WINDOW_SECONDS
    return f"ratelimit:ip:{client_ip}", UNAUTHENTICATED_LIMIT, UNAUTHENTICATED_WINDOW_SECONDS


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXEMPT_PATHS or request.url.path.startswith("/media") or request.method == "OPTIONS":
            return await call_next(request)

        key, limit, window = _identify(request)
        redis = get_redis()
        now = time.time()

        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, now - window)
        pipe.zadd(key, {f"{now}": now})
        pipe.zcard(key)
        pipe.expire(key, window)
        _, _, count, _ = pipe.execute()

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again shortly."},
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
