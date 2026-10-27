"""
src/scoring/run_scoring.py
───────────────────────────
Stage 4 (notebook 04) equivalent: compute livability scores and write
scores_wide.csv to data/processed/.

Run with:
    python -m src.scoring.run_scoring
"""

import logging
import sys
import json

import pandas as pd

from src.utils.constants import (
    DATA_PROCESSED,
    FACTORS_WIDE,
    SCORES_WIDE,
    SCORING_CONFIG,
    MODELS_DIR,
    CORE_FACTORS,
)
from src.utils.helpers import setup_logging
from src.scoring.scoring import compute_scores, load_config, sensitivity_analysis

logger = logging.getLogger(__name__)


def run() -> None:
    setup_logging()
    logger.info("=== SCORING STAGE START ===")

    # Load inputs
    if not FACTORS_WIDE.exists():
        logger.error("factors_wide.csv not found — run the data pipeline first.")
        sys.exit(1)

    factors_wide = pd.read_csv(FACTORS_WIDE)
    # Coerce numeric columns
    for col in ["year", "pm25_mean", "crime_rate_per_lakh", "infant_mortality_rate",
                "per_capita_nsdp_constant", "unemployment_rate", "avg_rent"]:
        if col in factors_wide.columns:
            factors_wide[col] = pd.to_numeric(factors_wide[col], errors="coerce")

    config = load_config(SCORING_CONFIG)
    logger.info("Loaded factors_wide: %d rows, %d columns.", len(factors_wide), len(factors_wide.columns))

    # Default balanced weights (M5 specification: 35/25/25/15)
    default_weights = {
        "air_quality": 0.35,
        "safety":      0.25,
        "health":      0.25,
        "economy":     0.15,
    }

    # Compute scores for every year in the data
    all_scores = []
    for year in sorted(factors_wide["year"].dropna().astype(int).unique()):
        try:
            scored = compute_scores(factors_wide, config, default_weights, year=year)
            all_scores.append(scored)
        except ValueError as e:
            logger.warning("Skipping year %d: %s", year, e)

    if not all_scores:
        logger.error("No scores produced. Check factors_wide.csv.")
        sys.exit(1)

    scores_wide = pd.concat(all_scores, ignore_index=True)
    logger.info("Scores computed: %d rows across %d years.", len(scores_wide),
                scores_wide["year"].nunique())

    # Export
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    scores_wide.to_csv(SCORES_WIDE, index=False)
    logger.info("Saved: %s", SCORES_WIDE)

    # Sensitivity analysis on latest year
    latest_year = int(scores_wide["year"].max())
    try:
        sensitivity = sensitivity_analysis(factors_wide, config, year=latest_year, n_draws=500)
        sensitivity_path = DATA_PROCESSED / "sensitivity.csv"
        sensitivity.to_csv(sensitivity_path, index=False)
        logger.info("Saved sensitivity analysis: %s", sensitivity_path)
    except Exception as e:
        logger.warning("Sensitivity analysis skipped: %s", e)

    logger.info("=== SCORING STAGE COMPLETE ===")


if __name__ == "__main__":
    run()
