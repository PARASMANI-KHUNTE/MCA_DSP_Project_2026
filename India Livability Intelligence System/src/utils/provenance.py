"""Detect known synthetic raw tables previously emitted as official data."""

from __future__ import annotations

import hashlib
from pathlib import Path

from src.utils.constants import ROOT


# Exact fingerprints of the hard-coded demonstration tables formerly emitted
# by src/loaders/populate_official_data.py. Replacement with source-derived data
# naturally changes the digest and clears the block.
UNVERIFIED_GENERATED_SHA256 = {
    "data/raw/safety/ncrb_crime_rate_2015_2022.csv": "fc49174ea9cc1fe2f1366923024483dc5896dd3750d02a28b2882f70ad065dde",
    "data/raw/health/srs_infant_mortality_2015_2022.csv": "61b3d3ffa41874e5cc1d886470a586cd695690184b9b470d258e4ca8bd694942",
    "data/raw/economy/plfs_unemployment_rates.csv": "dd2048e7dca8ebd8b3040604139965b255c487e2d45a6a5621e27150a26cb305",
    "data/raw/economy/rbi_nsdp_per_capita_constant.csv": "40404071a05b931b0ecf244c6fd9b0e4db2ea940a9a1a6874604bffe79b8cede",
    "data/raw/air_cpcb/cpcb_aqs_2023.csv": "d733e9f8f44b2a514cffe2de3e2f4a5705d212f40c2475c19284109d743c1c7b",
    "data/raw/air_cpcb/cpcb_aqs_2024.csv": "ae13b2257f6c2bccc5332fbbb2d03900088824750bc3821e1b6c9450e284b926",
}


def find_unverified_generated_sources(root: Path = ROOT) -> list[Path]:
    """Return raw files whose content exactly matches known generated placeholders."""
    matches = []
    for relative_path, expected_digest in UNVERIFIED_GENERATED_SHA256.items():
        path = root / relative_path
        if not path.is_file():
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest == expected_digest:
            matches.append(path)
    return matches


def require_verified_sources() -> None:
    """Stop analysis/export while known placeholder source files are present."""
    matches = find_unverified_generated_sources()
    if matches:
        paths = "\n".join(f"  - {path}" for path in matches)
        raise RuntimeError(
            "Refusing to use analytical outputs derived from known synthetic "
            "placeholder source files. Replace them with verified records first:\n" + paths
        )


if __name__ == "__main__":
    require_verified_sources()
