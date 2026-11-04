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
import re
from pathlib import Path

import pandas as pd

from src.utils.constants import RAW_HEALTH
from src.utils.provenance import is_known_generated_source
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


def _extract_srs_imr_pdf(path: Path) -> pd.DataFrame:
    """Extract the total IMR column from an SRS Bulletin Table 1.

    The bulletin is a text-layer PDF without ruling lines, so ``extract_tables``
    returns only the header. Values are reconstructed from word coordinates:
    the state label sits in the left margin and the three IMR columns (total,
    rural, urban) sit to its right.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber is required to read %s", path.name)
        return pd.DataFrame()

    with pdfplumber.open(path) as pdf:
        page = None
        for candidate in pdf.pages:
            text = candidate.extract_text() or ""
            if "Table 1:" in text and "Infant Mortality Rate" in text and "2022" in text:
                page = candidate
                break
        if page is None:
            logger.warning("No SRS Table 1 found in %s", path.name)
            return pd.DataFrame()
        words = page.extract_words()
        header = [w for w in words if 60 <= w["top"] <= 95]

    infant_header = [w for w in header if w["text"] == "Infant"]
    total_headers = [w for w in header if w["text"] == "Total"]
    if not infant_header or not total_headers:
        logger.warning("Could not locate the IMR header in %s", path.name)
        return pd.DataFrame()

    imr_left = min(w["x0"] for w in infant_header)
    imr_total_x = min(total_headers, key=lambda w: abs(w["x0"] - imr_left))["x0"]
    values = [
        w for w in words
        if w["top"] > 100
        and abs(w["x0"] - imr_total_x) <= 16
        and re.fullmatch(r"\d+", w["text"])
    ]

    label_words = [
        w for w in words
        if w["top"] > 100
        and w["x1"] <= 155
        and re.search(r"[A-Za-z&]", w["text"])
    ]
    label_words.sort(key=lambda w: (w["top"], w["x0"]))
    label_lines: list[list] = []
    for word in label_words:
        if label_lines and abs(word["top"] - label_lines[-1][0]) <= 2.5:
            label_lines[-1][1].append(word)
        else:
            label_lines.append([word["top"], [word]])

    labels: list[tuple[float, str]] = []
    for top, line_words in label_lines:
        text = " ".join(
            w["text"] for w in sorted(line_words, key=lambda w: w["x0"])
        ).strip()
        if text.lower().startswith("and ") and labels:
            labels[-1] = (labels[-1][0], f"{labels[-1][1]} {text}")
        else:
            labels.append((top, text))

    records: list[dict] = []
    for value in values:
        nearest = min(labels, key=lambda item: abs(item[0] - value["top"]))
        if abs(nearest[0] - value["top"]) > 8:
            continue
        state_name = re.sub(r"^\d+\.\s*", "", nearest[1]).strip()
        if not state_name:
            continue
        records.append({
            "state_name": state_name,
            "year": 2022,
            "infant_mortality_rate": int(value["text"]),
        })

    if not records:
        logger.warning("No IMR rows extracted from %s", path.name)
        return pd.DataFrame()
    logger.info("Extracted %d IMR rows from %s.", len(records), path.name)
    return pd.DataFrame(records)


def load_health(raw_dir: Path = RAW_HEALTH) -> pd.DataFrame:
    """
    Load all SRS health files and return a state × year DataFrame.

    Returns
    -------
    pd.DataFrame with columns:
        state_name, year, infant_mortality_rate, is_imputed (later added)
    """
    candidates = [
        f for f in raw_dir.iterdir()
        if f.suffix.lower() in (".csv", ".xls", ".xlsx")
    ]
    files = sorted(f for f in candidates if not is_known_generated_source(f))
    for path in candidates:
        if is_known_generated_source(path):
            logger.error("Excluding known generated placeholder from health inputs: %s", path)

    frames = []

    # SRS bulletins are the primary source. Parse their Table 1 when no
    # pre-extracted CSV/XLSX table is present.
    if not files:
        pdfs = sorted(raw_dir.glob("*.pdf"))
        if not pdfs:
            logger.error("No health files found in %s", raw_dir)
            return pd.DataFrame()
        for path in pdfs:
            logger.info("Loading health PDF: %s", path.name)
            extracted = _extract_srs_imr_pdf(path)
            if not extracted.empty:
                frames.append(extracted)

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
    combined = combined[
        ~combined["state_name"].str.strip().str.lower().isin(["total", "india", "all india"])
    ].copy()
    alias_map = load_alias_map()
    combined = apply_name_standardization(combined, "state_name", alias_map)

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
