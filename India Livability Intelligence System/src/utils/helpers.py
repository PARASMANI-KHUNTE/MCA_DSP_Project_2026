"""
src/utils/helpers.py
────────────────────
Shared utility functions used across the pipeline.
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import NAME_ALIASES, AQI_CATEGORY_ORDER

logger = logging.getLogger(__name__)


# ── Logging setup ──────────────────────────────────────────────────────────

def setup_logging(level: int = logging.INFO) -> None:
    """Configure a consistent log format for the whole pipeline."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


# ── Name standardisation ───────────────────────────────────────────────────

def load_alias_map(path: Path = NAME_ALIASES) -> dict[str, str]:
    """
    Return a dict mapping raw_name → standard_name from name_aliases.csv.
    Keys are lower-cased and stripped for robust matching.
    """
    df = pd.read_csv(path, dtype=str)
    return {
        row["raw_name"].strip().lower(): row["standard_name"].strip()
        for _, row in df.iterrows()
    }


def standardize_name(name: str, alias_map: dict[str, str]) -> str:
    """
    Map a raw place name to its standard form.
    Falls back to the original (title-cased) if not in the alias map.
    Logs a warning so unmapped names are easy to catch.
    """
    if not isinstance(name, str):
        return name
    key = name.strip().lower()
    if key in alias_map:
        return alias_map[key]
    logger.warning("Unmapped name: '%s' — add it to name_aliases.csv", name)
    return name.strip().title()


def apply_name_standardization(
    df: pd.DataFrame,
    col: str,
    alias_map: dict[str, str],
) -> pd.DataFrame:
    """Standardize a place-name column in-place and return the DataFrame."""
    df = df.copy()
    df[col] = df[col].apply(lambda x: standardize_name(x, alias_map))
    return df


# ── Year alignment ─────────────────────────────────────────────────────────

def financial_year_to_ref(fy_str: str) -> int:
    """
    Convert a financial-year string to the reference (start) year integer.
    Examples:
        '2022-23' → 2022
        '2022-2023' → 2022
        '2022' → 2022
    """
    fy_str = str(fy_str).strip()
    if "-" in fy_str:
        return int(fy_str.split("-")[0])
    return int(fy_str)


def align_year(raw_year, period_type: str = "calendar") -> int:
    """
    Return the reference year integer for a given period.

    period_type options:
        'calendar'   → return as-is
        'financial'  → '2022-23' → 2022  (start year rule, per M3.6)
        'survey'     → same as financial (PLFS July–June)
    """
    if period_type == "calendar":
        return int(str(raw_year).strip()[:4])
    if period_type in ("financial", "survey"):
        return financial_year_to_ref(raw_year)
    raise ValueError(f"Unknown period_type: {period_type!r}")


# ── AQI encoding ───────────────────────────────────────────────────────────

def label_encode_aqi(series: pd.Series) -> pd.Series:
    """Label-encode AQI category strings to integers (Good=0 … Severe=5)."""
    return series.map(AQI_CATEGORY_ORDER)


# ── Missing value utilities ────────────────────────────────────────────────

def missing_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Return a DataFrame with columns [column, n_missing, pct_missing]
    for every column in df, sorted descending by pct_missing.
    """
    n = df.isnull().sum()
    pct = n / len(df)
    summary = pd.DataFrame({"n_missing": n, "pct_missing": pct})
    return summary[summary["n_missing"] > 0].sort_values("pct_missing", ascending=False)


def interpolate_within_place(
    df: pd.DataFrame,
    place_col: str,
    year_col: str,
    value_col: str,
    max_missing_pct: float = 0.20,
) -> pd.DataFrame:
    """
    For each place, interpolate missing values in value_col over time.
    - If the place has <= max_missing_pct missing, interpolate linearly.
    - If > max_missing_pct missing for a place, leave NaN (caller excludes it).
    Adds an is_imputed boolean column.
    """
    df = df.copy().sort_values([place_col, year_col])
    df["is_imputed"] = False

    def _fill(group: pd.DataFrame) -> pd.DataFrame:
        missing_pct = group[value_col].isna().mean()
        if missing_pct == 0:
            return group
        if missing_pct > max_missing_pct:
            return group  # leave as NaN — caller will exclude this place
        orig_na = group[value_col].isna()
        group[value_col] = group[value_col].interpolate(method="linear", limit_direction="both")
        # Fall back to median for leading/trailing NaNs not filled by interpolation
        if group[value_col].isna().any():
            median_val = group[value_col].median()
            group[value_col] = group[value_col].fillna(median_val)
        group.loc[orig_na, "is_imputed"] = True
        return group

    filled_groups = [_fill(g.copy()) for _, g in df.groupby(place_col)]
    return pd.concat(filled_groups, ignore_index=True) if filled_groups else df


# ── Outlier detection ──────────────────────────────────────────────────────

def iqr_bounds(series: pd.Series, k: float = 1.5) -> tuple[float, float]:
    """Return (lower, upper) IQR outlier bounds for a numeric series."""
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    return q1 - k * iqr, q3 + k * iqr


def flag_outliers(
    df: pd.DataFrame,
    col: str,
    domain_lo: float | None = None,
    domain_hi: float | None = None,
    k: float = 1.5,
) -> pd.DataFrame:
    """
    Add an 'outlier_flag' column and an 'outlier_reason' column.
    1. Domain bounds (physically impossible values) are flagged first.
    2. IQR rule (outside Q1 - k*IQR or Q3 + k*IQR) flags the rest.
    Does NOT remove rows — caller decides what to do.
    """
    df = df.copy()
    df["outlier_flag"] = False
    df["outlier_reason"] = ""

    # Domain bounds
    if domain_lo is not None:
        mask = df[col] < domain_lo
        df.loc[mask, "outlier_flag"] = True
        df.loc[mask, "outlier_reason"] = f"below_domain_min({domain_lo})"

    if domain_hi is not None:
        mask = df[col] > domain_hi
        df.loc[mask, "outlier_flag"] = True
        df.loc[mask, "outlier_reason"] += f"|above_domain_max({domain_hi})"

    # IQR rule on remaining non-domain-flagged values
    clean = df.loc[~df["outlier_flag"], col].dropna()
    lo, hi = iqr_bounds(clean, k=k)
    iqr_mask = (df[col] < lo) | (df[col] > hi)
    df.loc[iqr_mask & ~df["outlier_flag"], "outlier_flag"] = True
    df.loc[iqr_mask & ~df["outlier_flag"], "outlier_reason"] = "iqr_rule"

    return df


# ── Profiling helper ───────────────────────────────────────────────────────

def profile_dataframe(df: pd.DataFrame, name: str = "") -> None:
    """Print a concise profile of a DataFrame to the log."""
    logger.info("=== Profile: %s ===", name)
    logger.info("  Shape: %s", df.shape)
    logger.info("  dtypes:\n%s", df.dtypes.to_string())
    ms = missing_summary(df)
    if not ms.empty:
        logger.info("  Missing values:\n%s", ms.to_string())
    else:
        logger.info("  No missing values.")
    logger.info(
        "  Numeric summary:\n%s",
        df.describe(include="number").round(2).to_string(),
    )
