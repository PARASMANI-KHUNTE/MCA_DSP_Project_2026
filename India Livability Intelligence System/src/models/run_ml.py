"""
src/models/run_ml.py
─────────────────────
Stage 5 (notebook 05) equivalent: fit trend projections and K-Means clusters,
then write trends.csv and clusters.csv to data/processed/.

Run with:
    python -m src.models.run_ml
"""

import logging
import sys
import json

import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, r2_score

from src.utils.constants import (
    DATA_PROCESSED,
    SCORES_WIDE,
    TRENDS_CSV,
    CLUSTERS_CSV,
    METRICS_JSON,
    MODELS_DIR,
    SCORING_CONFIG,
    PROJECTION_YEARS,
)
from src.utils.helpers import setup_logging
from src.scoring.scoring import load_config
from src.models.trend import run_all_trends
from src.models.clustering import run_clustering

logger = logging.getLogger(__name__)

FACTOR_SCORE_COLS = [
    "air_quality_score",
    "safety_score",
    "health_score",
    "economy_score",
]


def _build_scores_long(scores_wide: pd.DataFrame) -> pd.DataFrame:
    """
    Convert the wide score table to a long table with columns:
    place_id, year, factor, score, gap_flag, series_break
    suitable for run_all_trends().
    """
    rows = []
    score_col_map = {c.replace("_score", ""): c for c in FACTOR_SCORE_COLS if c in scores_wide.columns}

    for _, row in scores_wide.iterrows():
        for factor, col in score_col_map.items():
            score_val = row.get(col)
            break_column = f"{factor}_series_break"
            gap_column = f"{factor}_gap_flag"
            rows.append({
                "place_id":    row["place_id"],
                "year":        int(row["year"]),
                "factor":      factor,
                "score":       score_val,
                "gap_flag":    row.get(gap_column, row.get("gap_flag", "")),
                "series_break": row.get(break_column, row.get("series_break", False)),
            })

    return pd.DataFrame(rows)


def _metric_summary(actual: list[float], predicted: list[float]) -> dict:
    if not actual:
        return {"n": 0, "mse": None, "rmse": None, "r2": None}
    mse = float(mean_squared_error(actual, predicted))
    return {
        "n": len(actual),
        "mse": mse,
        "rmse": float(np.sqrt(mse)),
        "r2": float(r2_score(actual, predicted)) if len(actual) >= 2 else None,
    }


def evaluate_air_holdout(scores_wide: pd.DataFrame) -> dict:
    """Evaluate city air-score OLS against a last-observation baseline.

    The fixed SRS split is train 2015–2018, validation 2019, and test 2023–2024.
    Metrics pool eligible city-year predictions; missing city-years are omitted.
    """
    required = {"place_id", "year", "air_quality_score"}
    if not required.issubset(scores_wide.columns):
        return {"status": "unavailable", "reason": "required score columns are missing"}

    table = scores_wide[["place_id", "year", "air_quality_score"]].copy()
    table["year"] = pd.to_numeric(table["year"], errors="coerce")
    table["air_quality_score"] = pd.to_numeric(table["air_quality_score"], errors="coerce")
    table = table.dropna(subset=["year", "air_quality_score"])
    predictions = {"validation": {"actual": [], "ols": [], "baseline": []},
                   "test": {"actual": [], "ols": [], "baseline": []}}

    for _, group in table.groupby("place_id"):
        group = group.sort_values("year")
        train = group[group["year"].between(2015, 2018)]
        if len(train) < 3:
            continue
        slope, intercept = np.polyfit(train["year"].to_numpy(), train["air_quality_score"].to_numpy(), 1)
        baseline_value = float(train.iloc[-1]["air_quality_score"])
        for split_name, split_rows in (
            ("validation", group[group["year"] == 2019]),
            ("test", group[group["year"].between(2023, 2024)]),
        ):
            if split_rows.empty:
                continue
            forecast = np.clip(intercept + slope * split_rows["year"].to_numpy(), 0, 100)
            predictions[split_name]["actual"].extend(split_rows["air_quality_score"].astype(float).tolist())
            predictions[split_name]["ols"].extend(forecast.astype(float).tolist())
            predictions[split_name]["baseline"].extend([baseline_value] * len(split_rows))

    return {
        "target": "air_quality_score",
        "unit_of_evaluation": "pooled city-year predictions",
        "split_years": {"train": "2015-2018", "validation": "2019", "test": "2023-2024"},
        "validation": {
            "ols": _metric_summary(predictions["validation"]["actual"], predictions["validation"]["ols"]),
            "naive_last_value": _metric_summary(predictions["validation"]["actual"], predictions["validation"]["baseline"]),
        },
        "test": {
            "ols": _metric_summary(predictions["test"]["actual"], predictions["test"]["ols"]),
            "naive_last_value": _metric_summary(predictions["test"]["actual"], predictions["test"]["baseline"]),
        },
    }


def run() -> None:
    setup_logging()
    logger.info("=== ML STAGE START ===")

    # Load inputs
    if not SCORES_WIDE.exists():
        logger.error("scores_wide.csv not found — run src.scoring.run_scoring first.")
        sys.exit(1)

    scores_wide = pd.read_csv(SCORES_WIDE)
    for col in ["year"] + FACTOR_SCORE_COLS:
        if col in scores_wide.columns:
            scores_wide[col] = pd.to_numeric(scores_wide[col], errors="coerce")

    logger.info("Loaded scores_wide: %d rows.", len(scores_wide))

    config = load_config(SCORING_CONFIG)
    model_evaluation = evaluate_air_holdout(scores_wide)

    # ── Trend projection ────────────────────────────────────────────────────
    logger.info("Fitting trend projections...")
    scores_long = _build_scores_long(scores_wide)

    trends_df, projections_df = run_all_trends(scores_long, config, include_covid=True)

    # Embed projections as columns in trends_df for easy API consumption
    if not projections_df.empty and not trends_df.empty:
        proj_pivot = {}
        for (pid, factor), grp in projections_df.groupby(["place_id", "factor"]):
            grp = grp.sort_values("year").reset_index(drop=True)
            for i, row in grp.iterrows():
                proj_pivot.setdefault((pid, factor), {})[f"proj_yr_{i+1}"]  = row["yhat"]
                proj_pivot.setdefault((pid, factor), {})[f"lower_yr_{i+1}"] = row["lower"]
                proj_pivot.setdefault((pid, factor), {})[f"upper_yr_{i+1}"] = row["upper"]

        # Also store last_year for projections offset
        for (pid, factor), grp in scores_long.groupby(["place_id", "factor"]):
            valid = grp.dropna(subset=["score"])
            if not valid.empty:
                proj_pivot.setdefault((pid, factor), {})["last_year"] = int(valid["year"].max())

        proj_rows = []
        for (pid, factor), cols_dict in proj_pivot.items():
            proj_rows.append({"place_id": pid, "factor": factor, **cols_dict})

        proj_meta_df = pd.DataFrame(proj_rows)
        trends_df = trends_df.merge(proj_meta_df, on=["place_id", "factor"], how="left")

    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    trends_df.to_csv(TRENDS_CSV, index=False)
    logger.info("Saved: %s (%d rows)", TRENDS_CSV, len(trends_df))

    # ── K-Means clustering ──────────────────────────────────────────────────
    logger.info("Running K-Means clustering...")
    available_score_cols = [c for c in FACTOR_SCORE_COLS if c in scores_wide.columns]

    # Use the latest year with broad coverage, breaking ties in favor of the
    # latest year. This keeps cluster summaries aligned with reported results.
    best_year = None
    best_count = 0
    for yr in sorted(scores_wide["year"].unique(), reverse=True):
        yr_df = scores_wide[scores_wide["year"] == yr]
        cnt = yr_df["score"].notna().sum()
        if cnt > best_count:
            best_count = cnt
            best_year = yr

    latest_year = int(best_year) if best_year is not None else int(scores_wide["year"].max())
    latest_scores = scores_wide[scores_wide["year"] == latest_year].copy()

    metrics = {
        "input_source_status": "local files not independently verified against publishers",
        "analysis_scope": "factor-level exploratory trends only; no composite score is available",
        "composite_available": bool(scores_wide.get("score", pd.Series(dtype=float)).notna().any()),
        "clustering": {"status": "skipped", "year": latest_year, "n_places": 0},
        "trends": {
            "n_fitted": int((trends_df["outlook"] != "Insufficient data").sum()),
            "n_insufficient": int((trends_df["outlook"] == "Insufficient data").sum()),
            "improving": int((trends_df["outlook"] == "Improving").sum()),
            "declining": int((trends_df["outlook"] == "Declining").sum()),
            "stable": int((trends_df["outlook"] == "Stable or uncertain").sum()),
        },
        "holdout_evaluation": model_evaluation,
    }

    # Build feature columns: use composite score (available for all places)
    # Factor-level scores have disjoint coverage (air=city-only, safety/health=state-only),
    # so we cannot cluster on multiple factors without dropping all rows.
    # The composite score already integrates available factors per place.
    feature_cols = []
    if "score" in latest_scores.columns:
        feature_cols.append("score")
    # The saved composite is the common feature across state and city records;
    # this is intentionally a one-dimensional tier comparison.

    logger.info("Clustering %d places on %d features: %s", len(latest_scores), len(feature_cols), feature_cols)

    if not feature_cols or len(latest_scores.dropna(subset=feature_cols[:1])) < 4:
        logger.warning("Not enough data for clustering — skipping.")
        pd.DataFrame(columns=["place_id", "cluster_id", "tier_label"]).to_csv(CLUSTERS_CSV, index=False)
        pd.DataFrame().to_csv(DATA_PROCESSED / "cluster_profiles.csv", index=False)
        pd.DataFrame(columns=["k", "silhouette"]).to_csv(DATA_PROCESSED / "kmeans_metrics.csv", index=False)
    else:
        try:
            clusters_df, profiles_df, km_metrics_df = run_clustering(
                latest_scores,
                factor_score_cols=feature_cols,
            )
            clusters_df.to_csv(CLUSTERS_CSV, index=False)
            logger.info("Saved: %s (%d places clustered)", CLUSTERS_CSV, len(clusters_df))

            # Save cluster profiles and elbow metrics for notebook display
            profiles_path = DATA_PROCESSED / "cluster_profiles.csv"
            profiles_df.to_csv(profiles_path)
            logger.info("Saved: %s", profiles_path)

            if not km_metrics_df.empty:
                km_path = DATA_PROCESSED / "kmeans_metrics.csv"
                km_metrics_df.to_csv(km_path, index=False)
                logger.info("Saved: %s", km_path)

            metrics["clustering"] = {
                "status": "complete",
                "k_chosen": int(clusters_df["cluster_id"].nunique()),
                "year": latest_year,
                "n_places": len(clusters_df),
            }

        except Exception as e:
            logger.error("Clustering failed: %s", e, exc_info=True)
            pd.DataFrame(columns=["place_id", "cluster_id", "tier_label"]).to_csv(CLUSTERS_CSV, index=False)
            metrics["clustering"] = {"status": "failed", "year": latest_year, "error": str(e)}

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    with open(METRICS_JSON, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    logger.info("Saved: %s", METRICS_JSON)

    logger.info("=== ML STAGE COMPLETE ===")


if __name__ == "__main__":
    run()
