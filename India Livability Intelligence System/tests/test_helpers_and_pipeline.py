"""
tests/test_helpers_and_pipeline.py
──────────────────────────────────
Unit tests for data pipeline helper functions (src.utils.helpers),
pipeline build/tidy/wide stages (src.cleaning.run_pipeline),
and frontend static data export transforms (src.export_frontend_data).
"""

from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from src.utils.helpers import (
    align_year,
    financial_year_to_ref,
    label_encode_aqi,
    missing_summary,
    iqr_bounds,
    interpolate_within_place,
    standardize_name,
    apply_name_standardization,
)
from src.cleaning.run_pipeline import (
    stage_missing,
    stage_build_tidy,
    stage_wide,
)
from src.export_frontend_data import (
    _number,
    _boolean,
    _text,
    _clean_place,
    _factor_definitions,
    build_payload,
)
from src.scoring.scoring import load_config
from src.utils.constants import SCORING_CONFIG, PLACES_CSV, FACTORS_TIDY, FACTORS_WIDE


# ── Helpers Tests ──────────────────────────────────────────────────────────

class TestHelpers:
    def test_financial_year_to_ref(self):
        assert financial_year_to_ref("2022-23") == 2022
        assert financial_year_to_ref("2022-2023") == 2022
        assert financial_year_to_ref("2022") == 2022
        assert financial_year_to_ref(2022) == 2022

    def test_align_year(self):
        assert align_year("2022", "calendar") == 2022
        assert align_year(2022, "calendar") == 2022
        assert align_year("2022-23", "financial") == 2022
        assert align_year("2022-23", "survey") == 2022

        with pytest.raises(ValueError, match="Unknown period_type"):
            align_year("2022", "quarterly")

    def test_label_encode_aqi(self):
        s = pd.Series(["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe", "Unknown"])
        encoded = label_encode_aqi(s)
        assert encoded.iloc[0] == 0
        assert encoded.iloc[1] == 1
        assert encoded.iloc[2] == 2
        assert encoded.iloc[3] == 3
        assert encoded.iloc[4] == 4
        assert encoded.iloc[5] == 5
        assert pd.isna(encoded.iloc[6])

    def test_missing_summary(self):
        df = pd.DataFrame({
            "a": [1, 2, None, 4],
            "b": [None, None, None, 1],
            "c": [1, 2, 3, 4],
        })
        summary = missing_summary(df)
        assert list(summary.index) == ["b", "a"]
        assert summary.loc["b", "n_missing"] == 3
        assert summary.loc["b", "pct_missing"] == 0.75
        assert summary.loc["a", "n_missing"] == 1
        assert summary.loc["a", "pct_missing"] == 0.25

    def test_iqr_bounds(self):
        s = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
        lo, hi = iqr_bounds(s, k=1.5)
        # q1=20, q3=40, iqr=20 -> lo = 20 - 30 = -10, hi = 40 + 30 = 70
        assert lo == -10.0
        assert hi == 70.0

    def test_interpolate_within_place_interpolates_under_limit(self):
        # 1 missing out of 5 = 20% <= 20% limit
        df = pd.DataFrame({
            "city": ["CityA"] * 5,
            "year": [2018, 2019, 2020, 2021, 2022],
            "val": [10.0, 20.0, np.nan, 40.0, 50.0],
        })
        res = interpolate_within_place(df, "city", "year", "val", max_missing_pct=0.20)
        assert not res["val"].isna().any()
        assert res.loc[res["year"] == 2020, "val"].iloc[0] == 30.0
        assert res.loc[res["year"] == 2020, "is_imputed"].iloc[0] == True
        assert res.loc[res["year"] == 2019, "is_imputed"].iloc[0] == False

    def test_interpolate_within_place_skips_over_limit(self):
        # 3 missing out of 5 = 60% > 20% limit
        df = pd.DataFrame({
            "city": ["CityA"] * 5,
            "year": [2018, 2019, 2020, 2021, 2022],
            "val": [10.0, np.nan, np.nan, np.nan, 50.0],
        })
        res = interpolate_within_place(df, "city", "year", "val", max_missing_pct=0.20)
        assert res["val"].isna().sum() == 3
        assert (res["is_imputed"] == False).all()

    def test_standardize_name_and_apply(self):
        alias_map = {"bengaluru": "Bengaluru", "bangalore": "Bengaluru"}
        assert standardize_name("Bangalore", alias_map) == "Bengaluru"
        assert standardize_name("Unmapped Place", alias_map, warn=False) == "Unmapped Place"

        df = pd.DataFrame({"city": ["Bangalore", "New Town"]})
        res = apply_name_standardization(df, "city", alias_map, warn=False)
        assert list(res["city"]) == ["Bengaluru", "New Town"]


# ── Pipeline Stages Tests ──────────────────────────────────────────────────

class TestPipelineStages:
    def test_stage_missing_marks_not_imputed(self):
        df = pd.DataFrame({
            "city": ["Delhi", "Mumbai"],
            "year": [2022, 2022],
            "pm25_mean": [80.0, None],
        })
        res = stage_missing(df, "city", "pm25_mean")
        assert "is_imputed" in res.columns
        assert (res["is_imputed"] == False).all()

    def test_stage_build_tidy_and_inheritance(self):
        places = pd.DataFrame([
            {"place_id": "ST-01", "place_name": "State One", "place_type": "state", "state_name": "State One"},
            {"place_id": "CT-01", "place_name": "City One", "place_type": "city", "state_name": "State One"},
        ])
        air = pd.DataFrame([
            {"city": "City One", "year": 2022, "pm25_mean": 45.0, "air_source": "kaggle"},
        ])
        safety = pd.DataFrame([
            {"state_name": "State One", "year": 2022, "crime_rate_per_lakh": 250.0},
        ])
        health = pd.DataFrame([
            {"state_name": "State One", "year": 2021, "health": 65.0},
        ])
        economy = pd.DataFrame([
            {"state_name": "State One", "year": 2022, "per_capita_nsdp_constant": 150000.0, "unemployment_rate": 4.5},
        ])
        col = pd.DataFrame([
            {"city": "City One", "year": 2022, "avg_rent": 12000.0},
        ])
        water = pd.DataFrame([
            {"state_name": "State One", "year": 2021, "water_quality": 75.0},
        ])

        tidy = stage_build_tidy(places, air, safety, health, economy, col, water)
        assert not tidy.empty
        assert "place_id" in tidy.columns
        assert "factor" in tidy.columns

        # Verify city inherited safety, health, economy, water from State One
        city_rows = tidy[tidy["place_id"] == "CT-01"]
        city_factors = set(city_rows["factor"].unique())
        assert "air_quality" in city_factors
        assert "safety" in city_factors
        assert "health" in city_factors
        assert "per_capita_nsdp_constant" in city_factors
        assert "unemployment_rate" in city_factors
        assert "cost_of_living" in city_factors
        assert "water_quality" in city_factors

        # Check inheritance flag
        inherited_safety = city_rows[city_rows["factor"] == "safety"].iloc[0]
        assert inherited_safety["is_inherited"] == True
        assert "inherited" in inherited_safety["source_id"]

    def test_stage_wide(self):
        places = pd.DataFrame([
            {"place_id": "ST-01", "place_name": "State One", "place_type": "state", "state_name": "State One"},
            {"place_id": "CT-01", "place_name": "City One", "place_type": "city", "state_name": "State One"},
        ])
        air = pd.DataFrame([
            {"city": "City One", "year": 2022, "pm25_mean": 45.0, "air_source": "kaggle", "series_break": True, "gap_flag": "method_change"},
        ])
        tidy = stage_build_tidy(places, air, pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame())
        wide = stage_wide(tidy)

        assert "place_id" in wide.columns
        assert "year" in wide.columns
        assert "air_quality" in wide.columns
        assert "air_quality_series_break" in wide.columns
        assert "air_quality_gap_flag" in wide.columns
        assert wide.loc[wide["place_id"] == "CT-01", "air_quality_series_break"].iloc[0] == True
        assert wide.loc[wide["place_id"] == "CT-01", "air_quality_gap_flag"].iloc[0] == "method_change"


# ── Exporter Tests ─────────────────────────────────────────────────────────

class TestExportFrontendData:
    def test_primitive_helpers(self):
        assert _number(42) == 42.0
        assert _number("3.14") == 3.14
        assert _number(np.nan) is None
        assert _number(None) is None

        assert _boolean(True) is True
        assert _boolean("true") is True
        assert _boolean("1") is True
        assert _boolean("yes") is True
        assert _boolean("no") is False
        assert _boolean(False) is False
        assert _boolean(None) is False
        assert _boolean(np.nan) is False

        assert _text("hello") == "hello"
        assert _text(None) == ""
        assert _text(np.nan) == ""

    def test_clean_place(self):
        row = pd.Series({
            "place_id": "IN-KA-BLR",
            "place_name": "Bengaluru",
            "place_type": "city",
            "state_name": "Karnataka",
            "latitude": 12.97,
            "longitude": 77.59,
            "region": "South",
        })
        clean = _clean_place(row)
        assert clean["id"] == "IN-KA-BLR"
        assert clean["name"] == "Bengaluru"
        assert clean["type"] == "city"
        assert clean["lat"] == 12.97
        assert clean["lng"] == 77.59

    def test_factor_definitions(self):
        config = load_config(SCORING_CONFIG)
        defs = _factor_definitions(config)
        assert set(defs.keys()) == {"air", "safety", "health", "economy", "col", "water"}
        assert defs["air"]["direction"] == "lower_is_better"
        assert defs["health"]["direction"] == "higher_is_better"
        assert len(defs["economy"]["indicators"]) == 2

    def test_build_payload(self):
        if not (PLACES_CSV.exists() and FACTORS_TIDY.exists() and FACTORS_WIDE.exists()):
            pytest.skip("Processed data files not found.")
        payload = build_payload()
        assert "meta" in payload
        assert "places" in payload
        assert "factorDefs" in payload
        assert "rows" in payload
        assert "costSnapshots" in payload

        assert len(payload["places"]) > 0
        assert len(payload["rows"]) > 0
        assert payload["meta"]["sourceStatus"] == "local_pipeline_data"

    def test_sync_public_data(self, tmp_path):
        from src.export_frontend_data import sync_public_data

        synced = sync_public_data(public_dir=tmp_path)
        assert len(synced) >= 3
        assert any(p.name == "places.csv" for p in synced)
        assert any(p.name == "factors_wide.csv" for p in synced)

    def test_load_economy_logs_warning_on_dropped_rows(self, caplog):
        import logging
        from unittest.mock import patch
        from src.loaders.load_economy import load_economy

        sample_nsdp = pd.DataFrame([
            {"state_name": "State A", "year": 2021, "per_capita_nsdp_constant": 100000.0},
            {"state_name": "State A", "year": 2022, "per_capita_nsdp_constant": 110000.0},
            {"state_name": "State B", "year": 2022, "per_capita_nsdp_constant": 120000.0},
        ])
        sample_plfs = pd.DataFrame([
            {"state_name": "State A", "year": 2022, "unemployment_rate": 4.5},
        ])

        with patch("src.loaders.load_economy.load_rbi_nsdp", return_value=sample_nsdp), \
             patch("src.loaders.load_economy.load_plfs_unemployment", return_value=sample_plfs), \
             caplog.at_level(logging.WARNING):
            merged = load_economy()
            assert len(merged) == 1
            assert any("dropped 2 NSDP state-year observations" in rec.message for rec in caplog.records)

    def test_load_cpcb_csv_year_inference_warning(self, tmp_path, caplog):
        import logging
        from src.loaders.load_air_cpcb import load_all_cpcb

        csv_file = tmp_path / "cpcb_data.csv"
        csv_file.write_text("City,PM2.5\nDelhi,75.0\n", encoding="utf-8")

        with caplog.at_level(logging.WARNING):
            df = load_all_cpcb(raw_dir=tmp_path)
            assert not df.empty
            assert df["year"].iloc[0] == 2023
            assert any("Cannot determine year from CPCB CSV filename" in rec.message for rec in caplog.records)

    def test_load_nfhs_health_warning_on_missing_subindicator(self, tmp_path, caplog):
        import logging
        from src.loaders.load_health_nfhs import load_nfhs_health, NFHS_HEALTH_FILENAME

        sample_factsheet = pd.DataFrame([
            {
                "State/UT": "State Incomplete",
                "District Names": "District 1",
                "Number of households surveyed": 1000,
                "institutional births (in the 5 years before the survey)": 95.0,
                "fully vaccinated (either vaccination card)": 90.0,
                "children under 5 years who are stunted": 20.0,
                "all women age 15-49 years who are anaemic": "NA",  # missing subindicator
            }
        ])
        csv_path = tmp_path / NFHS_HEALTH_FILENAME
        sample_factsheet.to_csv(csv_path, index=False)

        with caplog.at_level(logging.WARNING):
            df = load_nfhs_health(raw_dir=tmp_path)
            assert not df.empty
            assert pd.isna(df["health"].iloc[0])
            assert any("have NaN health composite due to missing sub-indicators" in rec.message for rec in caplog.records)

    def test_run_eda_handles_missing_trends_and_clusters(self, monkeypatch, tmp_path):
        from src.analysis import run_eda as eda_module
        from src.utils.constants import PLACES_CSV, FACTORS_WIDE, SCORES_WIDE

        if not (PLACES_CSV.exists() and FACTORS_WIDE.exists() and SCORES_WIDE.exists()):
            pytest.skip("Processed analytical tables not found.")

        monkeypatch.setattr(eda_module, "TRENDS_CSV", tmp_path / "nonexistent_trends.csv")
        monkeypatch.setattr(eda_module, "CLUSTERS_CSV", tmp_path / "nonexistent_clusters.csv")
        monkeypatch.setattr(eda_module, "REPORTS", tmp_path / "reports")
        monkeypatch.setattr(eda_module, "FIGURES", tmp_path / "reports" / "figures")

        eda_module.run_eda()
        assert (tmp_path / "reports" / "findings.md").exists()
