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

_YEAR_RE = re.compile(r"^(?:19|20)\d{2}(?:-\d{2,4})?$")

from src.utils.constants import RAW_ECONOMY, NATIONAL_ECONOMY_FILENAME
from src.utils.provenance import is_known_generated_source
from src.utils.helpers import (
    apply_name_standardization,
    load_alias_map,
    flag_outliers,
    financial_year_to_ref,
    profile_dataframe,
)

logger = logging.getLogger(__name__)


# ── RBI NSDP loader ─────────────────────────────────────────────────────────

def _parse_rbi_nsdp_file(path: Path) -> pd.DataFrame:
    """Parse the RBI Handbook Table 20 layout (multi-sheet, state × FY).

    The published workbook splits the series across two sheets (2011-12 to
    2016-17 and 2017-18 to 2024-25). Each sheet has a title block, a state
    label column that is not always column 0, and a separate financial-year
    header row.
    """
    if path.suffix.lower() in (".xls", ".xlsx"):
        sheets = pd.read_excel(path, sheet_name=None, header=None, dtype=str)
    else:
        sheets = {"csv": pd.read_csv(path, header=None, dtype=str)}

    records: list[dict] = []
    for sheet_name, raw in sheets.items():
        header_idx = None
        header: list[str] = []
        year_cols: dict[int, int] = {}
        data_start = 0

        for index in range(min(20, len(raw))):
            cells = [
                str(value).strip() for value in raw.iloc[index].tolist()
                if pd.notna(value)
            ]
            if not any("state" in cell.lower() for cell in cells):
                continue

            header = [
                str(value).strip() if pd.notna(value) else ""
                for value in raw.iloc[index].tolist()
            ]
            same_row_years = {
                column: int(cell[:4])
                for column, cell in enumerate(header)
                if _YEAR_RE.match(cell)
            }
            if same_row_years:
                year_cols = same_row_years
                data_start = index + 1
            elif index + 1 < len(raw):
                next_row = [
                    str(value).strip() if pd.notna(value) else ""
                    for value in raw.iloc[index + 1].tolist()
                ]
                year_cols = {
                    column: int(cell[:4])
                    for column, cell in enumerate(next_row)
                    if _YEAR_RE.match(cell)
                }
                data_start = index + 2

            if year_cols:
                header_idx = index
                break

        if header_idx is None or not year_cols:
            logger.warning("Could not parse RBI NSDP sheet '%s' in %s", sheet_name, path.name)
            continue

        state_col = next(
            (i for i, cell in enumerate(header) if "state" in cell.lower()), None
        )
        if state_col is None:
            continue

        for row_index in range(data_start, len(raw)):
            row = raw.iloc[row_index]
            raw_state = row.iloc[state_col]
            if pd.isna(raw_state):
                continue
            state_name = re.sub(r"\*+$", "", str(raw_state).strip()).strip()
            lowered = state_name.lower()
            if (
                not state_name
                or state_name.startswith("-")
                or state_name.startswith("*")
                or lowered.startswith("source")
                or lowered.startswith("note")
            ):
                continue

            for column, year in year_cols.items():
                raw_value = str(row.iloc[column]).replace(",", "").strip()
                value = pd.to_numeric(raw_value, errors="coerce")
                if pd.isna(value):
                    continue
                records.append({
                    "state_name": state_name,
                    "year": year,
                    "per_capita_nsdp_constant": float(value),
                })

    if not records:
        return pd.DataFrame()
    logger.info("Parsed RBI NSDP workbook: %d state-years from %s.", len(records), path.name)
    return pd.DataFrame(records)


def load_rbi_nsdp(raw_dir: Path = RAW_ECONOMY) -> pd.DataFrame:
    """
    Load RBI per capita NSDP at constant 2011-12 prices.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year (reference year int), per_capita_nsdp_constant
    """
    files = sorted(
        f for f in raw_dir.iterdir()
        if ("nsdp" in f.name.lower() or "rbi" in f.name.lower())
        and f.suffix.lower() in (".csv", ".xls", ".xlsx")
        and not is_known_generated_source(f)
    )
    if not files:
        logger.error("No RBI NSDP files found in %s", raw_dir)
        return pd.DataFrame()

    frames = []
    for path in files:
        logger.info("Loading RBI NSDP: %s", path.name)
        try:
            published = _parse_rbi_nsdp_file(path)
        except Exception as exc:
            logger.error("Failed to parse published layout in %s: %s", path.name, exc)
            published = pd.DataFrame()
        if not published.empty:
            frames.append(published)
            continue

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
    combined = combined[
        ~combined["state_name"].str.strip().str.lower().isin(["total", "india", "all india"])
    ].copy()
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)
    combined = combined.drop_duplicates(subset=["state_name", "year"], keep="last")
    combined = flag_outliers(combined, "per_capita_nsdp_constant", domain_lo=0.0)

    profile_dataframe(combined, "economy: RBI NSDP")
    return combined


# ── MoSPI PLFS loader ───────────────────────────────────────────────────────

def _extract_plfs_pdf(path: Path) -> pd.DataFrame:
    """Extract state unemployment rates (age 15+, person, rural+urban).

    PLFS Annual Reports publish Table 18 as a text table. The person column
    for rural+urban is the last value on each state line. The table for
    "15 years and above" sits next to the "15-59 years" table, so the page
    is located by its exact title rather than by a fixed page number.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber is required to read %s", path.name)
        return pd.DataFrame()

    with pdfplumber.open(path) as pdf:
        total_pages = len(pdf.pages)
        preferred = [i for i in range(120, min(170, total_pages))]
        fallback = [i for i in range(total_pages) if i not in preferred]
        page_text = None
        for page_index in preferred + fallback:
            text = pdf.pages[page_index].extract_text() or ""
            if "Table (18)" in text and "age group: 15 years and above" in text:
                page_text = text
                break

    if page_text is None:
        logger.warning("No PLFS Table 18 (15+) found in %s", path.name)
        return pd.DataFrame()

    number = r"\d+(?:\.\d+)?"
    pattern = re.compile(r"^(.+?)\s+((?:" + number + r"\s+)*" + number + r")$")
    records: list[dict] = []
    for line in page_text.splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        state_name = match.group(1).strip()
        values = [float(value) for value in match.group(2).split()]
        if not values:
            continue
        records.append({
            "state_name": state_name,
            "year": 2023,
            "unemployment_rate": values[-1],
            "period_type": "survey",
        })

    if not records:
        logger.warning("No PLFS unemployment rows extracted from %s", path.name)
        return pd.DataFrame()
    logger.info("Extracted %d PLFS unemployment rows from %s.", len(records), path.name)
    return pd.DataFrame(records)


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
        f for f in raw_dir.iterdir()
        if ("plfs" in f.name.lower() or "unemployment" in f.name.lower())
        and f.suffix.lower() in (".csv", ".xls", ".xlsx")
        and not is_known_generated_source(f)
    )

    frames = []
    if not files:
        pdfs = [f for f in raw_dir.glob("*.pdf") if "plfs" in f.name.lower()]
        if not pdfs:
            logger.error("No PLFS files found in %s", raw_dir)
            return pd.DataFrame()
        for path in sorted(pdfs):
            logger.info("Loading PLFS PDF: %s", path.name)
            extracted = _extract_plfs_pdf(path)
            if not extracted.empty:
                frames.append(extracted)

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
    combined = combined[
        ~combined["state_name"].str.strip().str.lower().isin(["total", "india", "all india"])
    ].copy()
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)
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

# ── National macro context ──────────────────────────────────────────────────

_NATIONAL_ECONOMY_COLUMNS = {
    "Year": "year",
    "Country Name": "country",
    "GDP (current US$)": "gdp_current_usd",
    "GDP per capita (current US$)": "gdp_per_capita_current_usd",
    "GDP growth (annual %)": "gdp_growth_pct",
    "Imports of goods and services (% of GDP)": "imports_pct_gdp",
    "Exports of goods and services (% of GDP)": "exports_pct_gdp",
    "Total reserves (includes gold, current US$)": "total_reserves_usd",
    "Inflation, consumer prices (annual %)": "inflation_pct",
    "Population, total": "population_total",
    "Population growth (annual %)": "population_growth_pct",
    "Life expectancy at birth, total (years)": "life_expectancy_years",
}


def load_national_economy(raw_dir: Path = RAW_ECONOMY) -> pd.DataFrame:
    """
    Load India-only national macro indicators (1960-2020) as a context table.

    These values are national and cannot be assigned to individual states or
    cities, so they are exported separately and are not used in place scoring.
    """
    if not raw_dir.exists():
        return pd.DataFrame()
    candidates = [
        path for path in raw_dir.rglob("*")
        if path.is_file() and path.name.lower() == NATIONAL_ECONOMY_FILENAME.lower()
    ]
    if not candidates:
        logger.info("National economy context file not found in %s", raw_dir)
        return pd.DataFrame()

    path = sorted(candidates)[0]
    logger.info("Loading national economy context: %s", path.name)
    df = pd.read_csv(path)
    df = df.rename(columns=_NATIONAL_ECONOMY_COLUMNS)

    if "country" in df.columns:
        df = df[df["country"].astype(str).str.strip().str.lower().eq("india")].copy()
    if "year" in df.columns:
        df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")

    for column in _NATIONAL_ECONOMY_COLUMNS.values():
        if column in ("country", "year"):
            continue
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    keep = [column for column in _NATIONAL_ECONOMY_COLUMNS.values() if column in df.columns]
    df = df[keep].drop_duplicates(subset=["year"], keep="last").sort_values("year")
    df["source_id"] = "economy_world_bank_india"

    profile_dataframe(df, "economy: national macro context")
    logger.info(
        "National economy context: %d years (%s-%s).",
        len(df), df["year"].min(), df["year"].max(),
    )
    return df
