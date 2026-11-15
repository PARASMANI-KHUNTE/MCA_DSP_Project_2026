import pandas as pd

from src.models.run_ml import evaluate_air_holdout


def test_air_holdout_reports_mse_rmse_r2_and_baseline():
    rows = [
        {"place_id": "city-1", "year": year, "air_quality_score": score}
        for year, score in [(2015, 30), (2016, 32), (2017, 34), (2018, 36),
                            (2019, 38), (2023, 46), (2024, 48)]
    ]

    result = evaluate_air_holdout(pd.DataFrame(rows))

    assert result["validation"]["ols"]["n"] == 1
    assert result["test"]["ols"]["n"] == 2
    for split in ("validation", "test"):
        for model in ("ols", "naive_last_value"):
            metrics = result[split][model]
            assert metrics["mse"] is not None
            assert metrics["rmse"] is not None
            if metrics["n"] >= 2:
                assert metrics["r2"] is not None


def test_carried_forward_years_are_excluded_from_holdout():
    """A repeated 2019 value must not be scored as a 2023-2024 measurement."""
    rows = [
        {"place_id": "city-1", "year": year, "air_quality_score": score}
        for year, score in [(2015, 30), (2016, 32), (2017, 34), (2018, 36),
                            (2019, 38), (2023, 38), (2024, 38)]
    ]

    result = evaluate_air_holdout(
        pd.DataFrame(rows),
        observed_years=[2015, 2016, 2017, 2018, 2019],
    )

    assert result["observed_years"] == [2015, 2016, 2017, 2018, 2019]
    assert result["score_years"] == [2015, 2016, 2017, 2018, 2019, 2023, 2024]
    assert result["validation"]["ols"]["n"] == 1
    assert result["test"]["ols"]["n"] == 0
    assert result["test"]["status"].startswith("unavailable")


def test_no_raw_observations_returns_unavailable():
    rows = [
        {"place_id": "city-1", "year": year, "air_quality_score": 40}
        for year in (2023, 2024)
    ]

    result = evaluate_air_holdout(pd.DataFrame(rows), observed_years=[2015])

    assert result["status"] == "unavailable"
    assert result["observed_years"] == [2015]
    assert result["score_years"] == [2023, 2024]
