"""
Authentication helpers shared by API routers.
"""

import hmac
import ipaddress

from fastapi import Header, HTTPException, Request

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


def _parse_networks(raw: str) -> list[ipaddress._BaseNetwork]:
    networks: list[ipaddress._BaseNetwork] = []
    for item in raw.split(","):
        token = item.strip()
        if not token:
            continue
        if "/" not in token:
            token = f"{token}/32"
        networks.append(ipaddress.ip_network(token, strict=False))
    return networks


def _is_ip_in_networks(ip_raw: str, networks: list[ipaddress._BaseNetwork]) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip_raw)
    except ValueError:
        return False
    return any(ip_obj in net for net in networks)


def _get_client_ip(request: Request, settings) -> str:
    direct_ip = request.client.host if request.client and request.client.host else ""

    if not settings.admin_trust_forwarded_for:
        return direct_ip

    raw_trusted = settings.admin_trusted_proxies.strip()
    if not raw_trusted or not direct_ip:
        return direct_ip

    try:
        trusted_proxies = _parse_networks(raw_trusted)
    except ValueError:
        return direct_ip

    if not _is_ip_in_networks(direct_ip, trusted_proxies):
        return direct_ip

    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if not forwarded:
        return direct_ip

    # Use left-most client IP only when the immediate peer is a trusted proxy.
    candidate = forwarded.split(",")[0].strip()
    return candidate or direct_ip


def _parse_allowed_networks(raw: str) -> list[ipaddress._BaseNetwork]:
    return _parse_networks(raw)


async def require_admin_origin(request: Request) -> None:
    settings = get_settings()
    raw_allowlist = settings.admin_allowed_ips.strip()
    if not raw_allowlist:
        return

    client_ip_raw = _get_client_ip(request, settings)
    if not client_ip_raw:
        raise HTTPException(status_code=403, detail="Admin route blocked by source policy")

    try:
        client_ip = ipaddress.ip_address(client_ip_raw)
    except ValueError:
        raise HTTPException(status_code=403, detail="Admin route blocked by source policy")

    try:
        networks = _parse_allowed_networks(raw_allowlist)
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid ADMIN_ALLOWED_IPS configuration")

    if not any(client_ip in net for net in networks):
        raise HTTPException(status_code=403, detail="Admin route blocked by source policy")


async def require_admin_access(
    request: Request,
    x_admin_key: str = Header(default="", alias="X-Admin-Key"),
) -> None:
    await require_admin_key(x_admin_key)
    await require_admin_origin(request)
