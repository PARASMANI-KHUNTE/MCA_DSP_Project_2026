"""
src/loaders/load_water_quality.py
──────────────────────────────────
Load the CPCB water-body quality dataset (ponds, tanks, lakes, wetlands) and
aggregate station readings to a state-level water-quality factor.

Input:
    data/raw/Water bodies quality data - India/Water_pond_tanks_2021.csv

The file is a 2021 snapshot. It contains physical/chemical/bacteriological
quality indicators, not water-body counts. The optional factor uses a
transparent two-indicator index from BOD (lower is better) and dissolved
oxygen (higher is better). Coliform and other readings are retained for
context but are not part of the factor score.
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from src.utils.constants import (
    RAW_WATER,
    WATER_QUALITY_FILENAME,
    WATER_REFERENCE_YEAR,
)
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

SOURCE_ID = "water_quality_cpcb"

BOD_BOUNDS = (1.0, 30.0)
DO_BOUNDS = (2.0, 8.0)


def _clean_column_names(columns) -> list[str]:
    cleaned = []
    for column in columns:
        text = str(column).replace("\n", " ").replace("\r", " ")
        cleaned.append(" ".join(text.split()))
    return cleaned


def _find_column(df: pd.DataFrame, *terms: str) -> str | None:
    normalized = {" ".join(str(c).lower().split()): c for c in df.columns}
    matches = [
        original for normalized_name, original in normalized.items()
        if all(term.lower() in normalized_name for term in terms)
    ]
    return min(matches, key=len) if matches else None


def _normalize(value: float, lo: float, hi: float, direction: str) -> float:
    if pd.isna(value) or hi <= lo:
        return np.nan
    clipped = float(np.clip(value, lo, hi))
    if direction == "higher_is_better":
        return 100.0 * (clipped - lo) / (hi - lo)
    if direction == "lower_is_better":
        return 100.0 * (hi - clipped) / (hi - lo)
    raise ValueError(f"Unknown direction: {direction!r}")


def load_water_quality(raw_dir: Path = RAW_WATER) -> pd.DataFrame:
    """
    Aggregate water-body station readings to state-year 2021.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, water_quality, water_bod_mg_l, water_do_mg_l,
        water_fecal_coliform_mpn, water_total_coliform_mpn,
        water_ph_mean, water_station_count, gap_flag, source_id
    """
    path = raw_dir / WATER_QUALITY_FILENAME
    if not path.exists():
        logger.error("Water quality file not found: %s", path)
        return pd.DataFrame()

    logger.info("Loading water quality data: %s", path.name)
    df = pd.read_csv(path, encoding="latin-1")
    df.columns = _clean_column_names(df.columns)

    state_col = _find_column(df, "state name")
    station_col = _find_column(df, "stn code")
    if state_col is None:
        logger.error("Cannot identify 'State Name' in water quality file.")
        return pd.DataFrame()

    column_specs = {
        "bod": ("bod (mg/l)",),
        "do": ("dissolved oxygen",),
        "fecal": ("fecal coliform",),
        "total": ("total coliform",),
        "ph": ("ph",),
    }
    min_max: dict[str, tuple[str | None, str | None]] = {}
    for key, terms in column_specs.items():
        min_col = _find_column(df, *terms, "(min)")
        max_col = _find_column(df, *terms, "(max)")
        if min_col is None and max_col is None:
            logger.warning("Water quality indicator '%s' not found.", key)
            continue
        min_max[key] = (min_col, max_col)

    for key, (min_col, max_col) in min_max.items():
        values = []
        for column in (min_col, max_col):
            if column is not None:
                values.append(pd.to_numeric(df[column], errors="coerce"))
        if values:
            df[key] = pd.concat(values, axis=1).mean(axis=1, skipna=True)

    required = {"bod", "do"}
    if not required.issubset(df.columns):
        logger.error(
            "Water quality file lacks BOD/DO columns required for the factor."
        )
        return pd.DataFrame()

    df["state_name"] = (
        df[state_col].astype(str)
        .str.replace("\n", " ", regex=False)
        .str.replace("\r", " ", regex=False)
        .str.strip()
        .str.title()
    )
    df["station_id"] = (
        df[station_col].astype(str).str.strip()
        if station_col is not None
        else pd.Series("", index=df.index)
    )

    alias_map = load_alias_map()
    df = apply_name_standardization(df, "state_name", alias_map)
    df["year"] = WATER_REFERENCE_YEAR

    aggregations = {
        "water_bod_mg_l": ("bod", "mean"),
        "water_do_mg_l": ("do", "mean"),
        "water_station_count": ("station_id", "nunique"),
    }
    for source, target in (
        ("fecal", "water_fecal_coliform_mpn"),
        ("total", "water_total_coliform_mpn"),
        ("ph", "water_ph_mean"),
    ):
        if source in df.columns:
            aggregations[target] = (source, "median")

    state = df.groupby(["state_name", "year"], as_index=False).agg(**aggregations)

    bod_scores = state["water_bod_mg_l"].apply(
        lambda value: _normalize(value, *BOD_BOUNDS, "lower_is_better")
    )
    do_scores = state["water_do_mg_l"].apply(
        lambda value: _normalize(value, *DO_BOUNDS, "higher_is_better")
    )
    sub_scores = pd.concat([bod_scores, do_scores], axis=1)
    state["water_quality"] = sub_scores.mean(axis=1).where(
        sub_scores.notna().all(axis=1)
    )
    state = state[state["water_quality"].notna()].copy()

    state["gap_flag"] = "water_quality_2021_snapshot"
    state["source_id"] = SOURCE_ID

    profile_dataframe(state, "water_quality (state aggregation)")
    logger.info(
        "Water quality: %d state-years across %d states, index range %.1f-%.1f.",
        len(state), state["state_name"].nunique(),
        state["water_quality"].min(), state["water_quality"].max(),
    )
    return state
