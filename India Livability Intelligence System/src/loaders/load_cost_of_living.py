"""
src/loaders/load_cost_of_living.py
────────────────────────────────────
Load the Kaggle House Rent Prediction Dataset (snapshot for 6 cities).

License: CC BY-SA 4.0 — attribution and share-alike apply.
Important: This is a SNAPSHOT (one time period), never trended.
Available only for: Kolkata, Mumbai, Bengaluru, Delhi, Chennai, Hyderabad.

Expected input: data/raw/cost_of_living/House_Rent_Dataset.csv
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_COL, FACTOR_COL
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

# The 6 cities available in the dataset (after name standardization)
COL_CITIES = ["Kolkata", "Mumbai", "Bengaluru", "Delhi", "Chennai", "Hyderabad"]

# Attribution required by CC BY-SA 4.0
ATTRIBUTION = (
    "House Rent Prediction Dataset by Sourav Banerjee, Kaggle. "
    "License: CC BY-SA 4.0. https://www.kaggle.com/datasets/iamsouravbanerjee/house-rent-prediction-dataset"
)


def load_cost_of_living(raw_dir: Path = RAW_COL) -> pd.DataFrame:
    """
    Load and aggregate Kaggle rent data to city-level average rent.

    Returns
    -------
    pd.DataFrame with columns:
        city, avg_rent, median_rent, n_listings, factor='cost_of_living',
        trend='never', snapshot=True
    Attribution is logged for compliance.
    """
    files = list(raw_dir.glob("*.csv"))
    if not files:
        logger.error("No cost-of-living CSV found in %s", raw_dir)
        return pd.DataFrame()

    path = files[0]  # expect one file
    logger.info("Loading cost-of-living: %s", path.name)
    logger.info("ATTRIBUTION: %s", ATTRIBUTION)

    df = pd.read_csv(path, dtype=str)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Identify city and rent columns
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

    # Standardize city names
    alias_map = load_alias_map()
    df = apply_name_standardization(df, "city", alias_map)

    # Keep only the 6 known cities
    df = df[df["city"].isin(COL_CITIES)].copy()
    if df.empty:
        logger.error(
            "No rows matched the 6 expected cities. Check city column: %s", city_col
        )
        return pd.DataFrame()

    # Outlier flagging before aggregating
    df = flag_outliers(df, "rent", domain_lo=1000.0, domain_hi=500_000.0)
    n_outliers = df["outlier_flag"].sum()
    if n_outliers:
        logger.info("Flagged %d rent outliers (not removed automatically).", n_outliers)

    # Aggregate to city level
    agg = df.groupby("city").agg(
        avg_rent=("rent", "mean"),
        median_rent=("rent", "median"),
        n_listings=("rent", "count"),
    ).reset_index()

    agg["factor"] = FACTOR_COL
    agg["trend"] = "never"          # snapshot — never projected
    agg["snapshot"] = True
    agg["source_id"] = "cost_of_living_kaggle"
    agg["attribution"] = ATTRIBUTION

    profile_dataframe(agg, "cost_of_living")
    logger.info(
        "Cost of living: %d cities loaded. Cities: %s",
        len(agg), list(agg["city"].values)
    )
    return agg
