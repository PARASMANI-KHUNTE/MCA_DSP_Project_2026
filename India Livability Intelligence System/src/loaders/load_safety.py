"""
src/loaders/load_safety.py
───────────────────────────
Load NCRB "Crime in India" state-wise crime data.

Expected input (data/raw/safety/):
    - One or more CSV/XLSX files downloaded from data.gov.in or NCRB.
    - Files may be named by year, e.g. crime_2022.csv, or a combined file.

Key data decisions (M3.6):
    - Use crime rate per lakh population (not absolute counts).
    - IPC → BNS transition in 2024 may break the series; set series_break=True.
    - Missing metro-city years (e.g. 2021 NCRB metro) → treat as NaN, not zero.
    - Metro-city NCRB rates are NOT mixed with state rates (different populations).
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_SAFETY
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    align_year,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

# Year from which IPC→BNS transition creates a series break
_BNS_BREAK_YEAR = 2024

# Candidate column names across different NCRB file formats
_COL_CANDIDATES = {
    "state":       ["state_ut", "state/ut", "state", "states/uts", "area_name"],
    "year":        ["year", "sl_no", "report_year"],
    "crime_total": ["total_ipc_crimes", "total_cognizable_crimes", "total_crimes",
                    "ipc_crimes_total", "crime_total"],
    "population":  ["mid_year_projected_population", "population", "projected_population"],
    "crime_rate":  ["crime_rate", "rate_per_lakh", "crime_rate_per_lakh"],
}


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    norm = {c.strip().lower().replace(" ", "_"): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in norm:
            return norm[cand.lower()]
    return None


def _compute_crime_rate(df: pd.DataFrame) -> pd.DataFrame:
    """Compute crime_rate_per_lakh if not already present."""
    rate_col = _find_col(df, _COL_CANDIDATES["crime_rate"])
    if rate_col:
        df["crime_rate_per_lakh"] = pd.to_numeric(df[rate_col], errors="coerce")
        return df

    total_col = _find_col(df, _COL_CANDIDATES["crime_total"])
    pop_col   = _find_col(df, _COL_CANDIDATES["population"])

    if total_col and pop_col:
        total = pd.to_numeric(df[total_col], errors="coerce")
        pop   = pd.to_numeric(df[pop_col],   errors="coerce")
        df["crime_rate_per_lakh"] = (total / pop) * 100_000
        logger.info("Computed crime_rate_per_lakh from totals and population.")
    else:
        logger.warning(
            "Cannot compute crime_rate_per_lakh. "
            "Missing columns. Available: %s", list(df.columns)
        )
        df["crime_rate_per_lakh"] = float("nan")

    return df


def _load_single_file(path: Path, year: int | None = None) -> pd.DataFrame:
    """Load one NCRB file (CSV or XLSX) and return a standardized DataFrame."""
    logger.info("Loading: %s", path.name)

    if path.suffix.lower() in (".xls", ".xlsx"):
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_").replace("/", "_") for c in df.columns]

    state_col = _find_col(df, _COL_CANDIDATES["state"])
    year_col  = _find_col(df, _COL_CANDIDATES["year"])

    if state_col is None:
        logger.error("Cannot identify state column in %s. Columns: %s", path.name, list(df.columns))
        return pd.DataFrame()

    df = df.rename(columns={state_col: "state_name"})
    df["state_name"] = df["state_name"].astype(str).str.strip()

    # Year
    if year is not None:
        df["year"] = year
    elif year_col:
        df["year"] = df[year_col].apply(lambda x: align_year(x, "calendar"))
    else:
        logger.warning("No year column in %s — trying to infer from filename.", path.name)
        import re
        match = re.search(r"(20\d{2})", path.stem)
        df["year"] = int(match.group(1)) if match else None

    df = _compute_crime_rate(df)

    # Flag series break for BNS transition year
    df["series_break"] = df["year"].apply(
        lambda y: y is not None and int(y) >= _BNS_BREAK_YEAR
    )

    return df[["state_name", "year", "crime_rate_per_lakh", "series_break"]].copy()


def load_safety(raw_dir: Path = RAW_SAFETY) -> pd.DataFrame:
    """
    Load all NCRB safety files, merge, standardize, and return
    a clean state × year DataFrame.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, crime_rate_per_lakh,
        series_break, is_imputed (added by pipeline)
    """
    files = sorted(
        [f for f in raw_dir.iterdir() if f.suffix.lower() in (".csv", ".xls", ".xlsx")]
    )
    if not files:
        logger.error("No safety files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for f in files:
        df = _load_single_file(f)
        if not df.empty:
            frames.append(df)

    if not frames:
        logger.error("All safety files failed to load.")
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)

    # Standardize state names
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)

    # Remove aggregate rows (e.g., "Total", "All India")
    exclude = ["total", "all india", "india", "all states"]
    combined = combined[
        ~combined["state_name"].str.lower().isin(exclude)
    ].copy()

    # Deduplicate (keep last if same state-year appears in multiple files)
    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")

    # Domain bounds: crime rate per lakh cannot be negative
    combined = flag_outliers(
        combined, "crime_rate_per_lakh", domain_lo=0.0, domain_hi=5000.0
    )

    profile_dataframe(combined, "safety (state-wise)")
    logger.info(
        "Safety data: %d state-years, %d states, years %s to %s",
        len(combined),
        combined["state_name"].nunique(),
        combined["year"].min(),
        combined["year"].max(),
    )
    return combined
