"""
src/loaders/load_health.py
───────────────────────────
Load SRS (Sample Registration System) state infant mortality rate (IMR) data.

Expected input (data/raw/health/):
    - CSV/XLSX extracted from SRS Statistical Reports
      (or the raw PDFs if not pre-extracted).
    - Latest report covers 2022, published June 2025 (~3 year lag).
"""

import logging
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_HEALTH
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

_COL_CANDIDATES = {
    "state":  ["state_name", "state", "state_ut", "states/uts", "area"],
    "year":   ["year", "reference_year"],
    "imr":    ["imr", "infant_mortality_rate", "infant_mortality", "total_imr", "total"],
    "imr_r":  ["rural", "rural_imr"],
    "imr_u":  ["urban", "urban_imr"],
}


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    norm = {c.strip().lower().replace(" ", "_"): c for c in df.columns}
    for cand in candidates:
        if cand in norm:
            return norm[cand]
    return None


def load_health(raw_dir: Path = RAW_HEALTH) -> pd.DataFrame:
    """
    Load all SRS health files and return a state × year DataFrame.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, infant_mortality_rate, is_imputed (later added)
    """
    files = sorted(
        [f for f in raw_dir.iterdir() if f.suffix.lower() in (".csv", ".xls", ".xlsx")]
    )

    # Try PDFs if no tabular files found
    if not files:
        pdfs = sorted(raw_dir.glob("*.pdf"))
        if pdfs:
            logger.warning(
                "No CSV/XLSX files in %s; %d PDF(s) found. "
                "Extract tables manually with pdfplumber/camelot and save as CSV.",
                raw_dir, len(pdfs),
            )
        else:
            logger.error("No health files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for path in files:
        logger.info("Loading health file: %s", path.name)
        try:
            df = pd.read_excel(path, dtype=str) if path.suffix.lower() in (".xls", ".xlsx") \
                else pd.read_csv(path, dtype=str)
        except Exception as exc:
            logger.error("Failed to read %s: %s", path.name, exc)
            continue

        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        state_col = _find_col(df, _COL_CANDIDATES["state"])
        year_col  = _find_col(df, _COL_CANDIDATES["year"])
        imr_col   = _find_col(df, _COL_CANDIDATES["imr"])

        if state_col is None or imr_col is None:
            logger.error(
                "Cannot identify required columns in %s. Found: %s", path.name, list(df.columns)
            )
            continue

        out = pd.DataFrame()
        out["state_name"] = df[state_col].astype(str).str.strip()
        out["year"] = (
            pd.to_numeric(df[year_col], errors="coerce").astype("Int64")
            if year_col else None
        )
        out["infant_mortality_rate"] = pd.to_numeric(df[imr_col], errors="coerce")
        frames.append(out)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)

    # Remove aggregate rows
    combined = combined[
        ~combined["state_name"].str.lower().isin(["total", "india", "all india"])
    ].copy()

    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")

    # Domain: IMR per 1000 live births; physically impossible if < 0 or > 200
    combined = flag_outliers(combined, "infant_mortality_rate", domain_lo=0.0, domain_hi=200.0)

    profile_dataframe(combined, "health (SRS IMR)")
    logger.info(
        "Health data: %d state-years, %d states, years %s",
        len(combined),
        combined["state_name"].nunique(),
        sorted(combined["year"].dropna().unique()),
    )
    return combined
