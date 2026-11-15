"""Tests for data-driven normalization bound calibration."""

from __future__ import annotations

import pandas as pd
import pytest

from src.scoring.calibrate_bounds import (
    build_report,
    calibrate,
    configured_bounds,
    factor_columns,
    snapshot_frame,
)
from src.utils.constants import FACTORS_WIDE


@pytest.fixture
def factors() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "place_id": ["A", "A", "B", "B"],
            "year": [2020, 2021, 2020, 2021],
            "air_quality": [10.0, None, 30.0, 50.0],
            "safety": [100.0, 200.0, 300.0, 400.0],
        }
    )


@pytest.fixture
def config() -> dict:
    return {
        "factors": {
            "air_quality": {
                "column": "air_quality",
                "direction": "lower_is_better",
                "bounds": [0, 100],
            },
            "safety": {
                "column": "safety",
                "direction": "lower_is_better",
                "bounds": [50, 500],
            },
        }
    }


def test_factor_columns_include_single_and_multi_indicator_factors(config: dict) -> None:
    multi = {
        "factors": {
            "economy": {
                "indicators": [
                    {"column": "nsdp", "bounds": [0, 1]},
                    {"column": "unemployment", "bounds": [0, 1]},
                ]
            }
        }
    }
    assert factor_columns(config) == [("air_quality", "air_quality"), ("safety", "safety")]
    assert factor_columns(multi) == [("economy", "nsdp"), ("economy", "unemployment")]


def test_snapshot_keeps_latest_non_null_value_per_column(factors: pd.DataFrame) -> None:
    snapshot = snapshot_frame(factors, year=2021)

    assert list(snapshot["place_id"]) == ["A", "B"]
    air = snapshot.set_index("place_id")["air_quality"]
    # Place A has no 2021 air reading, so its 2020 value survives the snapshot.
    assert air.loc["A"] == 10.0
    assert air.loc["B"] == 50.0


def test_snapshot_respects_requested_year(factors: pd.DataFrame) -> None:
    snapshot = snapshot_frame(factors, year=2020)
    assert snapshot.set_index("place_id")["safety"].loc["B"] == 300.0


def test_calibrate_uses_requested_quantiles(factors: pd.DataFrame, config: dict) -> None:
    bounds = calibrate(factors, config, year=2021, lower_quantile=0.0, upper_quantile=1.0)

    air = bounds.loc[bounds["column"] == "air_quality"].iloc[0]
    assert air["calibrated_lo"] == 10.0
    assert air["calibrated_hi"] == 50.0
    assert air["n"] == 2


def test_calibrate_all_years_uses_every_observation(factors: pd.DataFrame, config: dict) -> None:
    bounds = calibrate(factors, config, all_years=True, lower_quantile=0.0, upper_quantile=1.0)
    air = bounds.loc[bounds["column"] == "air_quality"].iloc[0]
    assert air["n"] == 3
    assert air["calibrated_lo"] == 10.0
    assert air["calibrated_hi"] == 50.0


def test_configured_bounds_reads_indicator_bounds(config: dict) -> None:
    assert configured_bounds(config, "air_quality", "air_quality") == (0.0, 100.0)
    assert configured_bounds(config, "missing", "missing") == (None, None)


def test_invalid_quantiles_rejected(factors: pd.DataFrame, config: dict) -> None:
    with pytest.raises(ValueError):
        calibrate(factors, config, lower_quantile=0.9, upper_quantile=0.1)


def test_report_lists_configured_and_calibrated_bounds(factors: pd.DataFrame, config: dict) -> None:
    bounds = calibrate(factors, config, year=2021, lower_quantile=0.0, upper_quantile=1.0)
    report = build_report(bounds, scope="snapshot", year=2021, lower_quantile=0.0, upper_quantile=1.0)
    assert "Normalization Bounds Calibration" in report
    assert "air_quality" in report
    assert "Review notes" in report


@pytest.mark.skipif(not FACTORS_WIDE.exists(), reason="processed factor table is unavailable")
def test_configured_bounds_match_calibration_snapshot() -> None:
    """The committed config must reproduce from the committed processed data."""
    import yaml

    from src.scoring.calibrate_bounds import DEFAULT_LOWER_QUANTILE, DEFAULT_UPPER_QUANTILE
    from src.utils.constants import SCORING_CONFIG

    factors = pd.read_csv(FACTORS_WIDE)
    config = yaml.safe_load(SCORING_CONFIG.read_text(encoding="utf-8"))
    baseline = int(pd.to_numeric(factors["year"], errors="coerce").max())

    bounds = calibrate(
        factors,
        config,
        year=baseline,
        lower_quantile=DEFAULT_LOWER_QUANTILE,
        upper_quantile=DEFAULT_UPPER_QUANTILE,
    )

    for row in bounds.itertuples(index=False):
        assert row.configured_lo == pytest.approx(row.calibrated_lo, abs=0.01), row.column
        assert row.configured_hi == pytest.approx(row.calibrated_hi, abs=0.01), row.column
