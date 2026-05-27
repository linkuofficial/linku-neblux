"""
Admin endpoints — generation triggers, quality reports, dedup management.
"""

import json
import re
import uuid
import asyncio
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel, field_validator

from backend.config import BASE_DIR, get_settings
from backend.auth import require_admin_access
from backend.services.notification_service import send_notification
settings = get_settings()
logger = logging.getLogger("nexus.admin")

router = APIRouter(dependencies=[Depends(require_admin_access)])

# ── Task queue (persisted to JSON file so restarts don't lose task history) ──
_TASKS_FILE = BASE_DIR / "data" / "tasks.json"


def _load_tasks() -> dict[str, dict]:
    """Load persisted tasks; mark any 'running' task as 'interrupted' (process was killed)."""
    if not _TASKS_FILE.exists():
        return {}
    try:
        data: dict[str, dict] = json.loads(_TASKS_FILE.read_text(encoding="utf-8"))
        for task in data.values():
            if task.get("status") == "running":
                task["status"] = "interrupted"
                task["error"] = "Server restarted while task was running."
        return data
    except Exception:
        logger.warning("tasks_file_corrupt_resetting")
        return {}


def _persist_tasks() -> None:
    """Atomically write current _tasks to disk."""
    try:
        tmp = _TASKS_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(_tasks, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(_TASKS_FILE)
    except Exception:
        logger.warning("task_persist_failed")


_tasks: dict[str, dict] = _load_tasks()
_trigger_windows: dict[str, list[float]] = {}
_trigger_events: list[float] = []

MAX_TASKS = settings.admin_max_tasks
TASK_TTL_SECONDS = settings.admin_task_ttl_seconds
TRIGGER_WINDOW_SECONDS = settings.admin_trigger_window_seconds
TRIGGER_MAX_REQUESTS = settings.admin_trigger_max_requests
ALERT_PER_MINUTE = settings.admin_alert_per_minute
ALERT_PER_DAY = settings.admin_alert_per_day
ADMIN_AUDIT_LOG_FILE = BASE_DIR / "data" / "admin_audit_log.jsonl"
ADMIN_AUDIT_RETENTION_DAYS = settings.admin_audit_retention_days
ADMIN_AUDIT_MAX_FILE_BYTES = max(1, settings.admin_audit_max_file_mb) * 1024 * 1024
ADMIN_AUDIT_MAX_ROTATED_FILES = max(1, settings.admin_audit_max_rotated_files)


_VALID_DOMAINS = frozenset({"MAT", "PHY", "CHE", "BIO", "MED", "ENG", "TEC", "SOC", "HUM", "PHI", "ART", "HIS"})
_SUBDOMAIN_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

# Scoring weights / thresholds used by _score_description / _score_density / _get_grade
_SCORING: dict = {
    "min_words": 50,
    "what_score": 3,
    "significance_score": 3,
    "significance_keywords": frozenset({"significant", "important", "fundamental", "essential", "revolutionized"}),
    "bridge_score": 4,
    "unique_ratio": 0.55,
    "grade_A": 21,
    "grade_B": 17,
    "grade_C": 14,
    "grade_D": 10,
}

class GenerateRequest(BaseModel):
    phase: int = 2
    domain: str = "MAT"
    subdomain: str = "calculus"
    batch_size: int = 20
    batches: int = 1
    structured: bool = True
    critique: bool = True

    @field_validator("subdomain")
    @classmethod
    def validate_subdomain(cls, v: str) -> str:
        if not _SUBDOMAIN_RE.match(v):
            raise ValueError("subdomain must be 1-64 alphanumeric/underscore/hyphen characters")
        return v


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(ts: str) -> datetime:
    return datetime.fromisoformat(ts)


def _rotate_admin_audit_file_if_needed() -> None:
    if not ADMIN_AUDIT_LOG_FILE.exists():
        return
    if ADMIN_AUDIT_LOG_FILE.stat().st_size < ADMIN_AUDIT_MAX_FILE_BYTES:
        return

    # Shift rotated files: .6 -> .7, ... .1 -> .2
    for index in range(ADMIN_AUDIT_MAX_ROTATED_FILES, 0, -1):
        src = Path(f"{ADMIN_AUDIT_LOG_FILE}.{index}")
        if not src.exists():
            continue
        if index >= ADMIN_AUDIT_MAX_ROTATED_FILES:
            src.unlink(missing_ok=True)
        else:
            dst = Path(f"{ADMIN_AUDIT_LOG_FILE}.{index + 1}")
            src.replace(dst)

    ADMIN_AUDIT_LOG_FILE.replace(Path(f"{ADMIN_AUDIT_LOG_FILE}.1"))


def _cleanup_admin_audit_by_retention() -> None:
    if ADMIN_AUDIT_RETENTION_DAYS <= 0:
        return

    cutoff_ts = _utc_now().timestamp() - (ADMIN_AUDIT_RETENTION_DAYS * 24 * 60 * 60)
    candidates = [ADMIN_AUDIT_LOG_FILE]
    candidates.extend(Path(f"{ADMIN_AUDIT_LOG_FILE}.{idx}") for idx in range(1, ADMIN_AUDIT_MAX_ROTATED_FILES + 1))

    for path in candidates:
        if not path.exists():
            continue
        if path.stat().st_mtime < cutoff_ts:
            path.unlink(missing_ok=True)


def _maintain_admin_audit_store() -> None:
    _rotate_admin_audit_file_if_needed()
    _cleanup_admin_audit_by_retention()


def _append_admin_audit_event(
    event_type: str,
    request: Request,
    status: str,
    detail: dict | None = None,
) -> None:
    """Persist admin operation events for audit/history queries."""
    try:
        _maintain_admin_audit_store()
        ADMIN_AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        raw_key = request.headers.get("x-admin-key", "")
        event = {
            "timestamp": _utc_now().isoformat(),
            "event_type": event_type,
            "status": status,
            "request_id": getattr(request.state, "request_id", None),
            "client_ip": request.client.host if request.client else "unknown",
            "admin_key_prefix": raw_key[:4] if raw_key else "",
            "detail": detail or {},
        }
        with open(ADMIN_AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
    except Exception:
        logger.exception("admin_audit_write_failed")


def _read_admin_audit_events(
    limit: int,
    event_type: str | None,
    status: str | None,
) -> list[dict]:
    _maintain_admin_audit_store()
    audit_files = [ADMIN_AUDIT_LOG_FILE]
    audit_files.extend(Path(f"{ADMIN_AUDIT_LOG_FILE}.{idx}") for idx in range(1, ADMIN_AUDIT_MAX_ROTATED_FILES + 1))

    existing_files = [path for path in audit_files if path.exists()]
    if not existing_files:
        return []

    events: list[dict] = []
    for path in existing_files:
        with open(path, encoding="utf-8") as f:
            lines = [line for line in f if line.strip()]

        for line in reversed(lines):
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event_type and event.get("event_type") != event_type:
                continue
            if status and event.get("status") != status:
                continue
            events.append(event)
            if len(events) >= limit:
                return events

    return events


def _cleanup_task_store() -> None:
    now = _utc_now()

    expired_ids = []
    for task_id, task in _tasks.items():
        if task.get("status") in {"completed", "failed"}:
            started_at = task.get("started_at")
            if not started_at:
                expired_ids.append(task_id)
                continue
            age_seconds = (now - _parse_iso(started_at)).total_seconds()
            if age_seconds > TASK_TTL_SECONDS:
                expired_ids.append(task_id)

    for task_id in expired_ids:
        _tasks.pop(task_id, None)

    if len(_tasks) > MAX_TASKS:
        ordered = sorted(_tasks.values(), key=lambda t: t.get("started_at", ""))
        overflow = len(_tasks) - MAX_TASKS
        for task in ordered[:overflow]:
            _tasks.pop(task["id"], None)


def _cleanup_trigger_windows(now_ts: float) -> None:
    dead_keys = []
    for key, history in _trigger_windows.items():
        valid = [ts for ts in history if now_ts - ts <= TRIGGER_WINDOW_SECONDS]
        if valid:
            _trigger_windows[key] = valid
        else:
            dead_keys.append(key)
    for key in dead_keys:
        _trigger_windows.pop(key, None)


def _record_trigger_event(now_ts: float) -> None:
    _trigger_events.append(now_ts)
    cutoff = now_ts - 24 * 60 * 60
    while _trigger_events and _trigger_events[0] < cutoff:
        _trigger_events.pop(0)


def _emit_trigger_alerts(now_ts: float, key: str) -> None:
    minute_cutoff = now_ts - 60
    minute_count = sum(1 for ts in _trigger_events if ts >= minute_cutoff)
    day_count = len(_trigger_events)

    if ALERT_PER_MINUTE > 0 and minute_count >= ALERT_PER_MINUTE:
        logger.warning(
            "admin_trigger_alert scope=minute count=%s threshold=%s key=%s",
            minute_count,
            ALERT_PER_MINUTE,
            key,
        )
        send_notification(
            "Nexus admin trigger burst",
            body=(
                f"scope=minute\ncount={minute_count}\nthreshold={ALERT_PER_MINUTE}\nkey={key}"
            ),
            dedupe_key="admin-trigger-minute",
            min_interval_seconds=300,
        )

    if ALERT_PER_DAY > 0 and day_count >= ALERT_PER_DAY:
        logger.warning(
            "admin_trigger_alert scope=day count=%s threshold=%s key=%s",
            day_count,
            ALERT_PER_DAY,
            key,
        )
        send_notification(
            "Nexus admin trigger daily threshold",
            body=(
                f"scope=day\ncount={day_count}\nthreshold={ALERT_PER_DAY}\nkey={key}"
            ),
            dedupe_key="admin-trigger-day",
            min_interval_seconds=3600,
        )


def get_admin_trigger_counts() -> dict[str, int]:
    """Return admin trigger counts for metrics export."""
    now_ts = _utc_now().timestamp()
    minute_cutoff = now_ts - 60
    day_cutoff = now_ts - 24 * 60 * 60

    minute_count = sum(1 for ts in _trigger_events if ts >= minute_cutoff)
    day_count = sum(1 for ts in _trigger_events if ts >= day_cutoff)
    return {
        "minute": minute_count,
        "day": day_count,
        "lifetime": len(_trigger_events),
    }


def _rate_limit_key(request: Request) -> str:
    client_host = request.client.host if request.client else "unknown"
    admin_key = request.headers.get("x-admin-key", "")
    return f"{client_host}:{admin_key[:8]}"


def _enforce_trigger_rate_limit(request: Request) -> None:
    now_ts = _utc_now().timestamp()
    _cleanup_trigger_windows(now_ts)

    key = _rate_limit_key(request)
    history = _trigger_windows.get(key, [])

    if len(history) >= TRIGGER_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many generate triggers, please retry later")

    history.append(now_ts)
    _trigger_windows[key] = history
    _record_trigger_event(now_ts)
    _emit_trigger_alerts(now_ts, key)


@router.post("/generate/trigger")
async def trigger_generation(req: GenerateRequest, request: Request):
    """Trigger a background generation task."""
    if settings.is_production and not settings.admin_enable_generation_in_production:
        _append_admin_audit_event(
            event_type="generate_trigger",
            request=request,
            status="blocked",
            detail={"reason": "generation_disabled_in_production"},
        )
        raise HTTPException(
            status_code=403,
            detail="Admin generation is disabled in production. Set ADMIN_ENABLE_GENERATION_IN_PRODUCTION=true to enable.",
        )

    _cleanup_task_store()
    try:
        _enforce_trigger_rate_limit(request)
    except HTTPException as exc:
        if exc.status_code == 429:
            _append_admin_audit_event(
                event_type="generate_trigger",
                request=request,
                status="rate_limited",
                detail={"domain": req.domain, "subdomain": req.subdomain},
            )
        raise

    if req.domain not in _VALID_DOMAINS:
        _append_admin_audit_event(
            event_type="generate_trigger",
            request=request,
            status="rejected",
            detail={"reason": "invalid_domain", "domain": req.domain, "subdomain": req.subdomain},
        )
        raise HTTPException(status_code=400, detail=f"Invalid domain: {req.domain}")

    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "id": task_id,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "params": req.model_dump(),
        "progress": 0,
        "result": None,
        "error": None,
    }
    _persist_tasks()

    # Launch as subprocess (non-blocking)
    asyncio.create_task(_run_generation(task_id, req))

    _append_admin_audit_event(
        event_type="generate_trigger",
        request=request,
        status="accepted",
        detail={"task_id": task_id, "domain": req.domain, "subdomain": req.subdomain},
    )

    return {"task_id": task_id, "status": "running"}


async def _run_generation(task_id: str, req: GenerateRequest):
    """Run generation script as subprocess."""
    script = str(BASE_DIR / "scripts" / "generate_nodes.py")
    cmd = [
        sys.executable, script,
        "--phase", str(req.phase),
        "--domain", req.domain,
        "--subdomain", req.subdomain,
        "--batch_size", str(req.batch_size),
        "--batches", str(req.batches),
    ]
    if req.structured:
        cmd.append("--structured")
    if req.critique:
        cmd.append("--critique")

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(BASE_DIR),
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode == 0:
            _tasks[task_id]["status"] = "completed"
            _tasks[task_id]["result"] = stdout.decode("utf-8", errors="replace")[-4000:]
            # Invalidate in-memory caches so next request reflects newly generated data
            try:
                from backend.services.json_service import invalidate_cache as _inv_json
                from backend.routers.graph import invalidate_full_graph_cache, invalidate_descriptions_cache
                _inv_json()
                invalidate_full_graph_cache()
                invalidate_descriptions_cache()
            except Exception:
                logger.warning("cache_invalidation_failed_after_generation")
        else:
            _tasks[task_id]["status"] = "failed"
            _tasks[task_id]["error"] = stderr.decode("utf-8", errors="replace")[-4000:]

    except Exception as e:
        _tasks[task_id]["status"] = "failed"
        _tasks[task_id]["error"] = str(e)

    _tasks[task_id]["progress"] = 100
    _tasks[task_id]["finished_at"] = _utc_now().isoformat()
    _persist_tasks()


@router.get("/generate/status/{task_id}")
async def generation_status(task_id: str, request: Request):
    """Get status of a generation task."""
    task = _tasks.get(task_id)
    if not task:
        _append_admin_audit_event(
            event_type="admin_read",
            request=request,
            status="not_found",
            detail={"endpoint": "/generate/status", "task_id": task_id},
        )
        raise HTTPException(status_code=404, detail="Task not found")
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={"endpoint": "/generate/status", "task_id": task_id, "task_status": task.get("status")},
    )
    return task


@router.get("/generate/tasks")
async def list_tasks(request: Request):
    """List all generation tasks."""
    _cleanup_task_store()
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={"endpoint": "/generate/tasks", "task_count": len(_tasks)},
    )
    return {"tasks": list(_tasks.values())}


@router.get("/audit")
async def admin_audit_history(
    request: Request,
    limit: int = Query(50, ge=1, le=500),
    event_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    """Return recent admin operation audit events."""
    events = _read_admin_audit_events(limit=limit, event_type=event_type, status=status)
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={"endpoint": "/audit", "limit": limit, "event_type": event_type, "status_filter": status},
    )
    return {
        "events": events,
        "count": len(events),
        "limit": limit,
        "filters": {"event_type": event_type, "status": status},
        "source": str(Path("data") / "admin_audit_log.jsonl"),
    }


@router.get("/quality")
async def quality_report(request: Request, domain: str = None):
    """
    Run quality check and return report.
    Uses the quality_check script logic inline.
    """
    from backend.services import json_service
    nodes = json_service._load_nodes()

    if domain:
        nodes = [n for n in nodes if domain in n.get("domain", [])]

    # Simplified quality scoring (mirrors quality_check.py logic)
    grades = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    low_quality = []

    for node in nodes:
        score = _score_node(node)
        grade = _get_grade(score)
        grades[grade] += 1

        if grade in ("D", "F"):
            low_quality.append({
                "id": node["id"],
                "label": node["label"],
                "score": score,
                "grade": grade,
                "domain": node.get("domain", []),
            })

    response = {
        "total_nodes": len(nodes),
        "grade_distribution": grades,
        "low_quality_count": len(low_quality),
        "low_quality_nodes": low_quality[:50],  # Top 50 worst
    }
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={"endpoint": "/quality", "domain": domain, "total_nodes": response["total_nodes"]},
    )
    return response


def _score_description(node: dict) -> int:
    """Score node description quality (0–10)."""
    desc = node.get("description", "")
    words = desc.split()
    score = 0
    if len(words) >= _SCORING["min_words"]:
        score += _SCORING["what_score"]
    if any(w in desc.lower() for w in _SCORING["significance_keywords"]):
        score += _SCORING["significance_score"]
    domain_keywords = {"mathematics", "physics", "chemistry", "biology", "engineering",
                       "philosophy", "history", "technology", "medicine", "sociology", "art"}
    node_domains = set(node.get("domain", []))
    if any(k in desc.lower() for k in domain_keywords if k[:3].upper() not in node_domains):
        score += _SCORING["bridge_score"]
    return score


def _score_connections(node: dict) -> int:
    """Score node connection richness (0–10)."""
    connections = node.get("connections", [])
    if not connections:
        return 0
    score = 0
    generic = {"is related to", "has connection", "connects to"}
    good_rels = sum(
        1 for c in connections
        if c.get("relation", "") not in generic and len(c.get("relation", "")) > 10
    )
    score += min(4, good_rels)
    rel_types = {c.get("relation_type", "") for c in connections}
    score += min(3, len(rel_types))
    score += min(3, len(rel_types))  # type diversity (same axis; capped)
    return min(10, score)


def _score_density(node: dict) -> int:
    """Score information density (0–5)."""
    words = node.get("description", "").split()
    if not words:
        return 0
    score = 0
    unique_ratio = len({w.lower() for w in words}) / len(words)
    if unique_ratio >= _SCORING["unique_ratio"]:
        score += 2
    if len(node.get("display_tags", [])) >= 3:
        score += 1
    score += min(2, sum(1 for w in words if w[0].isupper() and len(w) > 1) // 2)
    return score


def _score_node(node: dict) -> int:
    """Composite node quality score (max 25)."""
    return _score_description(node) + _score_connections(node) + _score_density(node)


def _get_grade(score: int) -> str:
    if score >= _SCORING["grade_A"]:
        return "A"
    elif score >= _SCORING["grade_B"]:
        return "B"
    elif score >= _SCORING["grade_C"]:
        return "C"
    elif score >= _SCORING["grade_D"]:
        return "D"
    return "F"


@router.get("/dedup")
async def dedup_report(request: Request):
    """Get deduplication report (from file or generate fresh)."""
    report_path = BASE_DIR / "data" / "dedup_report.json"
    if report_path.exists():
        with open(report_path, encoding="utf-8") as f:
            report = json.load(f)
        _append_admin_audit_event(
            event_type="admin_read",
            request=request,
            status="success",
            detail={"endpoint": "/dedup", "source": "file"},
        )
        return report

    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="missing",
        detail={"endpoint": "/dedup", "source": "generated_empty"},
    )
    return {"duplicates": [], "orphans": [], "summary": {"message": "No report generated yet. Run scripts/deduplicate.py"}}


@router.get("/costs")
async def cost_report(request: Request):
    """Get generation cost summary from log file."""
    log_path = BASE_DIR / "data" / "generation_log.jsonl"
    if not log_path.exists():
        _append_admin_audit_event(
            event_type="admin_read",
            request=request,
            status="missing",
            detail={"endpoint": "/costs", "source": "no_log_file"},
        )
        return {"total_cost": 0, "entries": 0, "by_domain": {}}

    entries = []
    total_cost = 0.0
    by_domain: dict[str, float] = {}
    by_status: dict[str, int] = {}

    with open(log_path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                entry = json.loads(line)
                entries.append(entry)
                cost = entry.get("cost_usd", 0)
                total_cost += cost
                domain = entry.get("domain", "?")
                by_domain[domain] = by_domain.get(domain, 0) + cost
                status = entry.get("status", "unknown")
                by_status[status] = by_status.get(status, 0) + 1

    response = {
        "total_cost_usd": round(total_cost, 4),
        "total_entries": len(entries),
        "total_nodes_generated": sum(e.get("nodes_generated", 0) for e in entries),
        "total_nodes_added": sum(e.get("nodes_added", 0) for e in entries),
        "by_domain": by_domain,
        "by_status": by_status,
        "recent": entries[-10:] if entries else [],
    }
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={"endpoint": "/costs", "entries": response["total_entries"]},
    )
    return response


@router.get("/i18n/status")
async def i18n_status(request: Request, locale: str = Query(default="zh", min_length=2, max_length=16)):
    """Get translation coverage status."""
    from backend.services import json_service
    nodes = json_service._load_nodes()

    i18n_path = BASE_DIR / "data" / "i18n" / f"{locale}.json"
    translated = {}
    if i18n_path.exists():
        with open(i18n_path, encoding="utf-8") as f:
            translated = json.load(f)

    total = len(nodes)
    done = sum(1 for n in nodes if n["id"] in translated)

    response = {
        "locale": locale,
        "total_nodes": total,
        "translated": done,
        "coverage_pct": round(done / total * 100, 1) if total > 0 else 0,
        "missing_count": total - done,
        "exists": i18n_path.exists(),
    }
    _append_admin_audit_event(
        event_type="admin_read",
        request=request,
        status="success",
        detail={
            "endpoint": "/i18n/status",
            "locale": locale,
            "coverage_pct": response["coverage_pct"],
        },
    )
    return response
