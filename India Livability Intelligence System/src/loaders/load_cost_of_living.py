"""
src/loaders/load_cost_of_living.py
────────────────────────────────────
Load cost-of-living data.

Preferred input (2010-2024 longitudinal):
    data/raw/cost_of_living/archive/india_col_salary_longitudinal_2010_2024.csv

Legacy fallback (single snapshot):
    data/raw/cost_of_living/House_Rent_Dataset.csv

The longitudinal file is modelled/estimated city-year data. It is never
projected by this project. The legacy snapshot is retained only as a fallback
when the longitudinal file is absent.
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import (
    RAW_COL,
    FACTOR_COL,
    COL_LONGITUDINAL_FILENAME,
)
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

# The 6 cities available in the legacy Kaggle snapshot (after standardization)
COL_CITIES = ["Kolkata", "Mumbai", "Bengaluru", "Delhi", "Chennai", "Hyderabad"]

LEGACY_SOURCE_ID = "cost_of_living_kaggle"
LONGITUDINAL_SOURCE_ID = "cost_of_living_longitudinal"

ATTRIBUTION_LEGACY = (
    "House Rent Prediction Dataset by Sourav Banerjee, Kaggle. "
    "Exact dataset license and local file version have not been verified. "
    "https://www.kaggle.com/datasets/iamsouravbanerjee/house-rent-prediction-dataset"
)

ATTRIBUTION_LONGITUDINAL = (
    "India city cost-of-living and salary longitudinal dataset (2010-2024), "
    "compiled from Numbeo-style estimates and modelled PLFS salary series. "
    "Exact upstream version and reuse terms have not been verified."
)


def _find_longitudinal_file(raw_dir: Path) -> Path | None:
    """Return the preferred longitudinal CSV, searching sub-folders too."""
    if not raw_dir.exists():
        return None
    candidates = sorted(raw_dir.rglob("*.csv"))
    preferred = [
        path for path in candidates
        if COL_LONGITUDINAL_FILENAME in path.name.lower()
        or "longitudinal" in path.name.lower()
    ]
    if preferred:
        return preferred[0]
    for path in candidates:
        try:
            header = pd.read_csv(path, nrows=0)
        except Exception:
            continue
        columns = {str(column).strip().lower() for column in header.columns}
        if {"city", "year"}.issubset(columns) and any(
            "rent_1br" in column for column in columns
        ):
            return path
    return None


def _load_longitudinal(path: Path) -> pd.DataFrame:
    logger.info("Loading longitudinal cost-of-living: %s", path)
    logger.info("SOURCE NOTE: %s", ATTRIBUTION_LONGITUDINAL)

    df = pd.read_csv(path)
    df.columns = [
        str(column).strip().lower().replace(" ", "_") for column in df.columns
    ]

    city_col = next(
        (column for column in df.columns if "city" in column), None
    )
    year_col = next(
        (column for column in df.columns if "year" in column), None
    )
    center_col = next(
        (column for column in df.columns if "rent_1br_city_center" in column), None
    )
    outside_col = next(
        (column for column in df.columns if "rent_1br_outside_center" in column), None
    )

    if city_col is None or year_col is None or (center_col is None and outside_col is None):
        logger.error(
            "Cannot identify city/year/rent columns in %s. Found: %s",
            path.name, list(df.columns)
        )
        return pd.DataFrame()

    df["city"] = df[city_col].astype(str).str.strip()
    df["year"] = pd.to_numeric(df[year_col], errors="coerce")
    rent_columns = [column for column in (center_col, outside_col) if column]
    for column in rent_columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df["avg_rent"] = df[rent_columns].mean(axis=1, skipna=True)
    df["median_rent"] = df[rent_columns].median(axis=1, skipna=True)
    df["n_listings"] = df[rent_columns].notna().sum(axis=1)
    df = df[df["avg_rent"].notna() & df["year"].notna()].copy()
    df["year"] = df["year"].astype(int)

    alias_map = load_alias_map()
    unmatched = sorted({
        city for city in df["city"].unique()
        if city.lower() not in alias_map
    })
    if unmatched:
        logger.info(
            "Longitudinal COL: %d city names not in name_aliases.csv will be "
            "title-cased and dropped unless they match the city master: %s",
            len(unmatched), unmatched[:20],
        )
    df = apply_name_standardization(df, "city", alias_map, warn=False)

    df = flag_outliers(df, "avg_rent", domain_lo=1000.0, domain_hi=100_000.0)
    n_outliers = int(df["outlier_flag"].sum())
    if n_outliers:
        logger.info(
            "Flagged %d longitudinal rent outliers (domain violations removed).",
            n_outliers,
        )

    data_source = (
        df["data_source"].astype(str).str.strip().str.lower()
        if "data_source" in df.columns
        else pd.Series("", index=df.index)
    )
    df["gap_flag"] = data_source.map({
        "plfs_modeled": "modeled_estimate",
        "numbeo": "reference_estimate",
    }).fillna("reference_estimate")

    df["factor"] = FACTOR_COL
    df["trend"] = "never"
    df["snapshot"] = False
    df["source_id"] = LONGITUDINAL_SOURCE_ID
    df["attribution"] = ATTRIBUTION_LONGITUDINAL

    keep = [
        "city", "year", "avg_rent", "median_rent", "n_listings",
        "gap_flag", "factor", "trend", "snapshot", "source_id", "attribution",
    ]
    for optional in (
        "est_monthly_cost_single_inr", "cost_of_living_index",
        "data_source", "city_tier", "state", "population_approx",
    ):
        if optional in df.columns:
            keep.append(optional)

    df = df[keep].drop_duplicates(["city", "year"], keep="last")
    profile_dataframe(df, "cost_of_living (longitudinal)")
    logger.info(
        "Cost of living: %d city-years across %d cities, years %s-%s.",
        len(df), df["city"].nunique(), df["year"].min(), df["year"].max(),
    )
    return df


def _load_legacy_snapshot(raw_dir: Path) -> pd.DataFrame:
    path = raw_dir / "House_Rent_Dataset.csv"
    if not path.exists():
        logger.error("No cost-of-living CSV found in %s", raw_dir)
        return pd.DataFrame()

    logger.info("Loading legacy cost-of-living snapshot: %s", path.name)
    logger.info("SOURCE NOTE: %s", ATTRIBUTION_LEGACY)

    df = pd.read_csv(path, dtype=str)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    city_col = next(
        (c for c in df.columns if "city" in c or "location" in c), None
    )
    rent_col = next(
        (c for c in df.columns if "rent" in c or "price" in c or "amount" in c), None
    )
    if city_col is None or rent_col is None:
        logger.error(
            "Cannot identify city or rent column. Available: %s", list(df.columns)
        )
        return pd.DataFrame()

    df["city"] = df[city_col].astype(str).str.strip()
    df["rent"] = pd.to_numeric(df[rent_col], errors="coerce")

    alias_map = load_alias_map()
    df = apply_name_standardization(df, "city", alias_map, warn=False)
    df = df[df["city"].isin(COL_CITIES)].copy()
    if df.empty:
        logger.error(
            "No rows matched the 6 expected cities. Check city column: %s", city_col
        )
        return pd.DataFrame()

    df = flag_outliers(df, "rent", domain_lo=1000.0, domain_hi=500_000.0)
    n_outliers = int(df["outlier_flag"].sum())
    if n_outliers:
        logger.info("Flagged %d rent outliers (not removed automatically).", n_outliers)

    agg = df.groupby("city").agg(
        avg_rent=("rent", "mean"),
        median_rent=("rent", "median"),
        n_listings=("rent", "count"),
    ).reset_index()

    agg["year"] = None
    agg["factor"] = FACTOR_COL
    agg["trend"] = "never"
    agg["snapshot"] = True
    agg["source_id"] = LEGACY_SOURCE_ID
    agg["attribution"] = ATTRIBUTION_LEGACY
    agg["gap_flag"] = "snapshot"

    profile_dataframe(agg, "cost_of_living (legacy snapshot)")
    logger.info(
        "Cost of living: %d legacy snapshot cities loaded. Cities: %s",
        len(agg), list(agg["city"].values)
    )
    return agg


def load_cost_of_living(raw_dir: Path = RAW_COL) -> pd.DataFrame:
    """
    Load cost-of-living data, preferring the 2010-2024 longitudinal file.

    Returns
    -------
    pd.DataFrame with columns:
        city, year, avg_rent, median_rent, n_listings, gap_flag,
        factor='cost_of_living', trend='never', snapshot, source_id, attribution
    """
    longitudinal_path = _find_longitudinal_file(raw_dir)
    if longitudinal_path is not None:
        loaded = _load_longitudinal(longitudinal_path)
        if not loaded.empty:
            return loaded
        logger.warning(
            "Longitudinal cost-of-living file could not be parsed; trying legacy snapshot."
        )
    return _load_legacy_snapshot(raw_dir)
