"""
Internationalization endpoints.
"""

import json
import re

from fastapi import APIRouter, HTTPException

from backend.config import get_settings
from backend.services.resolver import get_graph_service

router = APIRouter()
LOCALE_RE = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$")
DEFAULT_LOCALE = "en"


def _read_locale_file(i18n_root, locale: str):
    file_path = (i18n_root / f"{locale}.json").resolve()
    try:
        file_path.relative_to(i18n_root)
    except ValueError:
        return None

    if not file_path.exists():
        return None

    with open(file_path, encoding="utf-8-sig") as f:
        return json.load(f)


def _read_description_payload(i18n_root, locale: str):
    candidates = [
        f"{locale}_descriptions.json",
        f"{locale}_descriptions_batch1.json",
    ]

    for file_name in candidates:
        file_path = (i18n_root / file_name).resolve()
        try:
            file_path.relative_to(i18n_root)
        except ValueError:
            continue

        if not file_path.exists():
            continue

        with open(file_path, encoding="utf-8-sig") as f:
            payload = json.load(f)

        if isinstance(payload, dict):
            descriptions = payload.get("descriptions")
            if isinstance(descriptions, dict):
                return descriptions
            return payload

    return None


def _get_english_description_baseline(i18n_root):
    """Return the canonical English description map.

    Preference order:
    1) i18n English description files (if present)
    2) graph description source of truth
    """
    english_payload = _read_description_payload(i18n_root, DEFAULT_LOCALE)
    if isinstance(english_payload, dict) and english_payload:
        return english_payload

    try:
        graph_service = get_graph_service()
        graph_payload = graph_service.get_all_descriptions()
        if isinstance(graph_payload, dict):
            return graph_payload
    except Exception:
        # Keep endpoint resilient; empty fallback is handled by caller.
        pass

    return {}


@router.get("/{locale}/descriptions")
async def get_descriptions(locale: str):
    """Get localized description map for a locale."""
    requested_locale = locale if LOCALE_RE.match(locale) else DEFAULT_LOCALE

    settings = get_settings()
    i18n_root = settings.i18n_dir.resolve()

    try:
        english_payload = _get_english_description_baseline(i18n_root)

        if requested_locale == DEFAULT_LOCALE:
            return english_payload

        requested_payload = _read_description_payload(i18n_root, requested_locale)
        if isinstance(requested_payload, dict):
            if not english_payload:
                return requested_payload
            # Always return full keyset: English baseline plus locale overrides.
            return {**english_payload, **requested_payload}

        return english_payload
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Description locale file is corrupted") from exc


@router.get("/{locale}")
async def get_translations(locale: str):
    """Get translation map for a locale (unknown locales fall back to en)."""
    requested_locale = locale if LOCALE_RE.match(locale) else DEFAULT_LOCALE

    settings = get_settings()
    i18n_root = settings.i18n_dir.resolve()

    try:
        requested_payload = _read_locale_file(i18n_root, requested_locale)
        if isinstance(requested_payload, dict):
            return requested_payload

        english_payload = _read_locale_file(i18n_root, DEFAULT_LOCALE)
        if isinstance(english_payload, dict):
            return english_payload
        return {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Locale file is corrupted") from exc
