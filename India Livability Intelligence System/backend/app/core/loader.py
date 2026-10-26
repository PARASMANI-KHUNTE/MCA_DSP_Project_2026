"""
backend/app/core/loader.py
───────────────────────────
Loads processed data files ONCE at startup and exposes them as module-level
objects.  All routes import from here — no file I/O at request time.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path

import pandas as pd
import yaml

from backend.app.core.config import settings
from src.utils.constants import SCORING_CONFIG

logger = logging.getLogger(__name__)


class DataStore:
    """Container for all preloaded data."""

    places: pd.DataFrame
    factors_tidy: pd.DataFrame
    factors_wide: pd.DataFrame
    scores_wide: pd.DataFrame
    trends: pd.DataFrame
    clusters: pd.DataFrame
    source_register: pd.DataFrame
    scoring_config: dict
    metrics: dict
    data_version: str

    def __init__(self, data_dir: Path, config_path: Path = SCORING_CONFIG) -> None:
        self.data_version = "unknown"
        self._load_all(data_dir, config_path)

    def _load_all(self, data_dir: Path, config_path: Path) -> None:
        def _read_csv(name: str) -> pd.DataFrame:
            path = data_dir / name
            if not path.exists():
                logger.error("Missing processed file: %s", path)
                return pd.DataFrame()
            return pd.read_csv(path, dtype=str, low_memory=False)

        def _read_parquet(name: str) -> pd.DataFrame:
            path = data_dir / name
            if not path.exists():
                logger.error("Missing parquet file: %s", path)
                return pd.DataFrame()
            return pd.read_parquet(path)

        logger.info("Loading data from %s ...", data_dir)

        self.places          = _read_csv("places.csv")
        self.factors_tidy    = _read_parquet("factors_tidy.parquet")
        self.factors_wide    = _read_csv("factors_wide.csv")
        self.scores_wide     = _read_csv("scores_wide.csv")
        self.trends          = _read_csv("trends.csv")
        self.clusters        = _read_csv("clusters.csv")
        self.source_register = _read_csv("../raw/source_register.csv")

        # Scoring config
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                self.scoring_config = yaml.safe_load(f)
        else:
            logger.error("Scoring config not found: %s", config_path)
            self.scoring_config = {}

        # Model metrics
        metrics_path = data_dir.parent.parent / "models" / "metrics.json"
        if metrics_path.exists():
            with open(metrics_path, "r", encoding="utf-8") as f:
                self.metrics = json.load(f)
        else:
            self.metrics = {}

        # Numeric coercions
        for col in ["year"]:
            for df_name in ["factors_tidy", "factors_wide", "scores_wide", "trends"]:
                df = getattr(self, df_name, pd.DataFrame())
                if not df.empty and col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

        logger.info(
            "DataStore ready: %d places, %d tidy rows, %d trend rows.",
            len(self.places), len(self.factors_tidy), len(self.trends),
        )
        self.data_version = str(data_dir)


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    """Return the singleton DataStore (loaded once, cached forever)."""
    store = DataStore(settings.data_dir)
    return store
