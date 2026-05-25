"""
Cache service — Redis-based with graceful fallback to in-memory LRU.
Caches subgraph queries, search results, and stats.
"""

import json
import hashlib
import time
from typing import Optional, Any

# TTL constants (seconds)
TTL_SUBGRAPH = 600   # 10 min
TTL_SEARCH = 300     # 5 min
TTL_STATS = 1800     # 30 min
TTL_RECOMMEND = 1800 # 30 min

_redis_client = None
_fallback_cache: dict[str, tuple[float, Any]] = {}
_USE_REDIS = False


def _get_redis():
    """Try to connect to Redis. Falls back to in-memory if unavailable."""
    global _redis_client, _USE_REDIS
    if _redis_client is not None:
        return _redis_client

    try:
        import redis
        client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
        client.ping()
        _redis_client = client
        _USE_REDIS = True
        return client
    except Exception:
        _USE_REDIS = False
        return None


def _make_key(prefix: str, params: dict) -> str:
    """Generate a cache key from prefix + sorted params."""
    param_str = json.dumps(params, sort_keys=True)
    h = hashlib.md5(param_str.encode()).hexdigest()[:12]
    return f"nexus:{prefix}:{h}"


def get(prefix: str, params: dict) -> Optional[Any]:
    """Get cached value."""
    key = _make_key(prefix, params)

    client = _get_redis()
    if client and _USE_REDIS:
        raw = client.get(key)
        if raw:
            return json.loads(raw)
        return None

    # Fallback: in-memory
    entry = _fallback_cache.get(key)
    if entry:
        expiry, value = entry
        if time.time() < expiry:
            return value
        else:
            del _fallback_cache[key]
    return None


def set(prefix: str, params: dict, value: Any, ttl_seconds: int = 300) -> None:
    """Set cached value with TTL."""
    key = _make_key(prefix, params)
    serialized = json.dumps(value, ensure_ascii=False)

    client = _get_redis()
    if client and _USE_REDIS:
        client.setex(key, ttl_seconds, serialized)
        return

    # Fallback: in-memory with expiry
    _fallback_cache[key] = (time.time() + ttl_seconds, value)

    # Evict old entries if cache too large
    if len(_fallback_cache) > 500:
        now = time.time()
        expired = [k for k, (exp, _) in _fallback_cache.items() if now >= exp]
        for k in expired:
            del _fallback_cache[k]


def invalidate(prefix: str = None) -> None:
    """Invalidate cache entries. If prefix is None, flush all."""
    global _fallback_cache

    client = _get_redis()
    if client and _USE_REDIS:
        if prefix:
            keys = client.keys(f"nexus:{prefix}:*")
            if keys:
                client.delete(*keys)
        else:
            client.flushdb()
        return

    # Fallback
    if prefix:
        _fallback_cache = {k: v for k, v in _fallback_cache.items() if not k.startswith(f"nexus:{prefix}:")}
    else:
        _fallback_cache.clear()
