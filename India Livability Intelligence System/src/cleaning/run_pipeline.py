"""
src/cleaning/run_pipeline.py
─────────────────────────────
Master pipeline runner (M3).  Called by `make data`.

Stages:
  1. Load raw data from each source.
  2. Standardize names, types, calendar alignment.
  3. Handle missing values (interpolate / exclude).
  4. Detect and flag outliers.
  5. Aggregate to place × year.
  6. Merge all factors into one tidy long table + wide table.
  7. Validate the merged output.
  8. Export processed files.

Run directly:
    python -m src.cleaning.run_pipeline
"""

import json
import logging
import sys
from pathlib import Path

import pandas as pd

from src.utils.constants import (
    DATA_PROCESSED,
    PLACES_CSV,
    FACTORS_TIDY,
    FACTORS_WIDE,
    SOURCE_REGISTER,
    CORE_FACTORS,
    FACTOR_AIR,
    FACTOR_SAFETY,
    FACTOR_HEALTH,
    FACTOR_ECONOMY,
    FACTOR_COL,
    MAX_MISSING_PCT_TO_IMPUTE,
)
from src.utils.helpers import setup_logging, interpolate_within_place, missing_summary
from src.loaders.load_air_kaggle import load_city_day, aggregate_to_city_year
from src.loaders.load_air_cpcb import load_all_cpcb
from src.loaders.load_safety import load_safety
from src.loaders.load_health import load_health
from src.loaders.load_economy import load_economy
from src.loaders.load_cost_of_living import load_cost_of_living

logger = logging.getLogger(__name__)


# ── Stage 1: Load ──────────────────────────────────────────────────────────

def stage_load() -> dict[str, pd.DataFrame]:
    """Load all raw sources. Returns a dict keyed by factor name."""
    logger.info("=== STAGE 1: LOAD ===")
    raw: dict[str, pd.DataFrame] = {}

    # Air — Kaggle (daily → annual)
    try:
        city_day = load_city_day()
        raw[FACTOR_AIR + "_kaggle"] = aggregate_to_city_year(city_day)
    except Exception as e:
        logger.error("Failed to load Kaggle air data: %s", e)
        raw[FACTOR_AIR + "_kaggle"] = pd.DataFrame()

    # Air — CPCB (annual)
    try:
        raw[FACTOR_AIR + "_cpcb"] = load_all_cpcb()
    except Exception as e:
        logger.error("Failed to load CPCB air data: %s", e)
        raw[FACTOR_AIR + "_cpcb"] = pd.DataFrame()

    # Safety
    try:
        raw[FACTOR_SAFETY] = load_safety()
    except Exception as e:
        logger.error("Failed to load safety data: %s", e)
        raw[FACTOR_SAFETY] = pd.DataFrame()

    # Health
    try:
        raw[FACTOR_HEALTH] = load_health()
    except Exception as e:
        logger.error("Failed to load health data: %s", e)
        raw[FACTOR_HEALTH] = pd.DataFrame()

    # Economy
    try:
        raw[FACTOR_ECONOMY] = load_economy()
    except Exception as e:
        logger.error("Failed to load economy data: %s", e)
        raw[FACTOR_ECONOMY] = pd.DataFrame()

    # Cost of living (optional)
    try:
        raw[FACTOR_COL] = load_cost_of_living()
    except Exception as e:
        logger.warning("Failed to load cost-of-living data (optional): %s", e)
        raw[FACTOR_COL] = pd.DataFrame()

    for k, df in raw.items():
        logger.info("  Loaded %-25s → %s rows", k, len(df))

    return raw


# ── Stage 2: Combine air sources ───────────────────────────────────────────

def stage_combine_air(
    kaggle_df: pd.DataFrame,
    cpcb_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Merge Kaggle and CPCB air data.

    Rules (M3.6):
    - If an overlapping year exists between the two sources,
      compute mean offset and log it.
    - If no overlap, flag the join as series_break.
    - Rename pm25_mean / pm25_annual to a common column 'pm25_mean'.
    """
    logger.info("=== STAGE 2a: COMBINE AIR SOURCES ===")

    if kaggle_df.empty and cpcb_df.empty:
        logger.error("Both Kaggle and CPCB air data are empty.")
        return pd.DataFrame()

    if kaggle_df.empty:
        logger.warning("Kaggle air data missing — using CPCB only.")
        df = cpcb_df.rename(columns={"pm25_annual": "pm25_mean"})
        df["series_break"] = False
        return df

    if cpcb_df.empty:
        logger.warning("CPCB air data missing — using Kaggle only.")
        kaggle_df["series_break"] = False
        return kaggle_df

    # Rename CPCB column to match Kaggle
    cpcb = cpcb_df.rename(columns={"pm25_annual": "pm25_mean"}).copy()

    # Check for overlapping years per city
    kaggle_years = set(kaggle_df["year"].unique())
    cpcb_years   = set(cpcb["year"].unique())
    overlap      = kaggle_years & cpcb_years

    if overlap:
        logger.info("Overlapping years found: %s — computing method offset.", sorted(overlap))
        k_ov = kaggle_df[kaggle_df["year"].isin(overlap)][["city", "year", "pm25_mean"]]
        c_ov = cpcb[cpcb["year"].isin(overlap)][["city", "year", "pm25_mean"]]
        merged_ov = k_ov.merge(c_ov, on=["city", "year"], suffixes=("_kaggle", "_cpcb"))
        if not merged_ov.empty:
            offset = (merged_ov["pm25_mean_cpcb"] - merged_ov["pm25_mean_kaggle"]).mean()
            logger.info("  Mean CPCB − Kaggle PM2.5 offset: %.2f µg/m³", offset)
        series_break = False
    else:
        logger.warning(
            "No overlapping years between Kaggle (%s) and CPCB (%s). "
            "Flagging join as series_break.",
            sorted(kaggle_years), sorted(cpcb_years)
        )
        series_break = True

    # Combine: Kaggle rows + CPCB rows (no duplicates — different years)
    kaggle_cols = ["city", "year", "pm25_mean", "gap_flag", "air_source"]
    cpcb_cols   = ["city", "year", "pm25_mean", "gap_flag", "air_source"]

    for col in kaggle_cols:
        if col not in kaggle_df.columns:
            kaggle_df[col] = ""
    for col in cpcb_cols:
        if col not in cpcb.columns:
            cpcb[col] = ""

    combined = pd.concat(
        [kaggle_df[kaggle_cols], cpcb[cpcb_cols]], ignore_index=True
    )
    combined["series_break"] = series_break
    combined = combined.drop_duplicates(subset=["city", "year"], keep="last")

    logger.info(
        "Air combined: %d city-years, %d cities, years %s",
        len(combined), combined["city"].nunique(),
        sorted(combined["year"].unique()),
    )
    return combined


# ── Stage 3: Handle missing values ─────────────────────────────────────────

def stage_missing(
    df: pd.DataFrame,
    place_col: str,
    value_col: str,
    year_col: str = "year",
) -> pd.DataFrame:
    """
    Apply the missing-value policy (M3.3).
    Interpolates within place over time if < 20% missing; else leaves NaN.
    """
    logger.info("  Missing-value pass on '%s' (place='%s').", value_col, place_col)
    ms = missing_summary(df[[value_col]])
    if not ms.empty:
        logger.info("  Before imputation: %s", ms.to_string())

    df = interpolate_within_place(df, place_col, year_col, value_col, MAX_MISSING_PCT_TO_IMPUTE)

    ms_after = missing_summary(df[[value_col]])
    if not ms_after.empty:
        logger.info("  After imputation (still missing — will be excluded): %s", ms_after.to_string())
    return df


# ── Stage 4: Build tidy long table ─────────────────────────────────────────

def stage_build_tidy(
    places: pd.DataFrame,
    air: pd.DataFrame,
    safety: pd.DataFrame,
    health: pd.DataFrame,
    economy: pd.DataFrame,
    col: pd.DataFrame,
) -> pd.DataFrame:
    """
    Assemble the factors_tidy long table (M2.3 schema).

    Columns:
        place_id, year, factor, value_raw, value_norm (added later in M5),
        is_imputed, is_inherited, series_break, gap_flag, source_id
    """
    logger.info("=== STAGE 4: BUILD TIDY TABLE ===")

    rows = []

    # Helper to add rows for a factor
    def _add_rows(
        df: pd.DataFrame,
        factor: str,
        place_col: str,
        value_col: str,
        source_id: str,
        is_city_level: bool = False,
        place_type: str = "state",
        extra_cols: dict | None = None,
    ):
        if df.empty:
            logger.warning("  Skipping factor '%s' — no data.", factor)
            return

        # Merge with places to get place_id
        place_lookup = places[places["place_type"] == place_type][["place_name", "place_id"]]
        name_col = "city" if is_city_level else "state_name"
        merged = df.merge(
            place_lookup.rename(columns={"place_name": name_col}),
            on=name_col, how="inner"
        )

        if merged.empty:
            logger.warning(
                "  Factor '%s': no rows matched place master. "
                "Check name_aliases.csv.", factor
            )
            return

        for _, row in merged.iterrows():
            entry = {
                "place_id":     row["place_id"],
                "year":         int(row["year"]) if pd.notna(row.get("year")) else None,
                "factor":       factor,
                "value_raw":    row.get(value_col),
                "value_norm":   None,       # computed in M5
                "is_imputed":   bool(row.get("is_imputed", False)),
                "is_inherited": False,      # set below for city-level inherited values
                "series_break": bool(row.get("series_break", False)),
                "gap_flag":     str(row.get("gap_flag", "")),
                "source_id":    source_id,
            }
            if extra_cols:
                entry.update({k: row.get(v) for k, v in extra_cols.items()})
            rows.append(entry)

    # ── Air quality (city-level) ────────────────────────────────────────────
    _add_rows(air, FACTOR_AIR, "city", "pm25_mean", "air_kaggle|air_cpcb",
              is_city_level=True, place_type="city")

    # ── Safety (state-level) ───────────────────────────────────────────────
    _add_rows(safety, FACTOR_SAFETY, "state_name", "crime_rate_per_lakh",
              "safety_ncrb", place_type="state")

    # ── Health (state-level) ───────────────────────────────────────────────
    _add_rows(health, FACTOR_HEALTH, "state_name", "infant_mortality_rate",
              "health_srs", place_type="state")

    # ── Economy (state-level) ──────────────────────────────────────────────
    # Economy has two indicators; store each as a separate factor sub-column
    if not economy.empty:
        for _, row in economy.iterrows():
            state_match = places[
                (places["place_type"] == "state") &
                (places["place_name"] == row["state_name"])
            ]
            if state_match.empty:
                continue
            pid = state_match.iloc[0]["place_id"]
            base = {
                "place_id": pid,
                "year": int(row["year"]) if pd.notna(row.get("year")) else None,
                "is_imputed": bool(row.get("is_imputed", False)),
                "is_inherited": False,
                "series_break": False,
                "gap_flag": "",
                "source_id": "economy_rbi_nsdp|economy_plfs",
            }
            rows.append({**base, "factor": "per_capita_nsdp_constant",
                         "value_raw": row.get("per_capita_nsdp_constant"), "value_norm": None})
            rows.append({**base, "factor": "unemployment_rate",
                         "value_raw": row.get("unemployment_rate"), "value_norm": None})

    # ── Cost of living (city-level snapshot) ──────────────────────────────
    if not col.empty:
        for _, row in col.iterrows():
            city_match = places[
                (places["place_type"] == "city") &
                (places["place_name"] == row["city"])
            ]
            if city_match.empty:
                continue
            pid = city_match.iloc[0]["place_id"]
            rows.append({
                "place_id": pid, "year": None, "factor": FACTOR_COL,
                "value_raw": row.get("avg_rent"), "value_norm": None,
                "is_imputed": False, "is_inherited": False,
                "series_break": False, "gap_flag": "snapshot",
                "source_id": "cost_of_living_kaggle",
            })

    tidy = pd.DataFrame(rows)
    logger.info("Tidy table: %d rows, %d unique factors.", len(tidy), tidy["factor"].nunique())

    # Cities inherit safety/health/economy from their state. Replicate the
    # observed state rows at city level so city scores never fall back to
    # invented defaults or silently drop a whole pillar.
    city_master = places[places["place_type"] == "city"][["place_id", "state_name"]].rename(
        columns={"place_id": "city_place_id"}
    )
    state_ids = set(places[places["place_type"] == "state"]["place_id"].tolist())
    state_factors = {FACTOR_SAFETY, FACTOR_HEALTH,
                     "per_capita_nsdp_constant", "unemployment_rate"}
    state_rows = tidy[
        tidy["place_id"].isin(state_ids) & tidy["factor"].isin(state_factors)
    ].copy()

    if not state_rows.empty:
        state_names = places[places["place_type"] == "state"][["place_id", "state_name"]]
        state_rows = state_rows.merge(state_names, on="place_id", how="left")
        inherited = state_rows.merge(city_master, on="state_name", how="inner")
        if not inherited.empty:
            inherited["place_id"] = inherited["city_place_id"]
            inherited["source_id"] = inherited["source_id"].astype(str) + "|inherited"
            inherited["is_inherited"] = True
            inherited = inherited.drop(columns=["city_place_id"])
            tidy = pd.concat([tidy, inherited[tidy.columns]], ignore_index=True)
            logger.info(
                "Inherited %d state-level rows across %d cities.",
                len(inherited), inherited["place_id"].nunique(),
            )

    return tidy


# ── Stage 5: Pivot to wide ─────────────────────────────────────────────────

def stage_wide(tidy: pd.DataFrame) -> pd.DataFrame:
    """Pivot tidy long table to one row per (place_id, year)."""
    logger.info("=== STAGE 5: PIVOT TO WIDE ===")
    wide = tidy.pivot_table(
        index=["place_id", "year"],
        columns="factor",
        values="value_raw",
        aggfunc="mean",
    ).reset_index()
    wide.columns.name = None
    logger.info("Wide table: %d rows × %d columns.", *wide.shape)
    return wide


# ── Stage 6: Validate ──────────────────────────────────────────────────────

def stage_validate(tidy: pd.DataFrame, places: pd.DataFrame) -> list[str]:
    """Run assertions on the merged output. Returns list of issues found."""
    logger.info("=== STAGE 6: VALIDATE ===")
    issues = []

    # 1. No duplicate (place_id, year, factor) triplets
    dupes = tidy.duplicated(subset=["place_id", "year", "factor"])
    if dupes.any():
        n = int(dupes.sum())
        issues.append(f"DUPLICATE ROWS: {n} duplicate (place_id, year, factor) triplets.")
        logger.error(issues[-1])

    # 2. Every place_id in tidy exists in places
    valid_ids = set(places["place_id"].tolist())
    unknown = set(tidy["place_id"].unique()) - valid_ids
    if unknown:
        issues.append(f"UNKNOWN PLACE IDs: {unknown}")
        logger.error(issues[-1])

    # 3. No negative air quality values
    air_rows = tidy[tidy["factor"] == FACTOR_AIR]
    neg_air = air_rows["value_raw"].lt(0).sum()
    if neg_air:
        issues.append(f"NEGATIVE PM2.5 VALUES: {neg_air} rows.")
        logger.error(issues[-1])

    # 4. Series breaks are flagged
    logger.info(
        "Series-break rows: %d",
        int(tidy["series_break"].sum()) if "series_break" in tidy.columns else 0
    )

    if not issues:
        logger.info("✅ Validation passed — no issues found.")
    else:
        logger.warning("⚠️  Validation found %d issue(s).", len(issues))

    return issues


# ── Stage 7: Export ────────────────────────────────────────────────────────

def stage_export(tidy: pd.DataFrame, wide: pd.DataFrame, issues: list[str]) -> None:
    """Write processed files with version tag."""
    logger.info("=== STAGE 7: EXPORT ===")
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)

    tidy.to_parquet(FACTORS_TIDY, index=False)
    logger.info("Saved: %s", FACTORS_TIDY)

    wide.to_csv(FACTORS_WIDE, index=False)
    logger.info("Saved: %s", FACTORS_WIDE)

    # Write data quality report stub
    report_path = Path("reports") / "data_quality_report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Data Quality Report\n\n")
        f.write(f"**Rows in tidy table:** {len(tidy)}\n\n")
        f.write(f"**Factors present:** {sorted(tidy['factor'].unique())}\n\n")
        f.write(f"**Places covered:** {tidy['place_id'].nunique()}\n\n")
        imputed = int(tidy.get("is_imputed", pd.Series([False])).sum())
        f.write(f"**Imputed values:** {imputed}\n\n")
        if issues:
            f.write("## Validation Issues\n\n")
            for issue in issues:
                f.write(f"- {issue}\n")
        else:
            f.write("## Validation: PASSED ✅\n")
    logger.info("Saved: %s", report_path)


# ── Entrypoint ─────────────────────────────────────────────────────────────

def run(places_path: Path = PLACES_CSV) -> None:
    """Run the full pipeline end to end."""
    setup_logging()
    logger.info("=== INDIA LIVABILITY PIPELINE START ===")

    # Load place master
    if not places_path.exists():
        logger.error(
            "Place master not found at %s. "
            "Build it from the coverage check notebook first.", places_path
        )
        sys.exit(1)
    places = pd.read_csv(places_path, dtype=str)
    logger.info("Place master: %d places loaded.", len(places))

    # Stage 1: Load
    raw = stage_load()

    # Stage 2: Combine air
    air = stage_combine_air(
        raw.get(FACTOR_AIR + "_kaggle", pd.DataFrame()),
        raw.get(FACTOR_AIR + "_cpcb", pd.DataFrame()),
    )

    # Stage 3: Missing values (per factor)
    if not air.empty and "pm25_mean" in air.columns:
        air = stage_missing(air, "city", "pm25_mean")

    safety  = raw.get(FACTOR_SAFETY, pd.DataFrame())
    health  = raw.get(FACTOR_HEALTH, pd.DataFrame())
    economy = raw.get(FACTOR_ECONOMY, pd.DataFrame())
    col     = raw.get(FACTOR_COL, pd.DataFrame())

    if not safety.empty and "crime_rate_per_lakh" in safety.columns:
        safety = stage_missing(safety, "state_name", "crime_rate_per_lakh")
    if not health.empty and "infant_mortality_rate" in health.columns:
        health = stage_missing(health, "state_name", "infant_mortality_rate")
    if not economy.empty and "per_capita_nsdp_constant" in economy.columns:
        economy = stage_missing(economy, "state_name", "per_capita_nsdp_constant")
    if not economy.empty and "unemployment_rate" in economy.columns:
        economy = stage_missing(economy, "state_name", "unemployment_rate")

    # Stage 4: Build tidy
    tidy = stage_build_tidy(places, air, safety, health, economy, col)

    # Stage 5: Pivot wide
    wide = stage_wide(tidy)

    # Stage 6: Validate
    issues = stage_validate(tidy, places)

    # Stage 7: Export
    stage_export(tidy, wide, issues)

    logger.info("=== PIPELINE COMPLETE ===")


if __name__ == "__main__":
    run()
