"""
backend/app/services/scoring.py
────────────────────────────────
Scoring service — wraps the core scoring engine for API use.
Handles the translation between the API's request format and
the scoring module's DataFrame-based interface.
"""

import logging

import numpy as np
import pandas as pd

from backend.app.core.loader import DataStore
from src.scoring.scoring import compute_scores as _compute_scores, load_config

logger = logging.getLogger(__name__)

# Factors that are always inherited from the state at city level
_INHERITED_FACTORS = {"safety", "health", "per_capita_nsdp_constant", "unemployment_rate"}


def score_all_places(
    store: DataStore,
    weights: dict[str, float],
    year: int | None,
    place_type: str | None,
) -> tuple[int, dict[str, float], list[dict]]:
    """
    Compute livability scores for all places.

    Returns
    -------
    (used_year, normalized_weights, results_list)
    results_list: list of dicts matching PlaceScoreOut schema
    """
    config = store.scoring_config
    factors_wide = store.factors_wide.copy()
    places = store.places.copy()

    if factors_wide.empty:
        logger.error("factors_wide is empty — pipeline has not been run yet.")
        return (year or 0), weights, []

    # Determine year
    numeric_years = pd.to_numeric(factors_wide.get("year", pd.Series(dtype=float)), errors="coerce")
    if year is None:
        year = int(numeric_years.max())

    # Filter by place_type if requested
    if place_type:
        valid_ids = set(places[places["place_type"] == place_type]["place_id"].tolist())
        factors_wide = factors_wide[factors_wide["place_id"].isin(valid_ids)]

    # Run scoring engine
    try:
        scored = _compute_scores(factors_wide, config, weights, year=year)
    except ValueError as e:
        logger.error("Scoring failed: %s", e)
        return year, weights, []

    # Merge with places for display names
    places_lookup = places.set_index("place_id")[[
        "place_name", "place_type", "state_name"
    ]].to_dict("index")

    factor_cols = [c for c in scored.columns if c.endswith("_score")]

    results = []
    for _, row in scored.iterrows():
        pid = row["place_id"]
        place_info = places_lookup.get(pid, {})
        is_city = place_info.get("place_type") == "city"

        factor_scores = {}
        for col in factor_cols:
            fname = col.replace("_score", "")
            val = row.get(col)
            factor_scores[fname] = None if pd.isna(val) else float(val)

        inherited = list(_INHERITED_FACTORS) if is_city else []

        results.append({
            "place_id":        pid,
            "place_name":      place_info.get("place_name", pid),
            "place_type":      place_info.get("place_type", ""),
            "state_name":      place_info.get("state_name", ""),
            "score":           None if pd.isna(row["score"]) else float(row["score"]),
            "rank":            None if pd.isna(row["rank"])  else int(row["rank"]),
            "factor_scores":   factor_scores,
            "partial_data":    bool(row.get("partial_data", False)),
            "missing_factors": row.get("missing_factors", []) or [],
            "inherited_factors": inherited,
        })

    return year, weights, results


def get_place_trend(store: DataStore, place_id: str) -> list[dict]:
    """
    Return trend data for a place from the precomputed trends table.
    """
    trends = store.trends.copy()
    projections_path = store.scores_wide  # placeholder; replace with projections.csv if saved separately

    if trends.empty or "place_id" not in trends.columns:
        return []

    place_trends = trends[trends["place_id"] == place_id]
    if place_trends.empty:
        return []

    results = []
    for _, row in place_trends.iterrows():
        factor = row.get("factor", "")
        outlook = row.get("outlook", "Insufficient data")

        # Load projections from trends if they are embedded as columns
        proj = []
        proj_year_cols = [c for c in trends.columns if c.startswith("proj_yr_")]
        lower_cols     = [c for c in trends.columns if c.startswith("lower_yr_")]
        upper_cols     = [c for c in trends.columns if c.startswith("upper_yr_")]

        base_year = int(float(row.get("last_year", 2024)))
        for i, (pc, lc, uc) in enumerate(zip(proj_year_cols, lower_cols, upper_cols), start=1):
            yhat_val  = row.get(pc)
            lower_val = row.get(lc)
            upper_val = row.get(uc)
            if pd.notna(yhat_val):
                proj.append({
                    "year":  base_year + i,
                    "yhat":  float(yhat_val),
                    "lower": float(lower_val) if pd.notna(lower_val) else float(yhat_val),
                    "upper": float(upper_val) if pd.notna(upper_val) else float(yhat_val),
                })

        results.append({
            "factor":            factor,
            "n_points":          int(row.get("n_points", 0)),
            "slope":             float(row["slope"]) if pd.notna(row.get("slope")) else None,
            "p_value":           float(row["p_value"]) if pd.notna(row.get("p_value")) else None,
            "r2":                float(row["r2"]) if pd.notna(row.get("r2")) else None,
            "outlook":           outlook,
            "series_break_flag": bool(row.get("series_break_flag", False)),
            "gap_flag":          str(row.get("gap_flag", "")),
            "projections":       proj,
        })

    return results
