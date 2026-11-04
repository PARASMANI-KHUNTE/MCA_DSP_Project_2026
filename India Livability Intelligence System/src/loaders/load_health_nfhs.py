"""
src/loaders/load_health_nfhs.py
───────────────────────────────
Load and aggregate the NFHS-5 district factsheet to state-level health
indicators and a transparent composite health index.

Input:
    data/raw/health/NFHS_5_India_Districts_Factsheet_Data.csv

The NFHS-5 survey reference year is recorded as 2021. It is a single survey
round, so this source is never trended.
"""

import logging
from pathlib import Path

import numpy as np
import pandas as pd

from src.utils.constants import (
    RAW_HEALTH,
    NFHS_HEALTH_FILENAME,
    NFHS_REFERENCE_YEAR,
)
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

SOURCE_ID = "health_nfhs5"

INDICATORS = {
    "institutional_births_pct": {
        "terms": ("institutional births (in the 5 years before the survey)",),
        "bounds": (40.0, 100.0),
        "direction": "higher_is_better",
        "label": "Institutional births",
    },
    "full_vaccination_pct": {
        "terms": ("fully vaccinated", "either vaccination card"),
        "bounds": (30.0, 100.0),
        "direction": "higher_is_better",
        "label": "Children fully vaccinated",
    },
    "child_stunting_pct": {
        "terms": ("children under 5 years who are stunted",),
        "bounds": (5.0, 60.0),
        "direction": "lower_is_better",
        "label": "Child stunting",
    },
    "women_anaemia_pct": {
        "terms": ("all women age 15-49 years who are anaemic",),
        "bounds": (10.0, 80.0),
        "direction": "lower_is_better",
        "label": "Women with anaemia",
    },
}

CONTEXT_INDICATORS = {
    "improved_sanitation_pct": {
        "terms": ("use an improved sanitation facility",),
        "direction": "higher_is_better",
        "label": "Improved sanitation",
    },
    "health_insurance_pct": {
        "terms": ("health insurance/financing scheme",),
        "direction": "higher_is_better",
        "label": "Health insurance coverage",
    },
}


def _normalized_columns(df: pd.DataFrame) -> dict[str, str]:
    return {
        " ".join(str(column).strip().lower().split()): column
        for column in df.columns
    }


def _find_column(df: pd.DataFrame, terms: tuple[str, ...]) -> str | None:
    columns = _normalized_columns(df)
    matches = [
        original for normalized, original in columns.items()
        if all(term.lower() in normalized for term in terms)
    ]
    if not matches:
        return None
    return min(matches, key=len)


def _parse_estimate(value) -> float:
    if pd.isna(value):
        return np.nan
    text = str(value).strip()
    if text in {"", "*", "NA", "N/A", "-", "–"}:
        return np.nan
    text = text.replace(",", "").strip()
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1].strip()
    try:
        return float(text)
    except ValueError:
        return np.nan


def _normalize(value: float, lo: float, hi: float, direction: str) -> float:
    if pd.isna(value) or hi <= lo:
        return np.nan
    clipped = float(np.clip(value, lo, hi))
    if direction == "higher_is_better":
        return 100.0 * (clipped - lo) / (hi - lo)
    if direction == "lower_is_better":
        return 100.0 * (hi - clipped) / (hi - lo)
    raise ValueError(f"Unknown direction: {direction!r}")


def load_nfhs_health(raw_dir: Path = RAW_HEALTH) -> pd.DataFrame:
    """
    Aggregate district indicators to a state-level NFHS-5 health table.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, health, institutional_births_pct,
        full_vaccination_pct, child_stunting_pct, women_anaemia_pct,
        improved_sanitation_pct, health_insurance_pct,
        district_count, households_surveyed, gap_flag, source_id
    """
    path = raw_dir / NFHS_HEALTH_FILENAME
    if not path.exists():
        logger.error("NFHS-5 health file not found: %s", path)
        return pd.DataFrame()

    logger.info("Loading NFHS-5 district factsheet: %s", path.name)
    df = pd.read_csv(path)
    if df.empty:
        return pd.DataFrame()

    state_col = _find_column(df, ("state/ut",))
    district_col = _find_column(df, ("district names",))
    household_col = _find_column(df, ("number of households surveyed",))
    if state_col is None or district_col is None:
        logger.error("Cannot identify State/UT or District Names columns.")
        return pd.DataFrame()

    indicator_columns: dict[str, str] = {}
    for name, spec in {**INDICATORS, **CONTEXT_INDICATORS}.items():
        column = _find_column(df, spec["terms"])
        if column is None:
            logger.warning("NFHS-5 indicator '%s' not found; skipping.", name)
            continue
        indicator_columns[name] = column
        df[name] = df[column].apply(_parse_estimate)

    missing_scored = set(INDICATORS) - set(indicator_columns)
    if missing_scored:
        logger.error(
            "NFHS-5 is missing required health composite indicators: %s",
            sorted(missing_scored),
        )
        return pd.DataFrame()

    df["state_name"] = df[state_col].astype(str).str.strip()
    df["district_name"] = df[district_col].astype(str).str.strip()
    df["households_surveyed"] = (
        pd.to_numeric(df[household_col], errors="coerce")
        if household_col is not None
        else np.nan
    )

    alias_map = load_alias_map()
    df = apply_name_standardization(df, "state_name", alias_map)

    rows: list[dict] = []
    for state_name, group in df.groupby("state_name", sort=False):
        weights = group["households_surveyed"].to_numpy(dtype=float)
        valid_weights = np.isfinite(weights) & (weights > 0)
        record: dict = {
            "state_name": state_name,
            "year": NFHS_REFERENCE_YEAR,
            "district_count": int(len(group)),
            "households_surveyed": (
                float(np.nansum(weights)) if valid_weights.any() else np.nan
            ),
        }

        for name, spec in {**INDICATORS, **CONTEXT_INDICATORS}.items():
            if name not in group.columns:
                record[name] = np.nan
                continue
            values = group[name].to_numpy(dtype=float)
            usable = np.isfinite(values)
            if not usable.any():
                record[name] = np.nan
                continue
            if valid_weights.any():
                weight_subset = weights[usable & valid_weights]
                value_subset = values[usable & valid_weights]
                record[name] = (
                    float(np.average(value_subset, weights=weight_subset))
                    if len(value_subset) and weight_subset.sum() > 0
                    else float(np.nanmean(values[usable]))
                )
            else:
                record[name] = float(np.nanmean(values[usable]))
        rows.append(record)

    aggregated = pd.DataFrame(rows)
    if aggregated.empty:
        logger.error("NFHS-5 aggregation produced no state rows.")
        return pd.DataFrame()

    sub_scores = []
    for name, spec in INDICATORS.items():
        lo, hi = spec["bounds"]
        direction = spec["direction"]
        sub_scores.append(
            aggregated[name].apply(
                lambda value: _normalize(value, lo, hi, direction)
            )
        )
    scores = pd.concat(sub_scores, axis=1)
    aggregated["health"] = scores.mean(axis=1).where(scores.notna().all(axis=1))

    aggregated["gap_flag"] = "nfhs5_2019_21_survey"
    aggregated["source_id"] = SOURCE_ID

    profile_dataframe(aggregated, "health: NFHS-5 state aggregation")
    logger.info(
        "NFHS-5 health: %d states/UTs, %d districts, health index range %.1f-%.1f.",
        len(aggregated),
        int(aggregated["district_count"].sum()),
        aggregated["health"].min(),
        aggregated["health"].max(),
    )
    return aggregated
