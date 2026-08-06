from functools import lru_cache

import redis

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_redis() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)
