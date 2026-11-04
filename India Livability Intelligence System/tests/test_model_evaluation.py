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
