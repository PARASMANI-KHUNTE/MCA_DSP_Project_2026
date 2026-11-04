"""
tests/test_data.py
───────────────────
Data pipeline validation tests (M10.1).
These tests run against actual processed data (if it exists).
If processed files don't exist yet, tests are skipped gracefully.
"""

import pandas as pd
import pytest

from src.utils.constants import (
    FACTORS_TIDY,
    FACTORS_WIDE,
    PLACES_CSV,
    CORE_FACTORS,
    SCORE_MIN,
    SCORE_MAX,
)


# ── Helpers ────────────────────────────────────────────────────────────────

def _load_tidy() -> pd.DataFrame:
    if not FACTORS_TIDY.exists():
        pytest.skip("factors_tidy.parquet not found — run the pipeline first.")
    return pd.read_parquet(FACTORS_TIDY)


def _load_wide() -> pd.DataFrame:
    if not FACTORS_WIDE.exists():
        pytest.skip("factors_wide.csv not found — run the pipeline first.")
    return pd.read_csv(FACTORS_WIDE)


def _load_places() -> pd.DataFrame:
    if not PLACES_CSV.exists():
        pytest.skip("places.csv not found — create it from the coverage check notebook.")
    return pd.read_csv(PLACES_CSV, dtype=str)


# ── Schema tests ───────────────────────────────────────────────────────────

class TestSchema:
    def test_tidy_required_columns(self):
        tidy = _load_tidy()
        required = ["place_id", "year", "factor", "value_raw", "is_imputed",
                    "is_inherited", "series_break", "gap_flag", "source_id"]
        for col in required:
            assert col in tidy.columns, f"Missing column: {col}"

    def test_places_required_columns(self):
        places = _load_places()
        required = ["place_id", "place_name", "place_type", "state_name", "region"]
        for col in required:
            assert col in places.columns, f"Missing column: {col}"

    def test_place_type_values(self):
        places = _load_places()
        assert set(places["place_type"].unique()).issubset({"state", "city"})


# ── Range tests ────────────────────────────────────────────────────────────

class TestRanges:
    def test_no_negative_pm25(self):
        tidy = _load_tidy()
        air = tidy[tidy["factor"] == "air_quality"]
        neg = air["value_raw"].lt(0).sum()
        assert neg == 0, f"{neg} rows have negative PM2.5."

    def test_normalized_scores_in_range(self):
        tidy = _load_tidy()
        normed = tidy["value_norm"].dropna()
        if normed.empty:
            pytest.skip("value_norm not yet computed — run scoring module.")
        assert (normed >= SCORE_MIN).all(), "Some scores < 0"
        assert (normed <= SCORE_MAX).all(), "Some scores > 100"

    def test_health_index_in_range(self):
        tidy = _load_tidy()
        health = tidy[tidy["factor"] == "health"]
        if health.empty:
            pytest.skip("No health rows yet.")
        values = pd.to_numeric(health["value_raw"], errors="coerce").dropna()
        assert (values >= 0).all(), "Some health index values < 0"
        assert (values <= 100).all(), "Some health index values > 100"

    def test_crime_rate_non_negative(self):
        tidy = _load_tidy()
        safety = tidy[tidy["factor"] == "safety"]
        values = pd.to_numeric(safety["value_raw"], errors="coerce").dropna()
        assert (values >= 0).all()


# ── Uniqueness tests ───────────────────────────────────────────────────────

class TestUniqueness:
    def test_no_duplicate_place_year_factor(self):
        tidy = _load_tidy()
        dupes = tidy.duplicated(subset=["place_id", "year", "factor"]).sum()
        assert dupes == 0, f"{dupes} duplicate (place_id, year, factor) rows."

    def test_no_duplicate_place_ids_in_master(self):
        places = _load_places()
        dupes = places["place_id"].duplicated().sum()
        assert dupes == 0, f"{dupes} duplicate place_ids in places.csv."


# ── Referential integrity ──────────────────────────────────────────────────

class TestReferential:
    def test_all_tidy_place_ids_in_master(self):
        tidy   = _load_tidy()
        places = _load_places()
        valid_ids = set(places["place_id"].tolist())
        unknown   = set(tidy["place_id"].unique()) - valid_ids
        assert not unknown, f"Unknown place_ids in tidy: {unknown}"


# ── Coverage tests ─────────────────────────────────────────────────────────

class TestCoverage:
    def test_active_factor_rows_use_only_available_non_placeholder_factors(self):
        tidy   = _load_tidy()
        assert not tidy.empty, "No active factor rows are available."
        allowed = {
            "air_quality",
            "cost_of_living",
            "safety",
            "health",
            "per_capita_nsdp_constant",
            "unemployment_rate",
            "water_quality",
        }
        assert set(tidy["factor"].dropna().unique()) <= allowed

    def test_air_quality_cities_have_data(self):
        tidy = _load_tidy()
        air  = tidy[tidy["factor"] == "air_quality"]
        assert not air.empty, "No air quality rows in tidy table."


# ── Series break flags ─────────────────────────────────────────────────────

class TestSeriesBreaks:
    def test_series_break_column_is_boolean(self):
        tidy = _load_tidy()
        if "series_break" in tidy.columns:
            assert tidy["series_break"].dtype in (bool, object, "bool"), \
                "series_break should be boolean."

    def test_cost_of_living_rows_have_gap_flags(self):
        """Cost-of-living rows are estimated and must carry a provenance gap flag."""
        tidy = _load_tidy()
        col_rows = tidy[tidy["factor"] == "cost_of_living"]
        if col_rows.empty:
            pytest.skip("No cost_of_living rows yet.")
        has_flag = col_rows["gap_flag"].fillna("").astype(str).str.len().gt(0)
        assert has_flag.all(), "Some cost_of_living rows are missing a gap_flag."

    def test_water_quality_rows_have_gap_flags(self):
        tidy = _load_tidy()
        water_rows = tidy[tidy["factor"] == "water_quality"]
        if water_rows.empty:
            pytest.skip("No water_quality rows yet.")
        has_flag = water_rows["gap_flag"].fillna("").astype(str).str.len().gt(0)
        assert has_flag.all(), "Some water_quality rows are missing a gap_flag."
