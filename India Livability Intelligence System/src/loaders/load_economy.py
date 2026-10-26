"""
src/loaders/load_economy.py
────────────────────────────
Load economy data from two sources:

1. RBI Handbook — per capita Net State Domestic Product (NSDP) at constant prices
   (2011-12 base series ONLY; earlier factor-cost series excluded).
   Source: data/raw/economy/rbi_nsdp*.csv or .xlsx

2. MoSPI PLFS — state-level unemployment rate (Usual Status, 15+ years)
   Source: data/raw/economy/plfs_*.csv/.xlsx or PDFs

Year alignment (M3.6):
    Financial year 2022-23 → reference year 2022  (start_year rule)
    PLFS survey year 2022-23 → reference year 2022 (same rule)
"""

import logging
import re
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_ECONOMY
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    financial_year_to_ref,
    profile_dataframe,
)

logger = logging.getLogger(__name__)


# ── RBI NSDP loader ─────────────────────────────────────────────────────────

def load_rbi_nsdp(raw_dir: Path = RAW_ECONOMY) -> pd.DataFrame:
    """
    Load RBI per capita NSDP at constant 2011-12 prices.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year (reference year int), per_capita_nsdp_constant
    """
    files = sorted(
        [f for f in raw_dir.iterdir()
         if "nsdp" in f.name.lower() or "rbi" in f.name.lower()
         and f.suffix.lower() in (".csv", ".xls", ".xlsx")]
    )
    if not files:
        logger.error("No RBI NSDP files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for path in files:
        logger.info("Loading RBI NSDP: %s", path.name)
        try:
            df = pd.read_excel(path, dtype=str) if path.suffix.lower() in (".xls", ".xlsx") \
                else pd.read_csv(path, dtype=str)
        except Exception as exc:
            logger.error("Failed to read %s: %s", path.name, exc)
            continue

        # RBI files are often wide (years as columns) or long
        # Detect format: if 'state' and 'year' columns exist → long format
        cols_lower = [c.strip().lower() for c in df.columns]
        if any(k in cols_lower for k in ("state", "state_name", "state_ut", "states/uts")):
            # Try long format
            state_col = next(
                (df.columns[i] for i, c in enumerate(cols_lower)
                 if c in ("state", "state_name", "state_ut", "states/uts")), None
            )
            year_col = next(
                (df.columns[i] for i, c in enumerate(cols_lower) if "year" in c), None
            )
            value_col = next(
                (df.columns[i] for i, c in enumerate(cols_lower)
                 if any(k in c for k in ["per_capita", "nsdp", "per capita"])), None
            )

            if state_col and value_col:
                out = pd.DataFrame()
                out["state_name"] = df[state_col].astype(str).str.strip()
                if year_col:
                    out["year"] = df[year_col].apply(
                        lambda x: financial_year_to_ref(str(x)) if x else None
                    )
                out["per_capita_nsdp_constant"] = pd.to_numeric(df[value_col], errors="coerce")
                frames.append(out)
                continue

        # Wide format: columns are year strings like "2015-16", "2016-17"
        # Melt to long format
        year_cols = [c for c in df.columns if re.match(r"20\d{2}", str(c).strip()[:4])]
        state_col_idx = 0  # assume first column is state name
        if year_cols:
            df_long = df.melt(
                id_vars=[df.columns[state_col_idx]],
                value_vars=year_cols,
                var_name="fy",
                value_name="per_capita_nsdp_constant",
            )
            df_long = df_long.rename(columns={df.columns[state_col_idx]: "state_name"})
            df_long["year"] = df_long["fy"].apply(financial_year_to_ref)
            df_long["per_capita_nsdp_constant"] = pd.to_numeric(
                df_long["per_capita_nsdp_constant"], errors="coerce"
            )
            frames.append(df_long[["state_name", "year", "per_capita_nsdp_constant"]])
            continue

        logger.warning("Could not parse RBI NSDP format for %s", path.name)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)
    combined = combined[
        ~combined["state_name"].str.lower().isin(["total", "india", "all india"])
    ].copy()
    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")
    combined = flag_outliers(combined, "per_capita_nsdp_constant", domain_lo=0.0)

    profile_dataframe(combined, "economy: RBI NSDP")
    return combined


# ── MoSPI PLFS loader ───────────────────────────────────────────────────────

def load_plfs_unemployment(raw_dir: Path = RAW_ECONOMY) -> pd.DataFrame:
    """
    Load MoSPI PLFS state unemployment rates.

    Expected format: tabular (CSV/XLSX) extracted from PLFS Annual Reports.
    If only PDFs are present, logs a warning (manual extraction needed).

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, unemployment_rate, period_type='survey'
    """
    files = sorted(
        [f for f in raw_dir.iterdir()
         if "plfs" in f.name.lower() or "unemployment" in f.name.lower()
         and f.suffix.lower() in (".csv", ".xls", ".xlsx")]
    )

    if not files:
        pdfs = [f for f in raw_dir.glob("*.pdf") if "plfs" in f.name.lower()]
        if pdfs:
            logger.warning(
                "%d PLFS PDF(s) found — extract state unemployment tables manually "
                "using pdfplumber/camelot and save as CSV. Files: %s",
                len(pdfs), [p.name for p in pdfs],
            )
        else:
            logger.error("No PLFS files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for path in files:
        logger.info("Loading PLFS: %s", path.name)
        try:
            df = pd.read_excel(path, dtype=str) if path.suffix.lower() in (".xls", ".xlsx") \
                else pd.read_csv(path, dtype=str)
        except Exception as exc:
            logger.error("Failed to read %s: %s", path.name, exc)
            continue

        cols_lower = {c.strip().lower(): c for c in df.columns}
        state_col = next(
            (cols_lower[k] for k in cols_lower
             if k in ("state", "state_name", "state_ut", "states/uts", "state/ut")), None
        )
        year_col = next(
            (cols_lower[k] for k in cols_lower if "year" in k), None
        )
        ur_col = next(
            (cols_lower[k] for k in cols_lower
             if any(kw in k for kw in ["unemployment", "ur", "usual_status", "unemp"])), None
        )

        if state_col is None or ur_col is None:
            logger.error("Cannot identify columns in %s. Found: %s", path.name, list(df.columns))
            continue

        out = pd.DataFrame()
        out["state_name"] = df[state_col].astype(str).str.strip()
        if year_col:
            out["year"] = df[year_col].apply(
                lambda x: financial_year_to_ref(str(x)) if pd.notna(x) else None
            )
        else:
            # Infer from filename
            match = re.search(r"(20\d{2})", path.stem)
            out["year"] = int(match.group(1)) if match else None

        out["unemployment_rate"] = pd.to_numeric(df[ur_col], errors="coerce")
        out["period_type"] = "survey"
        frames.append(out)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)
    combined = combined[
        ~combined["state_name"].str.lower().isin(["total", "india", "all india"])
    ].copy()
    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")
    combined = flag_outliers(combined, "unemployment_rate", domain_lo=0.0, domain_hi=100.0)

    profile_dataframe(combined, "economy: PLFS unemployment")
    return combined


# ── Combined economy loader ──────────────────────────────────────────────────

def load_economy(raw_dir: Path = RAW_ECONOMY) -> pd.DataFrame:
    """
    Load and merge NSDP and PLFS into one economy table.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, per_capita_nsdp_constant, unemployment_rate
    Only years where BOTH indicators exist are included
    (required for economy factor trend computation).
    """
    nsdp = load_rbi_nsdp(raw_dir)
    plfs = load_plfs_unemployment(raw_dir)

    if nsdp.empty or plfs.empty:
        logger.warning("One or both economy datasets missing — returning partial data.")
        if not nsdp.empty:
            return nsdp
        return plfs

    merged = nsdp.merge(plfs[["state_name", "year", "unemployment_rate"]],
                        on=["state_name", "year"], how="inner")

    logger.info(
        "Economy merged (inner join): %d state-years across %d states",
        len(merged),
        merged["state_name"].nunique(),
    )
    return merged
