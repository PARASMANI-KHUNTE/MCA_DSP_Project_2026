"""
src/models/trend.py
────────────────────
Linear trend projection per place × factor (M6.1).

Uses statsmodels OLS to get:
  - slope and p-value
  - 95% prediction interval
  - Outlook label: Improving / Declining / Stable or uncertain / Insufficient data

Rules from M6.1.1:
  - Only runs if the place-factor has >= MIN_TREND_POINTS valid yearly values.
  - Does NOT run for snapshot factors (trend='never').
  - Year treated as a continuous numeric variable (not a row index) so gaps are handled correctly.
  - 2020 covid_year is kept but separately compared (sensitivity check).
  - Projections clipped to [0, 100].
"""

import logging
from typing import NamedTuple

import numpy as np
import pandas as pd
import statsmodels.api as sm

from src.utils.constants import (
    MIN_TREND_POINTS,
    P_VALUE_THRESHOLD,
    PROJECTION_YEARS,
    PREDICTION_INTERVAL_ALPHA,
    COVID_YEAR,
    SCORE_MIN,
    SCORE_MAX,
)

logger = logging.getLogger(__name__)


class TrendResult(NamedTuple):
    place_id: str
    factor: str
    n_points: int
    slope: float
    intercept: float
    p_value: float
    r2: float
    outlook: str           # 'Improving' | 'Declining' | 'Stable or uncertain' | 'Insufficient data'
    projections: pd.DataFrame  # year, yhat, lower, upper (10 rows)
    series_break_flag: bool
    gap_flag: str


def _outlook_label(slope: float, p_value: float) -> str:
    """Classify the trend direction (M6.1)."""
    if p_value >= P_VALUE_THRESHOLD:
        return "Stable or uncertain"
    return "Improving" if slope > 0 else "Declining"


def fit_trend(
    years: np.ndarray,
    scores: np.ndarray,
    place_id: str,
    factor: str,
    series_break_flag: bool = False,
    gap_flag: str = "",
) -> TrendResult:
    """
    Fit OLS linear trend and generate 10-year projection.

    Parameters
    ----------
    years  : 1-D array of integer years (actual years, not indices).
    scores : 1-D array of factor scores (0–100), same length as years.
    """
    years = np.asarray(years, dtype=float)
    scores = np.asarray(scores, dtype=float)

    # Drop any NaN pairs
    mask = ~np.isnan(scores)
    years, scores = years[mask], scores[mask]

    if len(years) < MIN_TREND_POINTS:
        logger.info(
            "%s | %s: only %d valid points — labelling 'Insufficient data'.",
            place_id, factor, len(years)
        )
        return TrendResult(
            place_id=place_id, factor=factor,
            n_points=len(years),
            slope=np.nan, intercept=np.nan,
            p_value=np.nan, r2=np.nan,
            outlook="Insufficient data",
            projections=pd.DataFrame(),
            series_break_flag=series_break_flag,
            gap_flag=gap_flag,
        )

    X = sm.add_constant(years)
    model = sm.OLS(scores, X).fit()

    intercept = float(model.params[0])
    slope     = float(model.params[1])
    p_value   = float(model.pvalues[1])
    r2        = float(model.rsquared)
    outlook   = _outlook_label(slope, p_value)

    # Project 10 years beyond the last observed year
    last_year = int(years.max())
    proj_years = np.arange(last_year + 1, last_year + PROJECTION_YEARS + 1, dtype=float)
    X_proj = sm.add_constant(proj_years)

    # statsmodels get_prediction gives mean, lower, upper
    pred = model.get_prediction(X_proj)
    pred_df = pred.summary_frame(alpha=PREDICTION_INTERVAL_ALPHA)

    projections = pd.DataFrame({
        "year": proj_years.astype(int),
        "yhat":  pred_df["mean"].clip(SCORE_MIN, SCORE_MAX).values,
        "lower": pred_df["obs_ci_lower"].clip(SCORE_MIN, SCORE_MAX).values,
        "upper": pred_df["obs_ci_upper"].clip(SCORE_MIN, SCORE_MAX).values,
    })

    return TrendResult(
        place_id=place_id, factor=factor,
        n_points=len(years),
        slope=slope, intercept=intercept,
        p_value=p_value, r2=r2,
        outlook=outlook,
        projections=projections,
        series_break_flag=series_break_flag,
        gap_flag=gap_flag,
    )


def run_all_trends(
    scores_long: pd.DataFrame,
    config: dict,
    include_covid: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Fit trends for every eligible (place_id × factor) combination.

    Parameters
    ----------
    scores_long : DataFrame with columns [place_id, year, factor, score,
                  gap_flag, series_break]
    config      : loaded factors_config.yaml
    include_covid : if False, drop year 2020 before fitting (sensitivity check)

    Returns
    -------
    trends_df      : one row per (place_id, factor)
    projections_df : one row per (place_id, factor, projection_year)
    """
    factors_cfg = config.get("factors", {})

    # Ineligible factors
    ineligible = {
        f for f, fcfg in factors_cfg.items()
        if fcfg.get("trend") == "never"
    }

    df = scores_long.copy()
    if not include_covid:
        df = df[df["year"] != COVID_YEAR].copy()

    trend_rows = []
    proj_rows  = []

    for (place_id, factor), grp in df.groupby(["place_id", "factor"]):
        if factor in ineligible:
            continue

        fcfg = factors_cfg.get(factor, {})
        trend_setting = fcfg.get("trend", "eligible")

        series_break_flag = bool(grp["series_break"].any()) if "series_break" in grp.columns else False
        gap_flag = "|".join(grp["gap_flag"].dropna().unique()) if "gap_flag" in grp.columns else ""

        result = fit_trend(
            years=grp["year"].values,
            scores=grp["score"].values,
            place_id=place_id,
            factor=factor,
            series_break_flag=series_break_flag,
            gap_flag=gap_flag,
        )

        trend_rows.append({
            "place_id":          result.place_id,
            "factor":            result.factor,
            "n_points":          result.n_points,
            "slope":             result.slope,
            "p_value":           result.p_value,
            "r2":                result.r2,
            "outlook":           result.outlook,
            "series_break_flag": result.series_break_flag,
            "gap_flag":          result.gap_flag,
            "with_covid":        include_covid,
        })

        if not result.projections.empty:
            proj = result.projections.copy()
            proj["place_id"] = result.place_id
            proj["factor"]   = result.factor
            proj_rows.append(proj)

    trends_df = pd.DataFrame(trend_rows)
    projections_df = pd.concat(proj_rows, ignore_index=True) if proj_rows else pd.DataFrame()

    logger.info(
        "Trends fitted: %d place-factor pairs (covid_included=%s).",
        len(trends_df), include_covid
    )
    return trends_df, projections_df
