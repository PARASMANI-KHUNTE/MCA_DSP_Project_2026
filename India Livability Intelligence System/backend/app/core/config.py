"""
backend/app/core/config.py
───────────────────────────
Application configuration loaded from environment variables.
"""

from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_value(cls, value):
        """Accept common deployment labels as safe false values (e.g. DEBUG=release)."""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod", ""}:
                return False
        return value

    # Path to the processed data directory (mounted read-only in Docker)
    data_dir: Path = Path(__file__).resolve().parents[3] / "data" / "processed"

    # API metadata
    app_title: str = "India Livability Intelligence System API"
    app_version: str = "1.0.0"
    app_description: str = (
        "Read-only REST API serving livability scores, trend projections, "
        "and cluster labels for Indian states and cities."
    )

    # CORS — restrict to your frontend origin in production
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Set to True to print SQL / verbose logs
    debug: bool = False


settings = Settings()
