"""
tests/conftest.py
──────────────────
Shared pytest fixtures for the whole test suite.
"""

import numpy as np
import pandas as pd
import pytest


@pytest.fixture()
def sample_factors_wide():
    """Minimal factors_wide DataFrame for scoring tests."""
    return pd.DataFrame({
        "place_id": ["IN-MH-MUM", "IN-DL-DEL", "IN-KA-BLR", "IN-WB-KOL"],
        "year": [2023, 2023, 2023, 2023],
        "pm25_mean": [35.0, 90.0, 25.0, 55.0],
        "crime_rate_per_lakh": [250.0, 450.0, 200.0, 350.0],
        "infant_mortality_rate": [18.0, 28.0, 12.0, 30.0],
        "per_capita_nsdp_constant": [200_000, 180_000, 220_000, 130_000],
        "unemployment_rate": [4.5, 6.0, 3.5, 7.0],
    })


@pytest.fixture()
def sample_config():
    """Minimal scoring config matching sample_factors_wide."""
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


@pytest.fixture()
def balanced_weights():
    return {"air_quality": 0.30, "safety": 0.25, "health": 0.25, "economy": 0.20}


@pytest.fixture()
def sample_scores_long():
    """scores_long DataFrame for trend tests."""
    rng = np.random.default_rng(42)
    places = ["IN-MH", "IN-DL", "IN-KA"]
    years = list(range(2015, 2020)) + [2023, 2024]
    rows = []
    for p in places:
        base = rng.uniform(40, 80)
        trend = rng.uniform(-2, 3)
        for i, y in enumerate(years):
            rows.append({
                "place_id": p,
                "year": y,
                "factor": "air_quality",
                "score": float(np.clip(base + trend * i + rng.normal(0, 2), 0, 100)),
                "gap_flag": "covid_year" if y == 2020 else "",
                "series_break": False,
            })
    return pd.DataFrame(rows)
