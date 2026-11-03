import hashlib
import csv
from pathlib import Path

import pandas as pd

from backend.app.core.config import Settings
from src.utils.helpers import flag_outliers
from src.utils import provenance
from src.cleaning.run_pipeline import stage_combine_air
from src.models.trend import run_all_trends


def test_debug_accepts_release_label_from_dotenv():
    settings = Settings(_env_file=None, debug="release")
    assert settings.debug is False


def test_debug_accepts_true_label():
    settings = Settings(_env_file=None, debug="debug")
    assert settings.debug is True


def test_domain_outlier_is_excluded_and_iqr_extreme_is_retained():
    source = pd.DataFrame({"place": ["A", "B", "C", "D", "E"], "value": [-1, 1, 2, 3, 1000]})

    result = flag_outliers(source, "value", domain_lo=0)

    removed = result.loc[result["place"] == "A"].iloc[0]
    retained = result.loc[result["place"] == "E"].iloc[0]
    assert pd.isna(removed["value"])
    assert removed["outlier_original_value"] == -1
    assert removed["outlier_action"] == "removed_domain_violation"
    assert retained["value"] == 1000
    assert retained["outlier_action"] == "retained_pending_review"


def test_placeholder_fingerprints_detect_exact_content(monkeypatch):
    relative_path = "reports/.provenance-test.csv"
    raw = Path(relative_path)
    content = b"generated placeholder fixture\n"
    raw.parent.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(content)
    monkeypatch.setitem(
        provenance.UNVERIFIED_GENERATED_SHA256,
        relative_path,
        hashlib.sha256(content).hexdigest(),
    )
    try:
        assert raw.resolve() in provenance.find_unverified_generated_sources()
        raw.write_bytes(b"verified replacement\n")
        assert raw.resolve() not in provenance.find_unverified_generated_sources()
    finally:
        raw.unlink(missing_ok=True)


def test_source_manifest_requires_hash_and_human_review_record():
    root = Path("reports/.source-manifest-test").resolve()
    raw_root = root / "data/raw"
    inputs = {
        "air_kaggle/city_day.csv": ("air_quality", b"air\n"),
        "safety/crime.csv": ("safety", b"crime\n"),
        "health/imr.csv": ("health", b"health\n"),
        "economy/jobs.csv": ("economy", b"economy\n"),
    }
    fields = sorted(provenance.MANIFEST_REQUIRED_COLUMNS)
    try:
        rows = []
        for index, (relative, (factor, content)) in enumerate(inputs.items()):
            path = raw_root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            rows.append({
                "relative_path": f"data/raw/{relative}",
                "sha256": hashlib.sha256(content).hexdigest(),
                "source_id": f"source_{index}",
                "factor": factor,
                "source_url": "https://example.org/dataset",
                "release": "2026 test fixture",
                "retrieved_on": "2026-11-03",
                "license_status": "approved",
                "indicator_definition": "Fixture indicator",
                "unit": "fixture unit",
                "geography": "state",
                "period": "2020",
                "extraction_notes": "Fixture source review",
                "validation_status": "verified",
                "spot_check_status": "passed",
            })

        manifest = raw_root / "source_validation_manifest.csv"
        with manifest.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

        assert provenance.find_unverified_sources(root) == []
        (raw_root / "safety/crime.csv").write_bytes(b"changed after review\n")
        assert any("checksum does not match" in issue for issue in provenance.find_unverified_sources(root))
    finally:
        import shutil
        shutil.rmtree(root, ignore_errors=True)


def test_air_source_change_starts_city_specific_segment():
    kaggle = pd.DataFrame({
        "city": ["Example City", "Example City"],
        "year": [2018, 2019],
        "pm25_mean": [35.0, 36.0],
        "gap_flag": ["", ""],
        "air_source": ["kaggle", "kaggle"],
    })
    cpcb = pd.DataFrame({
        "city": ["Example City", "Example City"],
        "year": [2023, 2024],
        "pm25_annual": [50.0, 48.0],
        "gap_flag": ["", ""],
        "air_source": ["cpcb", "cpcb"],
    })

    combined = stage_combine_air(kaggle, cpcb).set_index("year")

    assert combined.loc[2018, "series_break"] == False
    assert combined.loc[2023, "series_break"] == True
    assert combined.loc[2023, "gap_flag"] == "air_source_method_change"
    assert combined.loc[2024, "series_break"] == False


def test_trend_fits_only_latest_segment_after_series_break():
    years = list(range(2010, 2020))
    values = [10, 20, 30, 40, 50, 60, 62, 64, 66, 68]
    frame = pd.DataFrame({
        "place_id": ["X"] * len(years),
        "factor": ["air_quality"] * len(years),
        "year": years,
        "score": values,
        "series_break": [False] * 5 + [True] + [False] * 4,
        "gap_flag": [""] * 10,
    })

    trends, _ = run_all_trends(frame, {"factors": {"air_quality": {"trend": "eligible"}}})

    assert trends.loc[0, "n_points"] == 5
    assert trends.loc[0, "series_break_flag"]
    assert abs(trends.loc[0, "slope"] - 2.0) < 1e-9
