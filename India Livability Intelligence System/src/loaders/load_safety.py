"""
src/loaders/load_safety.py
───────────────────────────
Load NCRB "Crime in India" state-wise crime data.

Expected input (data/raw/safety/):
    - One or more CSV/XLSX files downloaded from data.gov.in or NCRB.
    - Files may be named by year, e.g. crime_2022.csv, or a combined file.

Key data decisions (M3.6):
    - Use crime rate per lakh population (not absolute counts).
    - IPC → BNS transition in 2024 may break the series; set series_break=True.
    - Missing metro-city years (e.g. 2021 NCRB metro) → treat as NaN, not zero.
    - Metro-city NCRB rates are NOT mixed with state rates (different populations).
"""

import logging
import re
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_SAFETY
from src.utils.provenance import is_known_generated_source
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    align_year,
    profile_dataframe,
)

logger = logging.getLogger(__name__)

# Year from which IPC→BNS transition creates a series break
_BNS_BREAK_YEAR = 2024

# Candidate column names across different NCRB file formats
_COL_CANDIDATES = {
    "state":       ["state_name", "state_ut", "state/ut", "state", "states/uts", "area_name"],
    "year":        ["year", "sl_no", "report_year"],
    "crime_total": ["total_ipc_crimes", "total_cognizable_crimes", "total_crimes",
                    "ipc_crimes_total", "crime_total"],
    "population":  ["mid_year_projected_population", "population", "projected_population"],
    "crime_rate":  ["crime_rate", "rate_per_lakh", "crime_rate_per_lakh"],
}


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    norm = {c.strip().lower().replace(" ", "_"): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in norm:
            return norm[cand.lower()]
    return None


def _compute_crime_rate(df: pd.DataFrame) -> pd.DataFrame:
    """Compute crime_rate_per_lakh if not already present."""
    rate_col = _find_col(df, _COL_CANDIDATES["crime_rate"])
    if rate_col:
        df["crime_rate_per_lakh"] = pd.to_numeric(df[rate_col], errors="coerce")
        return df

    total_col = _find_col(df, _COL_CANDIDATES["crime_total"])
    pop_col   = _find_col(df, _COL_CANDIDATES["population"])

    if total_col and pop_col:
        total = pd.to_numeric(df[total_col], errors="coerce")
        pop   = pd.to_numeric(df[pop_col],   errors="coerce")
        df["crime_rate_per_lakh"] = (total / pop) * 100_000
        logger.info("Computed crime_rate_per_lakh from totals and population.")
    else:
        logger.warning(
            "Cannot compute crime_rate_per_lakh. "
            "Missing columns. Available: %s", list(df.columns)
        )
        df["crime_rate_per_lakh"] = float("nan")

    return df


_YEAR_RE = re.compile(r"^(?:19|20)\d{2}$")


def _parse_wide_ncrb(path: Path) -> pd.DataFrame | None:
    """Parse the NCRB Table 1A.3 layout (states × year columns).

    The published table gives absolute IPC+SLL totals for 2020–2022, one
    2022 projected population column (in lakhs), and the published 2022 rate.
    Rates for 2020 and 2021 are derived as ``total / population_lakh`` using
    the same 2022 projected population; they are not published directly.
    """
    if path.suffix.lower() in (".xls", ".xlsx"):
        raw = pd.read_excel(path, header=None, dtype=str)
    else:
        raw = pd.read_csv(path, header=None, dtype=str)

    header_idx = None
    header: list[str] = []
    for index in range(min(15, len(raw))):
        cells = [str(value).strip() for value in raw.iloc[index].tolist() if pd.notna(value)]
        if any("state" in cell.lower() for cell in cells) and any(
            _YEAR_RE.match(cell) for cell in cells
        ):
            header_idx = index
            header = [
                str(value).strip() if pd.notna(value) else ""
                for value in raw.iloc[index].tolist()
            ]
            break

    if header_idx is None:
        return None

    state_col = next(
        (i for i, cell in enumerate(header) if "state" in cell.lower()), None
    )
    year_cols = {
        i: int(cell) for i, cell in enumerate(header) if _YEAR_RE.match(cell)
    }
    population_col = next(
        (i for i, cell in enumerate(header) if "population" in cell.lower()), None
    )
    rate_col = next(
        (
            i for i, cell in enumerate(header)
            if "rate" in cell.lower() and ("crime" in cell.lower() or "cognizable" in cell.lower())
        ),
        None,
    )
    if state_col is None or not year_cols:
        return None

    records: list[dict] = []
    for row_index in range(header_idx + 1, len(raw)):
        row = raw.iloc[row_index]
        raw_state = row.iloc[state_col]
        if pd.isna(raw_state):
            continue
        state_name = str(raw_state).strip()
        if not state_name or state_name.upper().endswith(":") or state_name.lower().startswith("total"):
            continue

        totals = {
            year: pd.to_numeric(row.iloc[column], errors="coerce")
            for column, year in year_cols.items()
        }
        if all(pd.isna(value) for value in totals.values()):
            continue

        population_lakh = (
            pd.to_numeric(row.iloc[population_col], errors="coerce")
            if population_col is not None else float("nan")
        )
        published_rate = (
            pd.to_numeric(row.iloc[rate_col], errors="coerce")
            if rate_col is not None else float("nan")
        )

        for year, total in totals.items():
            if pd.isna(total):
                continue
            if pd.notna(published_rate) and year == max(year_cols.values()):
                crime_rate = float(published_rate)
            elif pd.notna(population_lakh) and population_lakh > 0:
                crime_rate = round(float(total) / float(population_lakh), 1)
            else:
                continue
            records.append({
                "state_name": state_name,
                "year": year,
                "crime_rate_per_lakh": crime_rate,
                "series_break": False,
            })

    if not records:
        return None
    logger.info("Parsed wide NCRB table: %d state-years from %s.", len(records), path.name)
    return pd.DataFrame(records)


def _load_single_file(path: Path, year: int | None = None) -> pd.DataFrame:
    """Load one NCRB file (CSV or XLSX) and return a standardized DataFrame."""
    logger.info("Loading: %s", path.name)

    wide = _parse_wide_ncrb(path)
    if wide is not None:
        return wide

    if path.suffix.lower() in (".xls", ".xlsx"):
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_").replace("/", "_") for c in df.columns]

    state_col = _find_col(df, _COL_CANDIDATES["state"])
    year_col  = _find_col(df, _COL_CANDIDATES["year"])

    if state_col is None:
        logger.error("Cannot identify state column in %s. Columns: %s", path.name, list(df.columns))
        return pd.DataFrame()

    df = df.rename(columns={state_col: "state_name"})
    df["state_name"] = df["state_name"].astype(str).str.strip()

    # Year
    if year is not None:
        df["year"] = year
    elif year_col:
        df["year"] = df[year_col].apply(lambda x: align_year(x, "calendar"))
    else:
        logger.warning("No year column in %s — trying to infer from filename.", path.name)
        import re
        match = re.search(r"(20\d{2})", path.stem)
        df["year"] = int(match.group(1)) if match else None

    df = _compute_crime_rate(df)

    # Flag series break for BNS transition year
    # Mark only the first year of the BNS-era segment. Trend fitting uses this
    # as a boundary and does not combine the IPC and BNS segments.
    df["series_break"] = df["year"].apply(
        lambda y: y is not None and int(y) == _BNS_BREAK_YEAR
    )

    return df[["state_name", "year", "crime_rate_per_lakh", "series_break"]].copy()


def load_safety(raw_dir: Path = RAW_SAFETY) -> pd.DataFrame:
    """
    Load all NCRB safety files, merge, standardize, and return
    a clean state × year DataFrame.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, crime_rate_per_lakh,
        series_break, is_imputed (added by pipeline)
    """
    candidates = [
        f for f in raw_dir.iterdir()
        if f.suffix.lower() in (".csv", ".xls", ".xlsx")
    ]
    files = sorted(f for f in candidates if not is_known_generated_source(f))
    for path in candidates:
        if is_known_generated_source(path):
            logger.error("Excluding known generated placeholder from safety inputs: %s", path)
    if not files:
        logger.error("No safety files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for f in files:
        df = _load_single_file(f)
        if not df.empty:
            frames.append(df)

    if not frames:
        logger.error("All safety files failed to load.")
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)

    # Standardize state names
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)

    # Remove aggregate rows (e.g., "Total", "All India")
    exclude = ["total", "all india", "india", "all states"]
    combined = combined[
        ~combined["state_name"].str.lower().isin(exclude)
    ].copy()

    # Deduplicate (keep last if same state-year appears in multiple files)
    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")

    # Domain bounds: crime rate per lakh cannot be negative
    combined = flag_outliers(
        combined, "crime_rate_per_lakh", domain_lo=0.0, domain_hi=5000.0
    )

    profile_dataframe(combined, "safety (state-wise)")
    logger.info(
        "Safety data: %d state-years, %d states, years %s to %s",
        len(combined),
        combined["state_name"].nunique(),
        combined["year"].min(),
        combined["year"].max(),
    )
    return combined
