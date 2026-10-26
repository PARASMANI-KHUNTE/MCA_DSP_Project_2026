"""
src/loaders/load_air_kaggle.py
──────────────────────────────
Load and lightly clean the Kaggle "Air Quality Data in India (2015-2020)"
dataset.  Produces a daily-level DataFrame, then aggregates to
city × year annual means.

Expected input files (place in data/raw/air_kaggle/):
    city_day.csv      – main daily readings per city
    station_day.csv   – station-level readings (optional, for cross-check)
    stations.csv      – station metadata with city mapping
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import (
    RAW_AIR_KAGGLE,
    MIN_DAY_COVERAGE_PCT,
    COVID_YEAR,
    AQI_CATEGORY_ORDER,
)
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    profile_dataframe,
)

logger = logging.getLogger(__name__)


# ── Public API ─────────────────────────────────────────────────────────────

def load_city_day(raw_dir: Path = RAW_AIR_KAGGLE) -> pd.DataFrame:
    """
    Load city_day.csv.

    Returns
    -------
    pd.DataFrame with columns:
        city, date (datetime), pm25, pm10, aqi, aqi_bucket
        (other pollutants kept but not used in scoring)
    """
    path = raw_dir / "city_day.csv"
    logger.info("Loading %s", path)

    df = pd.read_csv(path, parse_dates=["Date"])
    df = df.rename(columns={
        "City": "city",
        "Date": "date",
        "PM2.5": "pm25",
        "PM10": "pm10",
        "AQI": "aqi",
        "AQI_Bucket": "aqi_bucket",
    })

    # Standardize city names
    alias_map = load_alias_map()
    df = apply_name_standardization(df, "city", alias_map)

    # Coerce numerics
    for col in ["pm25", "pm10", "aqi"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Domain bounds: PM2.5 cannot be negative; cap extreme values for flagging
    df = flag_outliers(df, "pm25", domain_lo=0.0, domain_hi=2000.0)

    profile_dataframe(df, "city_day (raw)")
    return df


def aggregate_to_city_year(
    df: pd.DataFrame,
    min_coverage: float = MIN_DAY_COVERAGE_PCT,
) -> pd.DataFrame:
    """
    Aggregate daily city-day data to city × year annual means.

    Rules (M2.1.2, M3.3):
    - A city-year is VALID only if >= min_coverage of days have a non-null PM2.5.
    - Invalid city-years are DROPPED (not imputed), logged.
    - 2020 is kept but flagged gap_flag='covid_year'.
    - AQI bucket mode per city-year is included for label encoding.

    Returns
    -------
    pd.DataFrame with columns:
        city, year, pm25_mean, pm10_mean, aqi_mean,
        aqi_bucket_mode, day_count, valid_day_pct,
        is_valid_year, gap_flag, air_source
    """
    df = df.copy()
    df["year"] = df["date"].dt.year

    # Days in each calendar year (for coverage denominator)
    days_in_year = df.groupby(["city", "year"])["date"].count().rename("day_count")

    # Expected days per year (365 or 366); we compare against this
    def expected_days(year: int) -> int:
        import calendar
        return 366 if calendar.isleap(year) else 365

    grouped = df.groupby(["city", "year"])

    annual = grouped.agg(
        pm25_mean=("pm25", "mean"),
        pm10_mean=("pm10", "mean"),
        aqi_mean=("aqi", "mean"),
        pm25_valid_days=("pm25", "count"),       # non-null PM2.5 days
    ).reset_index()

    annual = annual.merge(days_in_year.reset_index(), on=["city", "year"])

    annual["expected_days"] = annual["year"].apply(expected_days)
    annual["valid_day_pct"] = annual["pm25_valid_days"] / annual["expected_days"]
    annual["is_valid_year"] = annual["valid_day_pct"] >= min_coverage

    # Mode of AQI bucket per city-year
    aqi_mode = (
        df.dropna(subset=["aqi_bucket"])
        .groupby(["city", "year"])["aqi_bucket"]
        .agg(lambda x: x.mode().iloc[0] if len(x) > 0 else None)
        .rename("aqi_bucket_mode")
        .reset_index()
    )
    annual = annual.merge(aqi_mode, on=["city", "year"], how="left")

    # Flags
    annual["gap_flag"] = annual["year"].apply(
        lambda y: "covid_year" if y == COVID_YEAR else ""
    )
    annual["air_source"] = "kaggle"

    # Log dropped city-years
    invalid = annual[~annual["is_valid_year"]]
    if not invalid.empty:
        logger.warning(
            "Dropping %d city-years with < %.0f%% PM2.5 coverage:\n%s",
            len(invalid),
            min_coverage * 100,
            invalid[["city", "year", "valid_day_pct"]].to_string(index=False),
        )

    annual = annual[annual["is_valid_year"]].copy()
    logger.info(
        "Annual air quality: %d valid city-years across %d cities, %d years",
        len(annual),
        annual["city"].nunique(),
        annual["year"].nunique(),
    )
    return annual


def run_coverage_check(raw_dir: Path = RAW_AIR_KAGGLE) -> pd.DataFrame:
    """
    Produce the coverage table needed by the M2.1.3 coverage check.

    Returns
    -------
    pd.DataFrame with columns:
        city, kaggle_valid_years (count within 2015-2019),
        all_valid_years (list), passes_kaggle_rule
    """
    df = load_city_day(raw_dir)
    annual = aggregate_to_city_year(df)

    # Filter to 2015-2019 window for the inclusion rule
    window = annual[annual["year"].between(2015, 2019)]
    coverage = (
        window.groupby("city")["year"]
        .apply(list)
        .rename("kaggle_years_valid")
        .reset_index()
    )
    coverage["kaggle_valid_year_count"] = coverage["kaggle_years_valid"].apply(len)

    from src.utils.constants import MIN_KAGGLE_VALID_YEARS
    coverage["passes_kaggle_rule"] = coverage["kaggle_valid_year_count"] >= MIN_KAGGLE_VALID_YEARS

    # Also add any years outside 2015-2019 (e.g. 2020)
    all_years = (
        annual.groupby("city")["year"].apply(list).rename("all_valid_years").reset_index()
    )
    coverage = coverage.merge(all_years, on="city", how="left")

    return coverage.sort_values("kaggle_valid_year_count", ascending=False)
