import hashlib
from pathlib import Path

import pandas as pd

from backend.app.core.config import Settings
from src.utils.helpers import flag_outliers
from src.utils import provenance


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
