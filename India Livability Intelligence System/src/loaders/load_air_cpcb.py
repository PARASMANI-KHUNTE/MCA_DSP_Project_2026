"""
src/loaders/load_air_cpcb.py
─────────────────────────────
Extract annual city-level air quality data from CPCB NAMP PDF reports
(e.g., "Ambient Air Quality Status of the Country during 2023").

Strategy (M3.6):
- Use pdfplumber (primary) with camelot as fallback.
- Keep the raw PDF; log the extraction method.
- Hand-check ≥10% of rows against the PDF (see data_quality_report.md).
- PM2.5 blank for some cities → leave as NaN (do NOT substitute PM10).
- Different method from Kaggle daily data → set air_source='cpcb'.
- If any overlapping year with Kaggle exists, compare to estimate an offset;
  if not, flag the join as a series break.

Expected input:
    data/raw/air_cpcb/*.pdf   — one PDF per year (2023, 2024, …)
"""

import logging
import re
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_AIR_CPCB
from src.utils.helpers import apply_name_standardization, load_alias_map, profile_dataframe

logger = logging.getLogger(__name__)

# CPCB table typically has these column patterns (vary by year — adjust as needed)
_EXPECTED_COLS = {
    "city": ["city", "station", "location", "city/town/village"],
    "pm25": ["pm2.5", "pm 2.5", "pm2_5", "pm25"],
    "pm10": ["pm10", "pm 10"],
    "so2":  ["so2"],
    "no2":  ["no2"],
}


def _normalize_col_name(name: str) -> str:
    return re.sub(r"[\s\W]+", "_", name.strip().lower())


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Return the first matching column name from a list of candidates."""
    norm = {_normalize_col_name(c): c for c in df.columns}
    for cand in candidates:
        key = _normalize_col_name(cand)
        if key in norm:
            return norm[key]
    return None


def _extract_with_pdfplumber(pdf_path: Path, year: int) -> pd.DataFrame | None:
    """Try to extract the air quality table using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        logger.warning("pdfplumber not installed — skipping")
        return None

    all_tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for tbl in tables:
                if tbl and len(tbl) > 2:
                    df = pd.DataFrame(tbl[1:], columns=tbl[0])
                    all_tables.append(df)

    if not all_tables:
        logger.warning("pdfplumber found no tables in %s", pdf_path.name)
        return None

    df = pd.concat(all_tables, ignore_index=True)
    logger.info("pdfplumber extracted %d rows from %s", len(df), pdf_path.name)
    return df


def _extract_with_camelot(pdf_path: Path, year: int) -> pd.DataFrame | None:
    """Try to extract the air quality table using camelot."""
    try:
        import camelot
    except ImportError:
        logger.warning("camelot not installed — skipping")
        return None

    try:
        tables = camelot.read_pdf(str(pdf_path), pages="all", flavor="lattice")
        if len(tables) == 0:
            tables = camelot.read_pdf(str(pdf_path), pages="all", flavor="stream")
    except Exception as exc:
        logger.error("camelot failed on %s: %s", pdf_path.name, exc)
        return None

    frames = [t.df for t in tables if t.df.shape[0] > 2]
    if not frames:
        logger.warning("camelot found no usable tables in %s", pdf_path.name)
        return None

    # Use header row from first table
    df = pd.concat(frames, ignore_index=True)
    df.columns = df.iloc[0]
    df = df.drop(index=0).reset_index(drop=True)
    logger.info("camelot extracted %d rows from %s", len(df), pdf_path.name)
    return df


def _clean_extracted(df: pd.DataFrame, year: int) -> pd.DataFrame | None:
    """Standardize column names, extract PM2.5/PM10, coerce to numeric."""
    # Normalize column names
    df.columns = [_normalize_col_name(str(c)) for c in df.columns]
    df = df.rename(columns={c: c for c in df.columns})  # no-op, already normalized

    city_col = _find_col(df, _EXPECTED_COLS["city"])
    pm25_col = _find_col(df, _EXPECTED_COLS["pm25"])
    pm10_col = _find_col(df, _EXPECTED_COLS["pm10"])

    if city_col is None:
        logger.error("Could not identify city column in extracted table. Columns: %s", list(df.columns))
        return None

    result = pd.DataFrame()
    result["city"] = df[city_col].astype(str).str.strip()

    if pm25_col:
        result["pm25_annual"] = pd.to_numeric(df[pm25_col], errors="coerce")
    else:
        logger.warning("No PM2.5 column found in CPCB table for year %d", year)
        result["pm25_annual"] = float("nan")

    if pm10_col:
        result["pm10_annual"] = pd.to_numeric(df[pm10_col], errors="coerce")
    else:
        result["pm10_annual"] = float("nan")

    result["year"] = year
    result["air_source"] = "cpcb"
    result["gap_flag"] = ""  # caller sets series_break if needed

    # Drop rows where city is blank or looks like a header
    result = result[result["city"].str.len() > 1].copy()
    result = result[~result["city"].str.lower().isin(["city", "nan", "none"])].copy()

    return result


def load_cpcb_pdf(pdf_path: Path, year: int) -> pd.DataFrame | None:
    """
    Extract city-level annual PM2.5 from a CPCB NAMP PDF for a given year.

    Returns a DataFrame or None if extraction fails.
    Logs the method used.
    """
    logger.info("Extracting CPCB PDF: %s (year=%d)", pdf_path.name, year)

    raw = _extract_with_pdfplumber(pdf_path, year)
    method = "pdfplumber"
    if raw is None or raw.empty:
        raw = _extract_with_camelot(pdf_path, year)
        method = "camelot"

    if raw is None or raw.empty:
        logger.error("All extraction methods failed for %s", pdf_path.name)
        return None

    logger.info("Extraction method used: %s", method)
    df = _clean_extracted(raw, year)
    if df is None:
        return None

    # Standardize city names
    alias_map = load_alias_map()
    df = apply_name_standardization(df, "city", alias_map)

    profile_dataframe(df, f"cpcb_{year}")
    logger.warning(
        "ACTION REQUIRED: Manually verify at least 10%% of rows from %s against the PDF.",
        pdf_path.name,
    )
    return df


def load_all_cpcb(raw_dir: Path = RAW_AIR_CPCB) -> pd.DataFrame:
    """
    Load all CPCB PDF files found in raw_dir.
    Expects filenames containing the 4-digit year, e.g. 'AQS_2023.pdf'.

    Returns a combined DataFrame for all available years.
    """
    pdfs = sorted(raw_dir.glob("*.pdf"))
    if not pdfs:
        logger.error("No PDF files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for pdf_path in pdfs:
        # Extract year from filename
        match = re.search(r"(20\d{2})", pdf_path.stem)
        if not match:
            logger.warning("Cannot determine year from filename %s — skipping", pdf_path.name)
            continue
        year = int(match.group(1))
        df = load_cpcb_pdf(pdf_path, year)
        if df is not None and not df.empty:
            frames.append(df)

    if not frames:
        logger.error("No CPCB data could be extracted.")
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    logger.info(
        "CPCB combined: %d rows, %d cities, years: %s",
        len(combined),
        combined["city"].nunique(),
        sorted(combined["year"].unique()),
    )
    return combined


def run_coverage_check(raw_dir: Path = RAW_AIR_CPCB) -> pd.DataFrame:
    """
    Coverage check for CPCB: which cities have non-blank PM2.5 for each year.

    Returns
    -------
    pd.DataFrame with columns:
        city, cpcb_years_valid, cpcb_valid_year_count, passes_cpcb_rule
    """
    from src.utils.constants import MIN_CPCB_VALID_YEARS

    combined = load_all_cpcb(raw_dir)
    if combined.empty:
        logger.error("Cannot run CPCB coverage check — no data extracted.")
        return pd.DataFrame()

    valid = combined.dropna(subset=["pm25_annual"])
    cpcb_coverage = (
        valid[valid["year"].isin([2023, 2024])]
        .groupby("city")["year"]
        .apply(list)
        .rename("cpcb_years_valid")
        .reset_index()
    )
    cpcb_coverage["cpcb_valid_year_count"] = cpcb_coverage["cpcb_years_valid"].apply(len)
    cpcb_coverage["passes_cpcb_rule"] = (
        cpcb_coverage["cpcb_valid_year_count"] >= MIN_CPCB_VALID_YEARS
    )
    return cpcb_coverage.sort_values("cpcb_valid_year_count", ascending=False)
