"""
src/run_all.py
──────────────
Master end-to-end execution script for the India Livability Intelligence System.

Executes all analytical stages in strict sequence:
  1. Data Ingestion, Cleaning & Merging (src.cleaning.run_pipeline)
  2. Composite Scoring & Sensitivity Analysis (src.scoring.run_scoring)
  3. Machine Learning, Trend Fitting & Clustering (src.models.run_ml)
  4. Inferential Statistics, ANOVA & Findings (src.analysis.run_eda)
  5. Frontend Data Bundle Export & Public Data Sync (src.export_frontend_data)

Usage:
  python -m src.run_all
"""

from __future__ import annotations

import logging
import sys
import time

from src.utils.helpers import setup_logging

logger = logging.getLogger("run_all")


def run_all() -> None:
    """Execute the full data pipeline end-to-end, refreshing all outputs and frontend public artifacts."""
    setup_logging()
    start_time = time.time()
    logger.info("================================================================================")
    logger.info("INDIA LIVABILITY INTELLIGENCE SYSTEM — END-TO-END PIPELINE EXECUTION")
    logger.info("================================================================================")

    # Stage 1: Cleaning & Merging
    logger.info(">>> Stage 1/5: Running Data Cleaning & Merging Pipeline...")
    from src.cleaning.run_pipeline import run as run_pipeline
    run_pipeline()

    # Stage 2: Composite Scoring
    logger.info(">>> Stage 2/5: Running Livability Scoring Engine & Sensitivity Analysis...")
    from src.scoring.run_scoring import run as run_scoring
    run_scoring()

    # Stage 3: ML & Clustering
    logger.info(">>> Stage 3/5: Running Trend Modeling, Metrics & K-Means Clustering...")
    from src.models.run_ml import run as run_ml
    run_ml()

    # Stage 4: Statistical EDA
    logger.info(">>> Stage 4/5: Running Inferential Statistics, Regional ANOVA & Figures...")
    from src.analysis.run_eda import run_eda
    run_eda()

    # Stage 5: Export & Sync
    logger.info(">>> Stage 5/5: Exporting Frontend realData.js & Synchronizing Public Data...")
    from src.export_frontend_data import main as run_export
    run_export()

    elapsed = time.time() - start_time
    logger.info("================================================================================")
    logger.info("PIPELINE EXECUTION COMPLETE: All stages finished in %.2f seconds.", elapsed)
    logger.info("Processed data, models, reports, and public frontend artifacts are up-to-date.")
    logger.info("================================================================================")


if __name__ == "__main__":
    run_all()
