"""
Redis cache using Upstash (free tier).
Falls back gracefully if Redis is not configured.
"""

import json
import redis.asyncio as aioredis
from app.config.settings import get_settings

_client = None
TTL = 3600  # 1 hour


def get_redis():
    global _client
    if _client is None:
        settings = get_settings()
        if settings.redis_url:
            _client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                ssl=True,
            )
    return _client


async def cache_get(key: str):
    client = get_redis()
    if not client:
        return None
    try:
        val = await client.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def cache_set(key: str, value, ttl: int = TTL):
    client = get_redis()
    if not client:
        return
    try:
        await client.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


async def cache_delete(key: str):
    client = get_redis()
    if not client:
        return
    try:
        await client.delete(key)
    except Exception:
        pass
