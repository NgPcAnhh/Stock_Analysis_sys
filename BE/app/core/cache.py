"""
Redis cache utility — cung cấp kết nối Redis và các helper cho caching.

Sử dụng:
    from app.core.cache import redis_client, cache_get, cache_set

    # Lấy dữ liệu từ cache
    data = cache_get("market_chart:VNINDEX:1Y")

    # Lưu dữ liệu vào cache (TTL mặc định từ config)
    cache_set("market_chart:VNINDEX:1Y", data)
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime
from typing import Any, Optional

import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ────────────────────────────────────────────────────────────────────
# Redis connection pool (singleton)
# ────────────────────────────────────────────────────────────────────
_pool: Optional[redis.ConnectionPool] = None


def _get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


def get_redis() -> redis.Redis:
    """Return a Redis client from the connection pool."""
    return redis.Redis(connection_pool=_get_pool())


# ────────────────────────────────────────────────────────────────────
# JSON encoder hỗ trợ date / datetime
# ────────────────────────────────────────────────────────────────────
class _DateEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)


# ────────────────────────────────────────────────────────────────────
# Cache helpers
# ────────────────────────────────────────────────────────────────────
def cache_get(key: str) -> Optional[Any]:
    """Lấy dữ liệu từ Redis cache. Trả về None nếu miss hoặc lỗi."""
    try:
        r = get_redis()
        raw = r.get(key)
        if raw is not None:
            logger.debug("Cache HIT: %s", key)
            return json.loads(raw)
        logger.debug("Cache MISS: %s", key)
    except redis.RedisError as exc:
        logger.warning("Redis GET error (%s): %s", key, exc)
    return None


def cache_set(key: str, data: Any, ttl: Optional[int] = None) -> None:
    """Lưu dữ liệu vào Redis cache với TTL (giây)."""
    if ttl is None:
        ttl = settings.REDIS_CACHE_TTL
    try:
        r = get_redis()
        r.setex(key, ttl, json.dumps(data, cls=_DateEncoder))
        logger.debug("Cache SET: %s (TTL=%ds)", key, ttl)
    except redis.RedisError as exc:
        logger.warning("Redis SET error (%s): %s", key, exc)


def cache_delete_pattern(pattern: str) -> int:
    """Xoá tất cả key khớp pattern (ví dụ 'market_chart:*'). Trả về số key đã xoá."""
    try:
        r = get_redis()
        keys = list(r.scan_iter(match=pattern, count=100))
        if keys:
            return r.delete(*keys)
    except redis.RedisError as exc:
        logger.warning("Redis DELETE pattern error (%s): %s", pattern, exc)
    return 0
