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
from src.scoring.scoring import normalize_value
from src.models.trend import fit_trend
from src.utils.constants import RAW_COL

logger = logging.getLogger(__name__)

# Factors that are always inherited from the state at city level
_INHERITED_FACTORS = {"safety", "health", "per_capita_nsdp_constant", "unemployment_rate"}
_FACTOR_ALIASES = {
    "air": "air_quality",
    "col": "cost_of_living",
    "nsdp": "per_capita_nsdp_constant",
    "unemployment": "unemployment_rate",
}


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

    # The rent snapshot is stored in the tidy table because it has no annual
    # time series. Pivot its single observed value into the wide frame so the
    # shared scorer can rank it with exactly the configured bounds/direction.
    tidy = store.factors_tidy
    if not tidy.empty and {"factor", "place_id", "value_raw"}.issubset(tidy.columns):
        columns = ["place_id", "value_raw"]
        if "year" in tidy.columns:
            columns.append("year")
        rent = tidy.loc[tidy["factor"] == "cost_of_living", columns].copy()
        if not rent.empty:
            rent["cost_of_living"] = pd.to_numeric(rent.pop("value_raw"), errors="coerce")
            # The tidy snapshot has no year. Reconstruct the release year from
            # the local input's Posted On column, matching the frontend export.
            if "year" not in rent or rent["year"].isna().all():
                raw_files = list(RAW_COL.glob("*.csv"))
                snapshot_year = None
                if raw_files:
                    try:
                        posted = pd.read_csv(raw_files[0], usecols=["Posted On"])["Posted On"]
                        parsed = pd.to_datetime(posted, errors="coerce").dt.year.dropna()
                        snapshot_year = int(parsed.max()) if not parsed.empty else None
                    except (ValueError, OSError):
                        snapshot_year = None
                rent["year"] = snapshot_year
            rent["year"] = pd.to_numeric(rent["year"], errors="coerce")
            rent = rent.dropna(subset=["year"])
            rent = rent.groupby(["place_id", "year"], as_index=False)["cost_of_living"].mean()
            if not factors_wide.empty:
                factors_wide["year"] = pd.to_numeric(factors_wide["year"], errors="coerce")
            factors_wide = factors_wide.merge(rent, on=["place_id", "year"], how="outer")

    normalized_weights = {
        _FACTOR_ALIASES.get(name, name): value for name, value in weights.items()
    }

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
        scored = _compute_scores(factors_wide, config, normalized_weights, year=year)
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
            display_name = {"air_quality": "air", "cost_of_living": "col"}.get(fname, fname)
            factor_scores[display_name] = None if pd.isna(val) else float(val)

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

    positive_weights = {key: float(value) for key, value in normalized_weights.items() if float(value) > 0}
    weight_total = sum(positive_weights.values())
    normalized_output = {key: value / weight_total for key, value in positive_weights.items()} if weight_total else {}
    return year, normalized_output, results


def get_place_trend(store: DataStore, place_id: str) -> list[dict]:
    """
    Compute trends from the active observed factor rows for one place.
    Snapshot factors are explicitly returned without a projection.
    """
    tidy = store.factors_tidy
    if tidy.empty or "place_id" not in tidy.columns:
        return []
    place_rows = tidy[tidy["place_id"] == place_id].copy()
    if place_rows.empty:
        return []
    config = store.scoring_config.get("factors", {})
    results = []
    for factor, rows in place_rows.groupby("factor"):
        factor = str(factor)
        factor_config = config.get(factor, {})
        trend_setting = factor_config.get("trend", "eligible")
        rows["year"] = pd.to_numeric(rows.get("year"), errors="coerce")
        rows["value_raw"] = pd.to_numeric(rows.get("value_raw"), errors="coerce")
        rows = rows.dropna(subset=["year", "value_raw"]).sort_values("year")
        direction = factor_config.get("direction")
        bounds = factor_config.get("bounds")

        if factor == "cost_of_living" or trend_setting in {"never", "snapshot"}:
            results.append({
                "factor": factor,
                "n_points": int(len(rows)) if not rows.empty else 1,
                "slope": None,
                "p_value": None,
                "r2": None,
                "outlook": "No trend available",
                "series_break_flag": False,
                "gap_flag": "snapshot_factor",
                "projections": [],
            })
            continue

        if rows.empty or not direction or not bounds:
            continue
        values = [
            normalize_value(value, bounds[0], bounds[1], direction)
            for value in rows["value_raw"].astype(float)
        ]
        breaks = rows.get("series_break", pd.Series(False, index=rows.index)).fillna(False).astype(bool)
        series_break_flag = bool(breaks.any())
        if series_break_flag:
            segment = breaks.cumsum()
            rows = rows.loc[segment == segment.max()]
            values = [
                normalize_value(value, bounds[0], bounds[1], direction)
                for value in rows["value_raw"].astype(float)
            ]
        gap_flag = "|".join(rows.get("gap_flag", pd.Series(dtype=str)).dropna().astype(str).unique())
        fitted = fit_trend(
            years=rows["year"].astype(float).to_numpy(),
            scores=pd.Series(values, index=rows.index).to_numpy(),
            place_id=place_id,
            factor=factor,
            series_break_flag=series_break_flag,
            gap_flag=gap_flag,
        )
        projection_rows = fitted.projections.to_dict("records") if not fitted.projections.empty else []
        results.append({
            "factor": factor,
            "n_points": int(fitted.n_points),
            "slope": float(fitted.slope) if pd.notna(fitted.slope) else None,
            "p_value": float(fitted.p_value) if pd.notna(fitted.p_value) else None,
            "r2": float(fitted.r2) if pd.notna(fitted.r2) else None,
            "outlook": fitted.outlook,
            "series_break_flag": bool(fitted.series_break_flag),
            "gap_flag": fitted.gap_flag,
            "projections": [
                {"year": int(item["year"]), "yhat": float(item["yhat"]),
                 "lower": float(item["lower"]), "upper": float(item["upper"])}
                for item in projection_rows
            ],
        })

    return results
