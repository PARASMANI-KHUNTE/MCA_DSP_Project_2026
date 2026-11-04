"""Fail closed unless analytical inputs have a reviewed source manifest."""

from __future__ import annotations

import hashlib
import csv
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

VALIDATION_MANIFEST = "data/raw/source_validation_manifest.csv"
MANIFEST_REQUIRED_COLUMNS = {
    "relative_path",
    "sha256",
    "source_id",
    "factor",
    "source_url",
    "release",
    "retrieved_on",
    "license_status",
    "indicator_definition",
    "unit",
    "geography",
    "period",
    "extraction_notes",
    "validation_status",
    "spot_check_status",
}
REQUIRED_FACTORS = {"air_quality", "safety", "health", "economy"}
SUPPORTED_RAW_SUFFIXES = {".csv", ".xls", ".xlsx", ".pdf"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def is_known_generated_source(path: Path, root: Path = ROOT) -> bool:
    """Identify exact files emitted by the retired demonstration-data generator."""
    path = Path(path)
    try:
        relative_path = path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return False
    expected_digest = UNVERIFIED_GENERATED_SHA256.get(relative_path)
    return bool(path.is_file() and expected_digest and _sha256(path) == expected_digest)


def find_unverified_generated_sources(root: Path = ROOT) -> list[Path]:
    """Return raw files whose content exactly matches known generated placeholders."""
    return [
        root / relative_path
        for relative_path in UNVERIFIED_GENERATED_SHA256
        if is_known_generated_source(root / relative_path, root)
    ]


def _pipeline_input_files(root: Path) -> list[Path]:
    """Find files consumed by the project loaders, excluding aliases/registers."""
    inputs: set[Path] = set()
    city_day = root / "data/raw/air_kaggle/city_day.csv"
    if city_day.is_file():
        inputs.add(city_day)

    for folder in ("air_cpcb", "safety", "health", "economy", "cost_of_living"):
        directory = root / "data/raw" / folder
        if directory.is_dir():
            inputs.update(
                path for path in directory.iterdir()
                if path.is_file() and path.suffix.lower() in SUPPORTED_RAW_SUFFIXES
            )
    return sorted(inputs)


def find_unverified_sources(root: Path = ROOT) -> list[str]:
    """Return reasons any loader input is not explicitly source-validated.

    The manifest is a human review record, not proof by itself. Its exact file
    checksum prevents a reviewed decision from silently carrying over to a
    different file; reviewers must independently verify source values.
    """
    blockers: list[str] = []
    known_placeholders = find_unverified_generated_sources(root)
    blockers.extend(f"known generated placeholder: {path.relative_to(root).as_posix()}" for path in known_placeholders)

    inputs = _pipeline_input_files(root)
    if not inputs:
        blockers.append("no source data files found for the required pipeline factors")

    manifest_path = root / VALIDATION_MANIFEST
    if not manifest_path.is_file():
        blockers.append(f"missing source validation manifest: {VALIDATION_MANIFEST}")
        return blockers

    try:
        with manifest_path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            columns = set(reader.fieldnames or [])
            missing_columns = MANIFEST_REQUIRED_COLUMNS - columns
            if missing_columns:
                blockers.append("manifest missing columns: " + ", ".join(sorted(missing_columns)))
                return blockers
            rows = list(reader)
    except (OSError, csv.Error) as exc:
        return blockers + [f"could not read source validation manifest: {exc}"]

    by_path: dict[str, list[dict[str, str]]] = {}
    verified_factors: set[str] = set()
    for row in rows:
        relative = (row.get("relative_path") or "").replace("\\", "/").strip()
        if relative:
            by_path.setdefault(relative, []).append(row)

    input_relatives = {path.relative_to(root).as_posix() for path in inputs}
    for path in inputs:
        relative = path.relative_to(root).as_posix()
        records = by_path.get(relative, [])
        if len(records) != 1:
            blockers.append(f"{relative}: expected one manifest record, found {len(records)}")
            continue

        row = records[0]
        row_valid = True
        if (row.get("sha256") or "").strip().lower() != _sha256(path):
            blockers.append(f"{relative}: manifest checksum does not match the file")
            row_valid = False
        required_values = (
            "source_id", "factor", "source_url", "release", "retrieved_on",
            "license_status", "indicator_definition", "unit", "geography",
            "period", "extraction_notes",
        )
        missing_values = [name for name in required_values if not (row.get(name) or "").strip()]
        if missing_values:
            blockers.append(f"{relative}: missing review details: {', '.join(missing_values)}")
            row_valid = False
        if (row.get("license_status") or "").strip().lower() != "approved":
            blockers.append(f"{relative}: reuse/license review is not approved")
            row_valid = False
        if (row.get("validation_status") or "").strip().lower() != "verified":
            blockers.append(f"{relative}: source validation is not verified")
            row_valid = False
        if (row.get("spot_check_status") or "").strip().lower() != "passed":
            blockers.append(f"{relative}: source spot-check has not passed")
            row_valid = False
        if row_valid and row.get("factor", "").strip() in REQUIRED_FACTORS:
            verified_factors.add(row["factor"].strip())

    for relative in sorted(set(by_path) - input_relatives):
        blockers.append(f"{relative}: manifest record has no matching loader input")

    for factor in sorted(REQUIRED_FACTORS - verified_factors):
        blockers.append(f"no reviewed source file is available for required factor: {factor}")

    for relative, records in by_path.items():
        if len(records) > 1:
            blockers.append(f"{relative}: duplicate manifest records")

    return sorted(set(blockers))


def require_verified_sources(root: Path = ROOT) -> None:
    """Stop analysis/export until every contributing source passes review."""
    blockers = find_unverified_sources(root)
    if blockers:
        reasons = "\n".join(f"  - {reason}" for reason in blockers)
        raise RuntimeError(
            "Refusing to create or serve analytical outputs from unverified "
            "source files. Resolve every source-validation issue first:\n" + reasons
        )


if __name__ == "__main__":
    require_verified_sources()
