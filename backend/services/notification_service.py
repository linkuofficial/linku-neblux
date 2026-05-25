"""Best-effort runtime notifications for availability issues."""

from __future__ import annotations

import json
import logging
import threading
import time
import urllib.request

from backend.config import get_settings

logger = logging.getLogger("nexus.notify")

_last_sent_at: dict[str, float] = {}
_state_lock = threading.Lock()


def _deliver_webhook(url: str, payload: dict, timeout_seconds: int) -> None:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
        logger.info("alert_notification_sent status=%s", getattr(resp, "status", "unknown"))


def send_notification(
    title: str,
    *,
    body: str,
    dedupe_key: str,
    min_interval_seconds: int | None = None,
) -> bool:
    settings = get_settings()
    webhook_url = settings.alert_webhook_url.strip()
    if not webhook_url:
        return False

    cooldown_seconds = max(0, min_interval_seconds or settings.alert_min_interval_seconds)
    now = time.time()
    with _state_lock:
        last_sent = _last_sent_at.get(dedupe_key, 0.0)
        if cooldown_seconds and now - last_sent < cooldown_seconds:
            logger.info("alert_notification_suppressed key=%s", dedupe_key)
            return False
        _last_sent_at[dedupe_key] = now

    payload = {"text": f"{title}\n{body}"}

    def _worker() -> None:
        try:
            _deliver_webhook(webhook_url, payload, settings.alert_webhook_timeout_seconds)
        except Exception:
            logger.exception("alert_notification_failed key=%s", dedupe_key)

    threading.Thread(target=_worker, daemon=True).start()
    return True


def reset_notification_state() -> None:
    with _state_lock:
        _last_sent_at.clear()