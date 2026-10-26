"""
backend/app/core/config.py
───────────────────────────
Application configuration loaded from environment variables.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Path to the processed data directory (mounted read-only in Docker)
    data_dir: Path = Path(__file__).resolve().parents[4] / "data" / "processed"

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
