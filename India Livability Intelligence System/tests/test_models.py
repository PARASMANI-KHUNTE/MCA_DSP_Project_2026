"""
tests/test_models.py
─────────────────────
Unit tests for the ML models (M10.3):
  - Trend projection (linear regression)
  - K-Means clustering
"""

import numpy as np
import pandas as pd
import pytest

from src.models.trend import fit_trend, TrendResult
from src.models.clustering import run_clustering
from src.utils.constants import MIN_TREND_POINTS, SCORE_MIN, SCORE_MAX


# ── Trend tests ────────────────────────────────────────────────────────────

class TestFitTrend:

    def _make_trend(self, n=7, slope=2.0, intercept=50.0, seed=0):
        """Create a synthetic linear time series."""
        rng = np.random.default_rng(seed)
        years = np.arange(2016, 2016 + n, dtype=float)
        scores = intercept + slope * np.arange(n) + rng.normal(0, 0.5, n)
        return years, scores

    def test_returns_trend_result(self):
        years, scores = self._make_trend()
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert isinstance(result, TrendResult)

    def test_slope_sign_correct_positive(self):
        """Positive trend → positive slope."""
        years, scores = self._make_trend(slope=3.0)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.slope > 0

    def test_slope_sign_correct_negative(self):
        """Negative trend → negative slope."""
        years, scores = self._make_trend(slope=-3.0)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.slope < 0

    def test_intercept_near_expected(self):
        """Intercept should be close to the base value."""
        years, scores = self._make_trend(n=10, slope=0.0, intercept=60.0, seed=99)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        # With perfect data and zero slope, intercept ≈ 60
        assert abs(result.intercept + result.slope * years[0] - 60.0) < 5.0

    def test_insufficient_data_label(self):
        """Fewer than MIN_TREND_POINTS → 'Insufficient data'."""
        years = np.array([2020.0, 2021.0, 2022.0])   # only 3 points
        scores = np.array([50.0, 52.0, 54.0])
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.outlook == "Insufficient data"
        assert result.projections.empty

    def test_projections_clipped_to_valid_range(self):
        """Projection values must stay within [SCORE_MIN, SCORE_MAX]."""
        # Create a very steep upward trend that would overshoot 100
        years = np.arange(2015, 2022, dtype=float)
        scores = 50 + 8 * np.arange(7, dtype=float)   # reaches ~98 at last point
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        if not result.projections.empty:
            assert (result.projections["yhat"]  >= SCORE_MIN).all()
            assert (result.projections["yhat"]  <= SCORE_MAX).all()
            assert (result.projections["lower"] >= SCORE_MIN).all()
            assert (result.projections["upper"] <= SCORE_MAX).all()

    def test_projection_has_10_rows(self):
        """Should project exactly 10 years ahead."""
        years, scores = self._make_trend(n=7)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert len(result.projections) == 10

    def test_projection_years_are_future(self):
        """Projection years must be strictly after the last observed year."""
        years, scores = self._make_trend(n=7)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        last_obs = int(years.max())
        assert (result.projections["year"] > last_obs).all()

    def test_no_data_leakage_from_future(self):
        """
        Verify time-based split integrity:
        training years must all be <= split year.
        """
        all_years = np.arange(2015, 2025, dtype=float)
        scores = 50 + 1.5 * np.arange(10, dtype=float)
        split_year = 2019.0

        train_years  = all_years[all_years <= split_year]
        train_scores = scores[all_years <= split_year]

        result = fit_trend(train_years, train_scores, "PLACE_A", "air_quality")
        # No future year should appear in training data
        assert (train_years <= split_year).all()
        assert result.n_points == int((split_year - 2015) + 1)

    def test_nan_scores_are_dropped(self):
        """NaN score values should be silently dropped before fitting."""
        years  = np.array([2015.0, 2016.0, 2017.0, 2018.0, 2019.0, 2023.0, 2024.0])
        scores = np.array([50.0, np.nan, 54.0, 56.0, 58.0, 62.0, 64.0])
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.n_points == 6   # one NaN dropped
        assert result.outlook != "Insufficient data"

    def test_series_break_flag_propagated(self):
        years, scores = self._make_trend(n=7)
        result = fit_trend(years, scores, "PLACE_A", "safety",
                           series_break_flag=True, gap_flag="ipc_bns_break")
        assert result.series_break_flag is True
        assert "ipc_bns_break" in result.gap_flag

    def test_improving_label(self):
        """Strongly positive slope with many points → 'Improving'."""
        years = np.arange(2015, 2025, dtype=float)
        scores = 30 + 5 * np.arange(10, dtype=float)    # very clean positive trend
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.outlook == "Improving"

    def test_declining_label(self):
        """Strongly negative slope → 'Declining'."""
        years = np.arange(2015, 2025, dtype=float)
        scores = 80 - 5 * np.arange(10, dtype=float)
        result = fit_trend(years, scores, "PLACE_A", "air_quality")
        assert result.outlook == "Declining"


# ── Clustering tests ───────────────────────────────────────────────────────

class TestClustering:

    def _make_scores(self, n_places=20, n_factors=4, seed=42):
        rng = np.random.default_rng(seed)
        data = {"place_id": [f"P{i}" for i in range(n_places)]}
        factor_cols = []
        for i in range(n_factors):
            col = f"factor_{i}_score"
            data[col] = rng.uniform(0, 100, n_places)
            factor_cols.append(col)
        return pd.DataFrame(data), factor_cols

    def test_returns_three_dataframes(self):
        df, factor_cols = self._make_scores()
        clusters_df, profiles_df, metrics_df = run_clustering(df, factor_cols, k=3)
        assert isinstance(clusters_df, pd.DataFrame)
        assert isinstance(profiles_df, pd.DataFrame)

    def test_cluster_ids_are_contiguous(self):
        df, factor_cols = self._make_scores()
        clusters_df, _, _ = run_clustering(df, factor_cols, k=3)
        unique_ids = sorted(clusters_df["cluster_id"].unique())
        assert unique_ids == list(range(3))

    def test_all_places_assigned(self):
        df, factor_cols = self._make_scores(n_places=15)
        clusters_df, _, _ = run_clustering(df, factor_cols, k=3)
        assert len(clusters_df) == 15

    def test_fixed_seed_gives_stable_labels(self):
        """Same data + same seed → same cluster assignments."""
        df, factor_cols = self._make_scores(n_places=30)
        c1, _, _ = run_clustering(df, factor_cols, k=3, seed=42)
        c2, _, _ = run_clustering(df, factor_cols, k=3, seed=42)
        pd.testing.assert_frame_equal(
            c1.sort_values("place_id").reset_index(drop=True),
            c2.sort_values("place_id").reset_index(drop=True),
        )

    def test_tier_labels_are_non_empty_strings(self):
        df, factor_cols = self._make_scores()
        clusters_df, _, _ = run_clustering(df, factor_cols, k=3)
        assert clusters_df["tier_label"].notna().all()
        assert (clusters_df["tier_label"].str.len() > 0).all()

    def test_auto_k_selection(self):
        """k=None should auto-select via silhouette without error."""
        df, factor_cols = self._make_scores(n_places=40)
        from src.utils.constants import KMEANS_K_RANGE
        clusters_df, _, metrics_df = run_clustering(
            df, factor_cols, k=None, k_range=range(2, 5)
        )
        assert len(clusters_df) == 40
        assert not metrics_df.empty
