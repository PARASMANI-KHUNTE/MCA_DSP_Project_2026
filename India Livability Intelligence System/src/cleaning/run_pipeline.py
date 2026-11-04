"""
src/cleaning/run_pipeline.py
─────────────────────────────
Master pipeline runner (M3).  Called by `make data`.

Stages:
  1. Load raw data from each source.
  2. Standardize names, types, calendar alignment.
  3. Preserve missing source values; do not interpolate or invent observations.
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
import hashlib
from datetime import datetime, timezone
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
    FACTOR_WATER,
)
from src.utils.helpers import setup_logging, missing_summary
from src.loaders.load_air_kaggle import (
    load_city_day,
    aggregate_to_city_year,
    load_enriched_aqi,
    aggregate_enriched_to_city_year,
)
from src.loaders.load_air_cpcb import load_all_cpcb
from src.loaders.load_safety import load_safety
from src.loaders.load_health_nfhs import load_nfhs_health
from src.loaders.load_economy import load_economy, load_national_economy
from src.loaders.load_cost_of_living import load_cost_of_living
from src.loaders.load_water_quality import load_water_quality

logger = logging.getLogger(__name__)


# ── Stage 1: Load ──────────────────────────────────────────────────────────

def stage_load() -> dict[str, pd.DataFrame]:
    """Load all raw sources. Returns a dict keyed by factor name."""
    logger.info("=== STAGE 1: LOAD ===")
    raw: dict[str, pd.DataFrame] = {}

    # Air — Kaggle (daily → annual)
    try:
        city_day = load_city_day()
        raw["air_kaggle_daily_audit"] = city_day
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

    # Air — enriched 2025-2026 station data (annual aggregation)
    try:
        enriched = load_enriched_aqi()
        raw["air_kaggle_2025_daily_audit"] = enriched
        raw[FACTOR_AIR + "_enriched"] = aggregate_enriched_to_city_year(enriched)
    except Exception as e:
        logger.error("Failed to load enriched air data: %s", e)
        raw[FACTOR_AIR + "_enriched"] = pd.DataFrame()

    # Safety
    try:
        raw[FACTOR_SAFETY] = load_safety()
    except Exception as e:
        logger.error("Failed to load safety data: %s", e)
        raw[FACTOR_SAFETY] = pd.DataFrame()

    # Health — NFHS-5 district factsheet aggregated to states
    try:
        raw[FACTOR_HEALTH] = load_nfhs_health()
    except Exception as e:
        logger.error("Failed to load NFHS-5 health data: %s", e)
        raw[FACTOR_HEALTH] = pd.DataFrame()

    # Economy
    try:
        raw[FACTOR_ECONOMY] = load_economy()
    except Exception as e:
        logger.error("Failed to load economy data: %s", e)
        raw[FACTOR_ECONOMY] = pd.DataFrame()

    # National macro context (not assigned to states/cities)
    try:
        raw["national_economy"] = load_national_economy()
    except Exception as e:
        logger.warning("Failed to load national economy context: %s", e)
        raw["national_economy"] = pd.DataFrame()

    # Cost of living (optional)
    try:
        raw[FACTOR_COL] = load_cost_of_living()
    except Exception as e:
        logger.warning("Failed to load cost-of-living data (optional): %s", e)
        raw[FACTOR_COL] = pd.DataFrame()

    # Water quality (optional)
    try:
        raw[FACTOR_WATER] = load_water_quality()
    except Exception as e:
        logger.warning("Failed to load water quality data (optional): %s", e)
        raw[FACTOR_WATER] = pd.DataFrame()

    for k, df in raw.items():
        logger.info("  Loaded %-25s → %s rows", k, len(df))

    return raw


# ── Stage 2: Combine air sources ───────────────────────────────────────────

def stage_combine_air(
    kaggle_df: pd.DataFrame,
    cpcb_df: pd.DataFrame,
    recent_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Merge historical Kaggle, CPCB, and enriched 2025-2026 air data.

    Rules (M3.6):
    - Each source is a separate measurement method; no offset is inferred or
      applied from an overlap.
    - On a city-year overlap, the more recent source wins.
    - Mark the first row of a new source for a city as a series break when that
      city also has an earlier source.
    - Rename pm25_mean / pm25_annual to a common column 'pm25_mean'.
    """
    logger.info("=== STAGE 2a: COMBINE AIR SOURCES ===")

    def _prepare(
        source: pd.DataFrame | None,
        source_order: int,
        default_source: str,
    ) -> pd.DataFrame | None:
        if source is None or source.empty:
            return None
        prepared = source.rename(columns={"pm25_annual": "pm25_mean"}).copy()
        if "pm25_mean" not in prepared.columns:
            logger.warning("Air source '%s' has no pm25_mean column.", default_source)
            return None
        if "gap_flag" not in prepared.columns:
            prepared["gap_flag"] = ""
        else:
            prepared["gap_flag"] = prepared["gap_flag"].fillna("")
        if "air_source" not in prepared.columns:
            prepared["air_source"] = default_source
        else:
            prepared["air_source"] = (
                prepared["air_source"].fillna(default_source).replace("", default_source)
            )
        prepared["series_break"] = False
        prepared["_source_order"] = source_order
        return prepared[[
            "city", "year", "pm25_mean", "gap_flag",
            "air_source", "series_break", "_source_order",
        ]]

    frames = [
        frame for frame in (
            _prepare(kaggle_df, 0, "kaggle"),
            _prepare(cpcb_df, 1, "cpcb"),
            _prepare(recent_df, 2, "kaggle_2025"),
        )
        if frame is not None
    ]
    if not frames:
        logger.error("All Kaggle, CPCB, and enriched air sources are empty.")
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    overlap_counts = combined.groupby(["city", "year"]).size()
    overlaps = overlap_counts[overlap_counts > 1]
    if not overlaps.empty:
        logger.warning(
            "%d city-year overlaps resolved by source precedence "
            "(enriched > CPCB > Kaggle); no cross-source adjustment is applied.",
            len(overlaps),
        )

    combined = (
        combined.sort_values(["city", "year", "_source_order"])
        .drop_duplicates(subset=["city", "year"], keep="last")
        .sort_values(["city", "year"])
        .reset_index(drop=True)
    )

    previous_source = combined.groupby("city")["air_source"].shift()
    transitions = previous_source.notna() & (previous_source != combined["air_source"])
    combined["series_break"] = transitions
    combined.loc[transitions, "gap_flag"] = combined.loc[transitions, "gap_flag"].map(
        lambda value: "|".join(filter(None, [str(value), "air_source_method_change"]))
    )

    logger.info(
        "Air combined: %d city-years, %d cities, years %s",
        len(combined), combined["city"].nunique(),
        sorted(combined["year"].unique()),
    )
    return combined[[
        "city", "year", "pm25_mean", "gap_flag", "air_source", "series_break",
    ]]


# ── Stage 3: Handle missing values ─────────────────────────────────────────

def stage_missing(
    df: pd.DataFrame,
    place_col: str,
    value_col: str,
    year_col: str = "year",
) -> pd.DataFrame:
    """
    Preserve missing source observations; do not interpolate or invent values.
    """
    logger.info("  Missing-value pass on '%s' (place='%s').", value_col, place_col)
    ms = missing_summary(df[[value_col]])
    if not ms.empty:
        logger.info("  Missing source values retained as missing: %s", ms.to_string())
    df = df.copy()
    df["is_imputed"] = False
    return df


# ── Stage 4: Build tidy long table ─────────────────────────────────────────

def stage_build_tidy(
    places: pd.DataFrame,
    air: pd.DataFrame,
    safety: pd.DataFrame,
    health: pd.DataFrame,
    economy: pd.DataFrame,
    col: pd.DataFrame,
    water: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Assemble the factors_tidy long table (M2.3 schema).

    Columns:
        place_id, year, factor, value_raw, value_norm (added later in M5),
        is_imputed, is_inherited, series_break, gap_flag, source_id
    """
    logger.info("=== STAGE 4: BUILD TIDY TABLE ===")

    water = water if water is not None else pd.DataFrame()
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
                "source_id":    (
                    str(row.get("source_id"))
                    if pd.notna(row.get("source_id"))
                    else source_id
                ),
            }
            if factor == FACTOR_AIR and row.get("air_source"):
                active_sources = sorted({
                    source.strip().lower()
                    for source in str(row["air_source"]).split("|")
                    if source.strip()
                })
                if active_sources:
                    entry["source_id"] = "|".join(
                        [*(f"air_{source}" for source in active_sources),
                         *( ["state_city_mean"] if "state_city_mean" in source_id else [] )]
                    )
            if extra_cols:
                entry.update({k: row.get(v) for k, v in extra_cols.items()})
            rows.append(entry)

    # ── Air quality (city-level) ────────────────────────────────────────────
    _add_rows(air, FACTOR_AIR, "city", "pm25_mean", "air_kaggle|air_cpcb",
              is_city_level=True, place_type="city")

    # State polygons need a state-level composite score. Build a transparent
    # state-year PM2.5 mean from the cities with observations in that state;
    # retain it as a derived aggregate instead of copying a single city value.
    state_air = pd.DataFrame()
    if not air.empty:
        city_states = places.loc[
            places["place_type"] == "city", ["place_name", "state_name"]
        ].drop_duplicates()
        city_air = air.merge(
            city_states, left_on="city", right_on="place_name", how="inner"
        )
        if not city_air.empty:
            aggregations = {"pm25_mean": ("pm25_mean", "mean")}
            if "air_source" in city_air.columns:
                aggregations["air_source"] = (
                    "air_source",
                    lambda values: "|".join(sorted({
                        part.strip().lower()
                        for value in values.dropna().astype(str)
                        for part in value.split("|")
                        if part.strip()
                    })),
                )
            for column in ("is_imputed", "series_break"):
                if column in city_air.columns:
                    aggregations[column] = (column, "max")
            if "gap_flag" in city_air.columns:
                aggregations["gap_flag"] = (
                    "gap_flag",
                    lambda values: "|".join(sorted({
                        part.strip()
                        for value in values.dropna().astype(str)
                        for part in value.split("|")
                        if part.strip()
                    })),
                )
            state_air = city_air.groupby(
                ["state_name", "year"], as_index=False
            ).agg(**aggregations)
            logger.info(
                "State air quality: averaged city observations into %d state-years across %d states.",
                len(state_air), state_air["state_name"].nunique(),
            )
    _add_rows(
        state_air, FACTOR_AIR, "state_name", "pm25_mean",
        "air_kaggle|air_cpcb|state_city_mean", place_type="state"
    )

    # ── Safety (state-level) ───────────────────────────────────────────────
    _add_rows(safety, FACTOR_SAFETY, "state_name", "crime_rate_per_lakh",
              "safety_ncrb", place_type="state")

    # ── Health (state-level NFHS-5 composite) ──────────────────────────────
    _add_rows(health, FACTOR_HEALTH, "state_name", "health",
              "health_nfhs5", place_type="state")

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

    # ── Cost of living (city-level, longitudinal or legacy snapshot) ───────
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
                "place_id": pid,
                "year": int(row["year"]) if pd.notna(row.get("year")) else None,
                "factor": FACTOR_COL,
                "value_raw": row.get("avg_rent"), "value_norm": None,
                "is_imputed": False, "is_inherited": False,
                "series_break": bool(row.get("series_break", False)),
                "gap_flag": str(row.get("gap_flag") or ""),
                "source_id": str(row.get("source_id") or "cost_of_living_longitudinal"),
            })

    # ── Water quality (state-level optional factor) ────────────────────────
    _add_rows(water, FACTOR_WATER, "state_name", "water_quality",
              "water_quality_cpcb", place_type="state")

    tidy = pd.DataFrame(rows)
    logger.info("Tidy table: %d rows, %d unique factors.", len(tidy), tidy["factor"].nunique())

    # Cities inherit safety/health/economy from their state. Replicate the
    # observed state rows at city level so city scores never fall back to
    # invented defaults or silently drop a whole pillar.
    city_master = places[places["place_type"] == "city"][["place_id", "state_name"]].rename(
        columns={"place_id": "city_place_id"}
    )
    state_ids = set(places[places["place_type"] == "state"]["place_id"].tolist())
    state_factors = {FACTOR_SAFETY, FACTOR_HEALTH, FACTOR_WATER,
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
    """Pivot tidy data and preserve per-factor break metadata in the wide table."""
    logger.info("=== STAGE 5: PIVOT TO WIDE ===")
    wide = tidy.pivot_table(
        index=["place_id", "year"],
        columns="factor",
        values="value_raw",
        aggfunc="mean",
    ).reset_index()
    wide.columns.name = None

    for factor, group in tidy.groupby("factor"):
        metadata = group[["place_id", "year"]].copy()
        if "series_break" in group:
            metadata[f"{factor}_series_break"] = group["series_break"].fillna(False).astype(bool).values
        if "gap_flag" in group:
            metadata[f"{factor}_gap_flag"] = group["gap_flag"].fillna("").astype(str).values
        metadata = metadata.drop_duplicates(["place_id", "year"])
        wide = wide.merge(metadata, on=["place_id", "year"], how="left", validate="one_to_one")

    for column in [col for col in wide if col.endswith("_series_break")]:
        wide[column] = wide[column].fillna(False).astype(bool)
    for column in [col for col in wide if col.endswith("_gap_flag")]:
        wide[column] = wide[column].fillna("")
    logger.info("Wide table: %d rows × %d columns.", *wide.shape)
    return wide


# ── Stage 6: Validate ──────────────────────────────────────────────────────

def stage_validate(tidy: pd.DataFrame, places: pd.DataFrame) -> list[str]:
    """Run assertions on the merged output. Returns list of issues found."""
    logger.info("=== STAGE 6: VALIDATE ===")
    issues = []

    if tidy.empty:
        issues.append("EMPTY OUTPUT: no factor observations were assembled.")
        logger.error(issues[-1])

    present_factors = set(tidy.get("factor", pd.Series(dtype=str)).dropna().unique())
    # Economy is represented by two source indicators in the tidy table;
    # the composite economy score is created later by the scoring stage.
    required_factors = {
        FACTOR_AIR,
        FACTOR_SAFETY,
        FACTOR_HEALTH,
        "per_capita_nsdp_constant",
        "unemployment_rate",
    }
    missing_core = required_factors - present_factors
    if missing_core:
        logger.warning(
            "Core indicators unavailable: %s. Composite scores using the configured core weights will remain unavailable.",
            sorted(missing_core),
        )

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

def stage_export(
    tidy: pd.DataFrame,
    wide: pd.DataFrame,
    issues: list[str],
    raw_sources: dict[str, pd.DataFrame] | None = None,
) -> None:
    """Write processed files with version tag."""
    logger.info("=== STAGE 7: EXPORT ===")
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)

    tidy.to_parquet(FACTORS_TIDY, index=False)
    logger.info("Saved: %s", FACTORS_TIDY)

    wide.to_csv(FACTORS_WIDE, index=False)
    logger.info("Saved: %s", FACTORS_WIDE)

    national_economy = (raw_sources or {}).get("national_economy")
    if national_economy is not None and not national_economy.empty:
        national_path = DATA_PROCESSED / "national_economy.csv"
        national_economy.to_csv(national_path, index=False)
        logger.info("Saved: %s", national_path)

    version_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    version_dir = DATA_PROCESSED / "versions" / version_id
    version_dir.mkdir(parents=True, exist_ok=False)
    version_tidy = version_dir / FACTORS_TIDY.name
    version_wide = version_dir / FACTORS_WIDE.name
    tidy.to_parquet(version_tidy, index=False)
    wide.to_csv(version_wide, index=False)
    version_manifest = {
        "version": version_id,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "rows": {"factors_tidy": len(tidy), "factors_wide": len(wide)},
        "files": {
            version_tidy.name: hashlib.sha256(version_tidy.read_bytes()).hexdigest(),
            version_wide.name: hashlib.sha256(version_wide.read_bytes()).hexdigest(),
        },
    }
    (version_dir / "manifest.json").write_text(
        json.dumps(version_manifest, indent=2), encoding="utf-8"
    )
    logger.info("Saved versioned analytical snapshot: %s", version_dir)

    # Persist all detected source outliers with enough context to review them.
    outlier_rows = []
    for source_id, source_df in (raw_sources or {}).items():
        if source_df.empty or "outlier_flag" not in source_df.columns:
            continue
        flagged = source_df[source_df["outlier_flag"].fillna(False).astype(bool)]
        for row_index, row in flagged.iterrows():
            context = {
                key: row.get(key)
                for key in ("place_id", "place_name", "state_name", "city", "year", "date")
                if key in source_df.columns
            }
            value_column = next(
                (key for key in ("pm25", "pm25_mean", "crime_rate_per_lakh",
                                 "health", "infant_mortality_rate",
                                 "per_capita_nsdp_constant", "unemployment_rate",
                                 "avg_rent", "rent", "water_quality")
                 if key in source_df.columns),
                None,
            )
            outlier_rows.append({
                "source_id": source_id,
                "source_row": str(row_index),
                **context,
                "value_column": value_column or "",
                "original_value": row.get("outlier_original_value"),
                "reason": row.get("outlier_reason", ""),
                "action": row.get("outlier_action", ""),
            })
    outlier_log = pd.DataFrame(outlier_rows, columns=[
        "source_id", "source_row", "place_id", "place_name", "state_name", "city",
        "year", "date", "value_column", "original_value", "reason", "action",
    ])
    outlier_path = Path("reports") / "outlier_log.csv"
    outlier_path.parent.mkdir(parents=True, exist_ok=True)
    outlier_log.to_csv(outlier_path, index=False)
    logger.info("Saved: %s (%d flagged rows)", outlier_path, len(outlier_log))

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
        present_factors = set(tidy.get("factor", pd.Series(dtype=str)).dropna().unique())
        required_factors = {
            FACTOR_AIR, FACTOR_SAFETY, FACTOR_HEALTH,
            "per_capita_nsdp_constant", "unemployment_rate",
        }
        missing_core = sorted(required_factors - present_factors)
        if missing_core:
            f.write("## Composite score availability\n\n")
            f.write("A complete composite cannot be calculated from the active inputs. Missing core indicators: ")
            f.write(", ".join(missing_core) + ".\n\n")
        if issues:
            f.write("## Validation Issues\n\n")
            for issue in issues:
                f.write(f"- {issue}\n")
        else:
            f.write("## Structural validation: PASSED\n\n")
            f.write("This confirms output structure only. Core indicator coverage is incomplete; see composite score availability above.\n")
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
        raw.get(FACTOR_AIR + "_enriched", pd.DataFrame()),
    )

    # Stage 3: Missing values (per factor)
    if not air.empty and "pm25_mean" in air.columns:
        air = stage_missing(air, "city", "pm25_mean")

    safety  = raw.get(FACTOR_SAFETY, pd.DataFrame())
    health  = raw.get(FACTOR_HEALTH, pd.DataFrame())
    economy = raw.get(FACTOR_ECONOMY, pd.DataFrame())
    col     = raw.get(FACTOR_COL, pd.DataFrame())
    water   = raw.get(FACTOR_WATER, pd.DataFrame())

    if not safety.empty and "crime_rate_per_lakh" in safety.columns:
        safety = stage_missing(safety, "state_name", "crime_rate_per_lakh")
    if not health.empty and "health" in health.columns:
        health = stage_missing(health, "state_name", "health")
    if not economy.empty and "per_capita_nsdp_constant" in economy.columns:
        economy = stage_missing(economy, "state_name", "per_capita_nsdp_constant")
    if not economy.empty and "unemployment_rate" in economy.columns:
        economy = stage_missing(economy, "state_name", "unemployment_rate")
    if not water.empty and "water_quality" in water.columns:
        water = stage_missing(water, "state_name", "water_quality")

    # Stage 4: Build tidy
    tidy = stage_build_tidy(places, air, safety, health, economy, col, water)

    # Stage 5: Pivot wide
    wide = stage_wide(tidy)

    # Stage 6: Validate
    issues = stage_validate(tidy, places)
    if issues:
        raise RuntimeError(
            "Pipeline validation failed; no processed outputs were written:\n- "
            + "\n- ".join(issues)
        )

    # Stage 7: Export
    stage_export(tidy, wide, issues, raw_sources=raw)

    logger.info("=== PIPELINE COMPLETE ===")


if __name__ == "__main__":
    run()
