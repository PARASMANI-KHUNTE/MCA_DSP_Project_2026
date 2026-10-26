"""
tests/test_scoring.py
──────────────────────
Unit tests for the scoring engine (M10.2).
Run with:  pytest tests/test_scoring.py -v
"""

import numpy as np
import pandas as pd
import pytest

from src.scoring.scoring import (
    normalize_value,
    normalize_series,
    compute_scores,
    load_config,
)


# ── normalize_value ────────────────────────────────────────────────────────

class TestNormalizeValue:
    def test_higher_is_better_at_lo(self):
        assert normalize_value(10, lo=10, hi=100, direction="higher_is_better") == pytest.approx(0.0)

    def test_higher_is_better_at_hi(self):
        assert normalize_value(100, lo=10, hi=100, direction="higher_is_better") == pytest.approx(100.0)

    def test_lower_is_better_at_lo(self):
        """Lower bound → best score (100) for lower_is_better."""
        assert normalize_value(10, lo=10, hi=100, direction="lower_is_better") == pytest.approx(100.0)

    def test_lower_is_better_at_hi(self):
        """Upper bound → worst score (0) for lower_is_better."""
        assert normalize_value(100, lo=10, hi=100, direction="lower_is_better") == pytest.approx(0.0)

    def test_higher_is_better_midpoint(self):
        assert normalize_value(55, lo=10, hi=100, direction="higher_is_better") == pytest.approx(50.0)

    def test_lower_is_better_midpoint(self):
        assert normalize_value(55, lo=10, hi=100, direction="lower_is_better") == pytest.approx(50.0)

    def test_clips_below_lo(self):
        """Values below lo are clipped to 0 (higher_is_better)."""
        assert normalize_value(-5, lo=10, hi=100, direction="higher_is_better") == pytest.approx(0.0)

    def test_clips_above_hi(self):
        """Values above hi are clipped to 100 (higher_is_better)."""
        assert normalize_value(200, lo=10, hi=100, direction="higher_is_better") == pytest.approx(100.0)

    def test_direction_inversion_consistency(self):
        """lower_is_better score = 100 - higher_is_better score."""
        x = 40
        hi_score = normalize_value(x, 10, 100, "higher_is_better")
        lo_score = normalize_value(x, 10, 100, "lower_is_better")
        assert hi_score + lo_score == pytest.approx(100.0)

    def test_degenerate_bounds(self):
        """If lo == hi, return 50 without error."""
        assert normalize_value(50, lo=50, hi=50, direction="higher_is_better") == pytest.approx(50.0)

    def test_unknown_direction_raises(self):
        with pytest.raises(ValueError, match="Unknown direction"):
            normalize_value(50, 10, 100, direction="sideways")


# ── normalize_series ───────────────────────────────────────────────────────

class TestNormalizeSeries:
    def test_series_lower_is_better(self):
        s = pd.Series([10.0, 55.0, 100.0])
        result = normalize_series(s, lo=10, hi=100, direction="lower_is_better")
        expected = pd.Series([100.0, 50.0, 0.0])
        pd.testing.assert_series_equal(result, expected, check_names=False)

    def test_series_preserves_nan(self):
        s = pd.Series([10.0, np.nan, 100.0])
        result = normalize_series(s, lo=10, hi=100, direction="higher_is_better")
        assert np.isnan(result.iloc[1])

    def test_series_clips(self):
        s = pd.Series([-5.0, 200.0])
        result = normalize_series(s, lo=10, hi=100, direction="higher_is_better")
        assert result.iloc[0] == pytest.approx(0.0)
        assert result.iloc[1] == pytest.approx(100.0)


# ── compute_scores ─────────────────────────────────────────────────────────

def _make_factors_wide(n=3):
    """Build a minimal factors_wide DataFrame for testing."""
    return pd.DataFrame({
        "place_id": [f"PLACE_{i}" for i in range(n)],
        "year": [2023] * n,
        "pm25_mean": [30.0, 60.0, 90.0],
        "crime_rate_per_lakh": [200.0, 400.0, 300.0],
        "infant_mortality_rate": [20.0, 35.0, 10.0],
        "per_capita_nsdp_constant": [100_000, 200_000, 150_000],
        "unemployment_rate": [5.0, 8.0, 4.0],
    })


def _make_config():
    """Minimal config matching the test data columns."""
    return {
        "factors": {
            "air_quality": {
                "column": "pm25_mean",
                "direction": "lower_is_better",
                "bounds": [10, 150],
            },
            "safety": {
                "column": "crime_rate_per_lakh",
                "direction": "lower_is_better",
                "bounds": [100, 600],
            },
            "health": {
                "column": "infant_mortality_rate",
                "direction": "lower_is_better",
                "bounds": [5, 50],
            },
            "economy": {
                "indicators": [
                    {
                        "column": "per_capita_nsdp_constant",
                        "direction": "higher_is_better",
                        "bounds": [50_000, 350_000],
                    },
                    {
                        "column": "unemployment_rate",
                        "direction": "lower_is_better",
                        "bounds": [2, 15],
                    },
                ]
            },
        }
    }


class TestComputeScores:
    def test_returns_dataframe(self):
        df = _make_factors_wide()
        cfg = _make_config()
        result = compute_scores(df, cfg, {"air_quality": 1.0}, year=2023)
        assert isinstance(result, pd.DataFrame)

    def test_scores_in_range(self):
        df = _make_factors_wide()
        cfg = _make_config()
        weights = {"air_quality": 0.3, "safety": 0.3, "health": 0.2, "economy": 0.2}
        result = compute_scores(df, cfg, weights, year=2023)
        assert (result["score"].dropna() >= 0).all()
        assert (result["score"].dropna() <= 100).all()

    def test_weights_are_normalized(self):
        """Weights that don't sum to 1 should still produce valid scores."""
        df = _make_factors_wide()
        cfg = _make_config()
        result = compute_scores(df, cfg, {"air_quality": 40, "safety": 60}, year=2023)
        assert not result["score"].isna().any()

    def test_all_weight_on_one_factor_gives_correct_ranking(self):
        """All weight on air quality → rank by air score alone."""
        df = _make_factors_wide()
        # pm25_mean: [30, 60, 90] → lower_is_better → scores [~86, ~64, ~43]
        # So PLACE_0 should rank 1st (least polluted)
        cfg = _make_config()
        result = compute_scores(df, cfg, {"air_quality": 1.0}, year=2023)
        assert result.iloc[0]["place_id"] == "PLACE_0"

    def test_missing_factor_sets_partial_data(self):
        """When a factor column is missing, partial_data should be True."""
        df = _make_factors_wide().drop(columns=["pm25_mean"])
        cfg = _make_config()
        result = compute_scores(df, cfg, {"air_quality": 0.5, "safety": 0.5}, year=2023)
        assert result["partial_data"].all()

    def test_determinism(self):
        """Same inputs always produce same outputs."""
        df = _make_factors_wide()
        cfg = _make_config()
        weights = {"air_quality": 0.4, "safety": 0.3, "health": 0.3}
        r1 = compute_scores(df, cfg, weights, year=2023)
        r2 = compute_scores(df, cfg, weights, year=2023)
        pd.testing.assert_frame_equal(r1, r2)

    def test_unknown_year_raises(self):
        df = _make_factors_wide()
        cfg = _make_config()
        with pytest.raises(ValueError, match="No data for year"):
            compute_scores(df, cfg, {"air_quality": 1.0}, year=1900)

    def test_rank_column_exists_and_starts_at_1(self):
        df = _make_factors_wide()
        cfg = _make_config()
        result = compute_scores(df, cfg, {"air_quality": 1.0}, year=2023)
        assert result["rank"].min() == 1
