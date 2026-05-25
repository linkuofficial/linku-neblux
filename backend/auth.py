"""
Authentication helpers shared by API routers.
"""

import hmac

from fastapi import Header, HTTPException

from backend.config import get_settings


async def require_admin_key(x_admin_key: str = Header(default="", alias="X-Admin-Key")) -> None:
    """Enforce admin header auth when ADMIN_API_KEY is configured."""
    configured_key = get_settings().admin_api_key.strip()
    if not configured_key:
        return

    if not x_admin_key:
        raise HTTPException(status_code=401, detail="Missing admin API key")

    if not hmac.compare_digest(x_admin_key.strip(), configured_key):
        raise HTTPException(status_code=403, detail="Invalid admin API key")
