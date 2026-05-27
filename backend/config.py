"""
Application configuration loaded from config.yaml + environment variables.
"""

from pathlib import Path
from functools import lru_cache

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).parent.parent
CONFIG_FILE = BASE_DIR / "config.yaml"


def load_yaml_config() -> dict:
    with open(CONFIG_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env")

    app_env: str = "development"  # development | staging | production

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    # Admin
    admin_api_key: str = ""  # Set via ADMIN_API_KEY env var; empty = no auth (dev only)
    admin_allowed_ips: str = ""  # Comma-separated IP/CIDR allowlist for /api/admin routes
    admin_trust_forwarded_for: bool = False
    admin_trusted_proxies: str = ""  # Comma-separated proxy IP/CIDR list allowed to supply X-Forwarded-For
    admin_enable_generation_in_production: bool = False
    admin_max_tasks: int = 200
    admin_task_ttl_seconds: int = 24 * 60 * 60
    admin_trigger_window_seconds: int = 60
    admin_trigger_max_requests: int = 8
    admin_alert_per_minute: int = 12
    admin_alert_per_day: int = 200
    admin_audit_retention_days: int = 30
    admin_audit_max_file_mb: int = 10
    admin_audit_max_rotated_files: int = 7

    # Notifications
    alert_webhook_url: str = ""
    alert_webhook_timeout_seconds: int = 5
    alert_min_interval_seconds: int = 300

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: str = "*"  # Comma-separated origins, e.g. https://a.com,https://b.com

    # Paths
    base_dir: Path = BASE_DIR
    nodes_file: Path = BASE_DIR / "data" / "all_nodes.json"
    field_nodes_file: Path = BASE_DIR / "data" / "field_nodes.json"
    i18n_dir: Path = BASE_DIR / "data" / "i18n"

    @property
    def parsed_cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return origins or ["*"]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def is_public_env(self) -> bool:
        return self.app_env.lower() in {"production", "prod", "staging", "stage"}


def validate_startup_settings(settings: Settings) -> None:
    """Fail fast for unsafe public-environment configuration."""
    if not settings.is_public_env:
        return

    errors = []
    if not settings.admin_api_key.strip():
        errors.append("ADMIN_API_KEY must be set in staging/production")
    if settings.parsed_cors_origins == ["*"]:
        errors.append("CORS_ORIGINS cannot be '*' in staging/production")

    if errors:
        raise RuntimeError("Invalid production configuration: " + "; ".join(errors))


@lru_cache()
def get_settings() -> Settings:
    return Settings()


@lru_cache()
def get_yaml_config() -> dict:
    return load_yaml_config()
