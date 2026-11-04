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
    ENRICHED_AIR_FILENAME,
    ENRICHED_AIR_YEARS,
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


AIR_SOURCE_ENRICHED = "kaggle_2025"


def load_enriched_aqi(raw_dir: Path = RAW_AIR_KAGGLE) -> pd.DataFrame:
    """
    Load the enriched CPCB/Kaggle 2025-2026 station dataset.

    The file is long-format: one row per station × pollutant × timestamp.
    PM2.5 and PM10 values are extracted into their own columns so the normal
    city-year aggregation can treat them consistently.

    Returns
    -------
    pd.DataFrame with station/timestamp columns plus pm25, pm10, aqi,
    and outlier audit columns.
    """
    path = raw_dir / ENRICHED_AIR_FILENAME
    if not path.exists():
        logger.error("Enriched air file not found: %s", path)
        return pd.DataFrame()

    logger.info("Loading enriched air data: %s", path.name)
    df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]

    required = {"city", "station", "pollutant_id", "pollutant_avg", "Year"}
    missing = required - set(df.columns)
    if missing:
        logger.error("Enriched air file missing columns: %s", sorted(missing))
        return pd.DataFrame()

    df = df.rename(columns={
        "State": "state",
        "AQI": "aqi",
        "AQI_Bucket": "aqi_bucket",
        "Year": "year",
        "Month": "month",
        "Day": "day",
    })
    if "last_update" in df.columns:
        parsed_timestamp = pd.to_datetime(df["last_update"], errors="coerce")
    else:
        parsed_timestamp = pd.Series(pd.NaT, index=df.index)
    calendar_date = pd.to_datetime(
        df[["year", "month", "day"]], errors="coerce"
    )
    df["date"] = parsed_timestamp.dt.normalize().fillna(calendar_date)

    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")
    df = df[df["year"].isin(ENRICHED_AIR_YEARS)].copy()
    if df.empty:
        logger.warning(
            "No enriched air rows remain for years %s.", ENRICHED_AIR_YEARS
        )
        return df

    alias_map = load_alias_map()
    raw_cities = df["city"].astype(str).str.strip()
    unmatched = sorted({
        city for city in raw_cities.unique()
        if city.lower() not in alias_map
    })
    if unmatched:
        logger.info(
            "Enriched air: %d city names not in name_aliases.csv will be "
            "title-cased and dropped unless they match the city master: %s",
            len(unmatched), unmatched[:20],
        )
    df = apply_name_standardization(df, "city", alias_map, warn=False)

    pollutant = df["pollutant_id"].astype(str).str.strip().str.upper()
    pollutant = pollutant.replace({
        "PM25": "PM2.5",
        "PM2.5": "PM2.5",
        "PM10": "PM10",
        "O3": "OZONE",
    })
    df["pollutant_id"] = pollutant

    for col in ("pollutant_min", "pollutant_max", "pollutant_avg", "aqi"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["pm25"] = df["pollutant_avg"].where(df["pollutant_id"].eq("PM2.5"))
    df["pm10"] = df["pollutant_avg"].where(df["pollutant_id"].eq("PM10"))
    df = flag_outliers(df, "pm25", domain_lo=0.0, domain_hi=2000.0)

    profile_dataframe(df, "enriched_aqi (raw)")
    logger.info(
        "Enriched air: %d rows, years %s, pollutants %s",
        len(df),
        sorted(df["year"].dropna().unique().tolist()),
        sorted(df["pollutant_id"].dropna().unique().tolist()),
    )
    return df


def aggregate_enriched_to_city_year(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate enriched station rows to city × year.

    A city-year is kept when at least one valid PM2.5 observation exists.
    Sparse coverage (fewer than 7 PM2.5 observations or observation days) is
    retained but flagged with gap_flag='sparse_observations' rather than
    pretending it is a full annual mean.
    """
    columns = [
        "city", "year", "pm25_mean", "pm10_mean", "aqi_mean",
        "pm25_observations", "observation_days", "station_count",
        "is_valid_year", "gap_flag", "air_source", "series_break",
    ]
    if df.empty:
        return pd.DataFrame(columns=columns)

    work = df.copy()
    work["observation_date"] = pd.to_datetime(work["date"], errors="coerce").dt.date

    pm25 = work[work["pollutant_id"].eq("PM2.5") & work["pm25"].notna()]
    if pm25.empty:
        logger.warning("Enriched air data contains no valid PM2.5 observations.")
        return pd.DataFrame(columns=columns)

    pm25_annual = (
        pm25.groupby(["city", "year"], as_index=False)
        .agg(
            pm25_mean=("pm25", "mean"),
            aqi_mean=("aqi", "mean"),
            pm25_observations=("pm25", "count"),
            observation_days=("observation_date", "nunique"),
            station_count=("station", "nunique"),
        )
    )

    pm10 = work[work["pollutant_id"].eq("PM10") & work["pm10"].notna()]
    if not pm10.empty:
        pm10_annual = (
            pm10.groupby(["city", "year"], as_index=False)
            .agg(pm10_mean=("pm10", "mean"))
        )
        pm25_annual = pm25_annual.merge(pm10_annual, on=["city", "year"], how="left")
    else:
        pm25_annual["pm10_mean"] = pd.NA

    pm25_annual["is_valid_year"] = pm25_annual["pm25_mean"].notna()
    pm25_annual["gap_flag"] = pm25_annual.apply(
        lambda row: (
            "sparse_observations"
            if row["pm25_observations"] < 7 or row["observation_days"] < 7
            else ""
        ),
        axis=1,
    )
    pm25_annual["air_source"] = AIR_SOURCE_ENRICHED
    pm25_annual["series_break"] = False

    sparse = int(pm25_annual["gap_flag"].eq("sparse_observations").sum())
    logger.info(
        "Enriched air annual: %d city-years across %d cities (%d sparse flagged).",
        len(pm25_annual), pm25_annual["city"].nunique(), sparse,
    )
    return pm25_annual[columns]


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
