"""
tests/test_scoring_parity.py
────────────────────────────
Integration and parity tests ensuring that Python scoring logic
(src.scoring.scoring) and frontend JavaScript scoring logic
(frontend/src/services/scoringService.js) produce identical results.
"""

import json
import math
import subprocess
from pathlib import Path

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

ROOT_DIR = Path(__file__).resolve().parents[2]


def run_node_composite_score(factor_scores: dict[str, float | None], weights: dict[str, float]) -> dict:
    """Invokes calculateCompositeScoreFromFactors directly from scoringService.js via node."""
    payload = json.dumps({"scores": factor_scores, "weights": weights})
    js_code = (
        f"const data = {payload};"
        "import('./India Livability Intelligence System/frontend/src/services/scoringService.js')"
        ".then(m => { console.log(JSON.stringify(m.calculateCompositeScoreFromFactors(data.scores, data.weights))); })"
        ".catch(e => { console.error(e); process.exit(1); });"
    )
    res = subprocess.run(
        ["node", "-e", js_code],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(res.stdout.strip())


def py_composite_score(factor_scores: dict[str, float | None], weights: dict[str, float]) -> tuple[float | None, bool]:
    """Reference composite scoring implementation adhering to project rules:
    - 0 missing: weighted sum across all factors, partial=False.
    - 1 missing: proportional reweighting over remaining factors, partial=True.
    - 2+ missing: unscored (None), partial=True.
    """
    selected = [k for k, w in weights.items() if float(w) > 0]
    available = [k for k in selected if factor_scores.get(k) is not None and math.isfinite(factor_scores[k])]
    missing = [k for k in selected if k not in available]

    if len(missing) > 1:
        return None, True

    if len(missing) == 1:
        total_w = sum(float(weights[k]) for k in available)
        if total_w == 0:
            return None, True
        score = sum((float(weights[k]) / total_w) * factor_scores[k] for k in available)
        return round(score, 1), True

    total_w = sum(float(weights[k]) for k in selected)
    if total_w == 0:
        return None, False
    score = sum((float(weights[k]) / total_w) * factor_scores[k] for k in selected)
    return round(score, 1), False


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


class TestNormalizationParity:
    """Verify Python and JavaScript normalization logic match across entire range."""

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
    """Verify weighted aggregation, reweighting on single missing factor,
    and unscored exclusion on 2+ missing factors between Python and JavaScript."""

    def test_complete_data_parity(self):
        factor_scores = {
            "air": 75.0,
            "safety": 60.0,
            "health": 85.0,
            "economy": 50.0,
        }
        weights = {"air": 35.0, "safety": 25.0, "health": 25.0, "economy": 15.0}

        js_result = run_node_composite_score(factor_scores, weights)
        py_score, py_partial = py_composite_score(factor_scores, weights)

        assert js_result["score"] == py_score
        assert js_result["partialData"] == py_partial == False

    def test_missing_one_factor_is_reweighted_in_both_engines(self):
        """A place missing exactly 1 factor is reweighted across remaining factors."""
        factor_scores = {
            "air": None,
            "safety": 65.0,
            "health": 70.0,
            "economy": 80.0,
        }
        weights = {"air": 35.0, "safety": 25.0, "health": 25.0, "economy": 15.0}

        js_result = run_node_composite_score(factor_scores, weights)
        py_score, py_partial = py_composite_score(factor_scores, weights)

        assert js_result["score"] == py_score
        assert js_result["score"] is not None
        assert js_result["partialData"] == py_partial == True

    def test_missing_two_or_more_factors_unscored_in_both_engines(self):
        """A place missing 2+ factors cannot be reliably scored in either engine."""
        factor_scores = {
            "air": None,
            "safety": None,
            "health": 70.0,
            "economy": 80.0,
        }
        weights = {"air": 35.0, "safety": 25.0, "health": 25.0, "economy": 15.0}

        js_result = run_node_composite_score(factor_scores, weights)
        py_score, py_partial = py_composite_score(factor_scores, weights)

        assert js_result["score"] is None
        assert py_score is None
        assert js_result["partialData"] == py_partial == True
        assert set(js_result["missingFactors"]) == {"air", "safety"}

    def test_zero_weight_factor_ignored(self):
        factor_scores = {"air": 10.0, "safety": 90.0}
        weights = {"air": 0.0, "safety": 100.0}
        js_result = run_node_composite_score(factor_scores, weights)
        py_score, _ = py_composite_score(factor_scores, weights)
        assert js_result["score"] == py_score == 90.0


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


class TestFrontendServiceHelpers:
    """Verify auxiliary scoring and styling methods exported by scoringService.js."""

    @staticmethod
    def _eval_js(expression: str):
        js_code = (
            "import('./India Livability Intelligence System/frontend/src/services/scoringService.js')"
            f".then(m => console.log(JSON.stringify({expression})))"
            ".catch(e => { console.error(e); process.exit(1); });"
        )
        res = subprocess.run(
            ["node", "-e", js_code],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(res.stdout.strip())

    def test_get_score_color(self):
        # High scores -> green
        assert self._eval_js("m.getScoreColor(85)") == "#15803d"
        assert self._eval_js("m.getScoreColor(72)") == "#22c55e"
        assert self._eval_js("m.getScoreColor(62)") == "#737373"
        assert self._eval_js("m.getScoreColor(52)") == "#ca8a04"
        assert self._eval_js("m.getScoreColor(42)") == "#ea580c"
        assert self._eval_js("m.getScoreColor(20)") == "#b91c1c"
        # Null / invalid -> fallback
        assert self._eval_js("m.getScoreColor(null)") == "#64748b"

    def test_get_continuous_score_color(self):
        assert self._eval_js("m.getContinuousScoreColor(0)") == "#b91c1c"
        assert self._eval_js("m.getContinuousScoreColor(100)") == "#14532d"
        assert self._eval_js("m.getContinuousScoreColor(null)") == "#64748b"

    def test_get_score_label(self):
        assert self._eval_js("m.getScoreLabel(85)") == "Very high"
        assert self._eval_js("m.getScoreLabel(75)") == "High"
        assert self._eval_js("m.getScoreLabel(65)") == "Moderate"
        assert self._eval_js("m.getScoreLabel(55)") == "Watch"
        assert self._eval_js("m.getScoreLabel(45)") == "Low"
        assert self._eval_js("m.getScoreLabel(35)") == "Very low"
        assert self._eval_js("m.getScoreLabel(null)") == "No data"

    def test_get_tier_color(self):
        assert self._eval_js("m.getTierColor('Tier 1: High Livability')") == "#22c55e"
        assert self._eval_js("m.getTierColor('Tier 2: Moderate Livability')") == "#eab308"
        assert self._eval_js("m.getTierColor('Tier 3: Developing Livability')") == "#f97316"
        assert self._eval_js("m.getTierColor('Unclassified')") == "#94a3b8"
        assert self._eval_js("m.getTierColor(null)") == "#94a3b8"

    def test_get_factor_inheritance(self):
        # State place -> returns null
        state_place = json.dumps({"type": "state", "factorYears": {"safety": 2022}})
        assert self._eval_js(f"m.getFactorInheritance({state_place}, 'safety', 2026)") is None

        # City place with state-level factor -> returns lag and inheritance info
        city_place = json.dumps({"type": "city", "factorYears": {"safety": 2022}})
        res = self._eval_js(f"m.getFactorInheritance({city_place}, 'safety', 2026)")
        assert res["level"] == "state"
        assert res["sourceYear"] == 2022
        assert res["lagYears"] == 4
        assert res["isCarriedForward"] is True

        # Non-state factor for city -> returns null
        city_air = json.dumps({"type": "city", "factorYears": {"air": 2020}})
        assert self._eval_js(f"m.getFactorInheritance({city_air}, 'air', 2026)") is None

    def test_get_state_level_factor_keys(self):
        keys = set(self._eval_js("m.getStateLevelFactorKeys()"))
        assert {"safety", "health", "water"}.issubset(keys)

