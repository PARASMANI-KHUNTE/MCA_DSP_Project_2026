"""
src/scoring/scoring.py
───────────────────────
Livability scoring engine (M5).

Pure functions only — no file I/O, no network access.
This makes the module easy to test (M10) and importable
from both notebooks and the FastAPI backend.
"""

import logging
from typing import Any

import numpy as np
import pandas as pd
import yaml

from src.utils.constants import (
    SCORING_CONFIG,
    CORE_FACTORS,
    FACTOR_COL,
    SCORE_MIN,
    SCORE_MAX,
    SENSITIVITY_N_DRAWS,
    SENSITIVITY_SEED,
)

logger = logging.getLogger(__name__)


# ── Config loading ─────────────────────────────────────────────────────────

def load_config(path=SCORING_CONFIG) -> dict:
    """Load and return the factors_config.yaml as a dict."""
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# ── Normalization ──────────────────────────────────────────────────────────

def normalize_value(
    x: float,
    lo: float,
    hi: float,
    direction: str,
) -> float:
    """
    Normalize a single raw value to [0, 100].

    Parameters
    ----------
    direction : 'higher_is_better' | 'lower_is_better'

    Formula (M5.2):
        higher_is_better : score = 100 × (x − lo) / (hi − lo)
        lower_is_better  : score = 100 × (hi − x) / (hi − lo)

    Values outside [lo, hi] are clipped before normalization.
    """
    if hi == lo:
        return 50.0  # degenerate bounds — return mid-point
    x_clipped = float(np.clip(x, lo, hi))
    if direction == "higher_is_better":
        return 100.0 * (x_clipped - lo) / (hi - lo)
    elif direction == "lower_is_better":
        return 100.0 * (hi - x_clipped) / (hi - lo)
    else:
        raise ValueError(f"Unknown direction: {direction!r}")


def normalize_series(
    series: pd.Series,
    lo: float,
    hi: float,
    direction: str,
) -> pd.Series:
    """Vectorized version of normalize_value for a Pandas Series."""
    numeric_series = pd.to_numeric(series, errors="coerce")
    clipped = numeric_series.clip(lower=lo, upper=hi)
    if direction == "higher_is_better":
        return 100.0 * (clipped - lo) / (hi - lo)
    elif direction == "lower_is_better":
        return 100.0 * (hi - clipped) / (hi - lo)
    else:
        raise ValueError(f"Unknown direction: {direction!r}")


# ── Per-factor scoring ─────────────────────────────────────────────────────

def score_factor(
    df: pd.DataFrame,
    factor_name: str,
    factor_cfg: dict,
) -> pd.Series:
    """
    Compute 0–100 factor score for all rows.

    For the 'economy' factor, normalizes each indicator separately
    then averages them inside the factor (M5.1).
    """
    if "indicators" in factor_cfg:
        # Economy: average of normalized sub-indicators
        sub_scores = []
        for indicator in factor_cfg["indicators"]:
            col = indicator["column"]
            lo, hi = indicator["bounds"]
            direction = indicator["direction"]
            if col not in df.columns:
                logger.warning("Economy indicator column '%s' not found — skipping.", col)
                continue
            sub_scores.append(normalize_series(df[col], lo, hi, direction))
        if not sub_scores:
            return pd.Series(np.nan, index=df.index)
        return pd.concat(sub_scores, axis=1).mean(axis=1)

    col = factor_cfg["column"]
    lo, hi = factor_cfg["bounds"]
    direction = factor_cfg["direction"]

    if col not in df.columns:
        logger.warning("Factor column '%s' not found in DataFrame.", col)
        return pd.Series(np.nan, index=df.index)

    return normalize_series(df[col], lo, hi, direction)


# ── Main scoring function ──────────────────────────────────────────────────

def compute_scores(
    factors_wide: pd.DataFrame,
    config: dict,
    weights: dict[str, float],
    year: int | None = None,
) -> pd.DataFrame:
    """
    Compute livability scores for all places (M5.7 function contract).

    Parameters
    ----------
    factors_wide : pd.DataFrame
        One row per (place_id, year) with factor columns.
    config : dict
        Loaded from factors_config.yaml (via load_config()).
    weights : dict[str, float]
        Factor name → weight.  Will be normalized to sum to 1.0 internally.
        Only keys matching factors in config are used.
    year : int | None
        If None, uses the latest year available in the data.

    Returns
    -------
    pd.DataFrame with columns:
        place_id, year, score, rank,
        <factor>_score for each factor,
        partial_data (bool), missing_factors (list str),
        weights_used (dict)
    """
    df = factors_wide.copy()

    # Filter year
    if year is not None:
        df = df[df["year"] == year]
        if df.empty:
            raise ValueError(f"No data for year {year}.")
    else:
        year = int(df["year"].max())
        df = df[df["year"] == year]

    factors_cfg = config.get("factors", {})

    # Normalize weights
    valid_factors = [f for f in weights if f in factors_cfg]
    if not valid_factors:
        raise ValueError("No valid factors in weights dict.")

    raw_weights = {f: float(weights[f]) for f in valid_factors}
    total_w = sum(raw_weights.values())
    if total_w <= 0:
        raise ValueError("Weights must be positive and sum to > 0.")
    norm_weights = {f: w / total_w for f, w in raw_weights.items()}

    results = df[["place_id"]].copy() if "place_id" in df.columns else df.iloc[:, :1].copy()
    results["year"] = year

    # Compute per-factor scores
    factor_score_cols = []
    for factor, fcfg in factors_cfg.items():
        if factor not in norm_weights:
            continue
        col_name = f"{factor}_score"
        results[col_name] = score_factor(df, factor, fcfg).values
        factor_score_cols.append((factor, col_name))

    # Weighted sum — re-normalize weights where a factor is NaN for a place
    scores = []
    partial_data_flags = []
    missing_factors_list = []

    for idx, row in results.iterrows():
        available = [
            (f, col) for f, col in factor_score_cols
            if not pd.isna(row[col])
        ]
        missing = [f for f, col in factor_score_cols if pd.isna(row[col])]

        if not available:
            scores.append(np.nan)
            partial_data_flags.append(True)
            missing_factors_list.append(list(norm_weights.keys()))
            continue

        # Re-normalize weights for available factors
        avail_w_total = sum(norm_weights[f] for f, _ in available)
        local_score = sum(
            norm_weights[f] / avail_w_total * row[col]
            for f, col in available
        )
        scores.append(local_score)
        partial_data_flags.append(len(missing) > 0)
        missing_factors_list.append(missing)

    results["score"] = scores
    results["partial_data"] = partial_data_flags
    results["missing_factors"] = missing_factors_list
    results["weights_used"] = str(norm_weights)

    # Rank (higher score = better = lower rank number)
    results["rank"] = results["score"].rank(ascending=False, method="min").astype("Int64")

    return results.sort_values("rank").reset_index(drop=True)


# ── Sensitivity analysis ───────────────────────────────────────────────────

def sensitivity_analysis(
    factors_wide: pd.DataFrame,
    config: dict,
    year: int | None = None,
    n_draws: int = SENSITIVITY_N_DRAWS,
    seed: int = SENSITIVITY_SEED,
    factors: list[str] | None = None,
) -> pd.DataFrame:
    """
    Run N Dirichlet weight draws and record rank per place per draw (M5.6).

    Returns
    -------
    pd.DataFrame with columns:
        place_id, median_rank, min_rank, max_rank, rank_range, robust
    'robust' = True when rank_range <= 3 (place almost never changes its tier).
    """
    rng = np.random.default_rng(seed)
    factors_cfg = config.get("factors", {})
    if factors is None:
        factors = [f for f in CORE_FACTORS if f in factors_cfg]

    all_ranks: dict[str, list[int]] = {}

    for _ in range(n_draws):
        alpha = np.ones(len(factors))   # symmetric Dirichlet → uniform
        raw = rng.dirichlet(alpha)
        w = dict(zip(factors, raw.tolist()))
        try:
            res = compute_scores(factors_wide, config, w, year=year)
        except Exception:
            continue
        for _, row in res.iterrows():
            pid = row["place_id"]
            all_ranks.setdefault(pid, []).append(int(row["rank"]))

    rows = []
    for pid, ranks in all_ranks.items():
        arr = np.array(ranks)
        rows.append({
            "place_id": pid,
            "median_rank": float(np.median(arr)),
            "min_rank": int(arr.min()),
            "max_rank": int(arr.max()),
            "rank_range": int(arr.max() - arr.min()),
            "robust": bool(int(arr.max() - arr.min()) <= 3),
        })

    return pd.DataFrame(rows).sort_values("median_rank").reset_index(drop=True)
