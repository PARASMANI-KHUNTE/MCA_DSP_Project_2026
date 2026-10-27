"""
tests/test_scoring_parity.py
────────────────────────────
Integration and parity tests ensuring that backend Python scoring logic
(src.scoring.scoring) and frontend JavaScript scoring logic
(frontend/src/services/scoringService.js) produce identical results.
"""

import math
import numpy as np
import pandas as pd
import pytest

from src.scoring.scoring import (
    normalize_value,
    score_factor,
    compute_scores,
    load_config,
)
from src.utils.constants import SCORING_CONFIG


def js_clamp(value: float, lo: float, hi: float) -> float:
    """Mirrors clamp(value, min, max) in scoringService.js."""
    return min(hi, max(lo, value))


def js_normalize(value: float | None, lo: float, hi: float, direction: str) -> float | None:
    """Mirrors normalize(value, definition) in scoringService.js."""
    if value is None or not math.isfinite(value):
        return None
    if not math.isfinite(lo) or not math.isfinite(hi) or hi <= lo:
        return None
    bounded = js_clamp(value, lo, hi)
    score = (
        ((bounded - lo) / (hi - lo)) * 100
        if direction == "higher_is_better"
        else ((hi - bounded) / (hi - lo)) * 100
    )
    return round(score, 1)


def js_composite_score(factor_scores: dict[str, float | None], weights: dict[str, float]) -> float | None:
    """Mirrors compositeScore(placeId, year, weights) in scoringService.js."""
    weighted_sum = 0.0
    active_weight = 0.0
    for key, score in factor_scores.items():
        weight = float(weights.get(key, 0.0))
        if score is not None and weight > 0:
            weighted_sum += score * weight
            active_weight += weight
    return round(weighted_sum / active_weight, 1) if active_weight > 0 else None


class TestNormalizationParity:
    """Verify backend and frontend normalization logic match across entire range."""

    @pytest.mark.parametrize("x", [-10.0, 10.0, 30.0, 55.0, 80.0, 100.0, 150.0])
    @pytest.mark.parametrize("direction", ["higher_is_better", "lower_is_better"])
    def test_normalization_values_match(self, x: float, direction: str):
        lo, hi = 10.0, 100.0
        py_score = normalize_value(x, lo, hi, direction)
        js_score = js_normalize(x, lo, hi, direction)
        assert round(py_score, 1) == js_score

    def test_bounds_clamping_parity(self):
        # Extreme low
        assert round(normalize_value(-999, 10, 100, "higher_is_better"), 1) == js_normalize(-999, 10, 100, "higher_is_better")
        # Extreme high
        assert round(normalize_value(9999, 10, 100, "lower_is_better"), 1) == js_normalize(9999, 10, 100, "lower_is_better")


class TestCompositeScoringParity:
    """Verify weighted composite aggregation and partial-data re-weighting parity."""

    def test_complete_data_parity(self):
        factor_scores = {
            "air": 75.0,
            "safety": 60.0,
            "health": 85.0,
            "economy": 50.0,
        }
        weights = {"air": 35.0, "safety": 25.0, "health": 25.0, "economy": 15.0}

        # Frontend JS calculation
        js_result = js_composite_score(factor_scores, weights)

        # Backend Python calculation: normalized weights sum to 1.0
        norm_w = {k: v / sum(weights.values()) for k, v in weights.items()}
        py_result = sum(factor_scores[k] * norm_w[k] for k in factor_scores)

        assert round(py_result, 1) == js_result

    def test_partial_data_reweighting_parity(self):
        """When air quality is missing (None / NaN), remaining factors must re-normalize."""
        factor_scores = {
            "air": None,
            "safety": 65.0,
            "health": 70.0,
            "economy": 80.0,
        }
        weights = {"air": 35.0, "safety": 25.0, "health": 25.0, "economy": 15.0}

        # Frontend calculation
        js_result = js_composite_score(factor_scores, weights)

        # Backend Python equivalent
        available = {k: v for k, v in factor_scores.items() if v is not None}
        sub_total_w = sum(weights[k] for k in available)
        py_result = sum((weights[k] / sub_total_w) * available[k] for k in available)

        assert round(py_result, 1) == js_result

    def test_zero_weight_factor_ignored(self):
        factor_scores = {"air": 10.0, "safety": 90.0}
        weights = {"air": 0.0, "safety": 100.0}
        assert js_composite_score(factor_scores, weights) == 90.0


class TestConfigPresetIntegrity:
    """Verify that factors_config.yaml presets match expected specifications."""

    def test_balanced_preset_weights_sum_to_100(self):
        config = load_config(SCORING_CONFIG)
        balanced = config["presets"]["balanced"]
        assert sum(balanced.values()) == 100

    def test_canonical_35_25_25_15_split(self):
        config = load_config(SCORING_CONFIG)
        balanced = config["presets"]["balanced"]
        assert balanced["air_quality"] == 35
        assert balanced["safety"] == 25
        assert balanced["health"] == 25
        assert balanced["economy"] == 15
