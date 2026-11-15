"""
src/scoring/calibrate_bounds.py
───────────────────────────────
Compute data-driven normalization anchors for the scoring engine (M5).

The normalization bounds in ``factors_config.yaml`` are fixed so that a
place's score does not depend on the current cross-section. This module
derives those fixed anchors from the processed data instead of leaving them
as analyst guesses.

Two calibration scopes are supported:

``snapshot`` (default)
    The latest non-null observation per place at or before the baseline year.
    This is the cross-section used for the headline ranking, so each place
    contributes at most once.

``all-years``
    Every valid place-year observation. This gives more weight to places
    with longer histories but keeps the full observed range in view.

The script writes :file:`reports/bounds_calibration.md` with the computed
percentiles, sample sizes, and the current configured bounds so the choice
is auditable. It does **not** edit the YAML automatically — update the
config deliberately after reviewing the report.

Run with::

    python -m src.scoring.calibrate_bounds
    python -m src.scoring.calibrate_bounds --all-years
    python -m src.scoring.calibrate_bounds --year 2026 --lower-quantile 0.05
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import pandas as pd
import yaml

from src.utils.constants import FACTORS_WIDE, REPORTS, SCORING_CONFIG

DEFAULT_LOWER_QUANTILE = 0.05
DEFAULT_UPPER_QUANTILE = 0.95


@dataclass(frozen=True)
class BoundsRow:
    """Calibration result for one normalized column."""

    factor: str
    column: str
    n: int
    lower_quantile: float
    upper_quantile: float
    calibrated_lo: float
    calibrated_hi: float
    configured_lo: float | None
    configured_hi: float | None


def factor_columns(config: dict) -> list[tuple[str, str]]:
    """Return ``(factor, column)`` pairs for every normalized column."""
    pairs: list[tuple[str, str]] = []
    for factor, factor_cfg in config.get("factors", {}).items():
        indicators = factor_cfg.get("indicators")
        if indicators:
            for indicator in indicators:
                column = indicator.get("column")
                if column:
                    pairs.append((factor, column))
        elif factor_cfg.get("column"):
            pairs.append((factor, factor_cfg["column"]))
    return pairs


def configured_bounds(config: dict, factor: str, column: str) -> tuple[float | None, float | None]:
    """Return the bounds currently configured for a factor/indicator column."""
    factor_cfg = config.get("factors", {}).get(factor, {})
    for indicator in factor_cfg.get("indicators", []):
        if indicator.get("column") == column:
            bounds = indicator.get("bounds")
            return (float(bounds[0]), float(bounds[1])) if bounds else (None, None)
    bounds = factor_cfg.get("bounds")
    return (float(bounds[0]), float(bounds[1])) if bounds else (None, None)


def snapshot_frame(factors: pd.DataFrame, year: int | None = None) -> pd.DataFrame:
    """Latest non-null observation per place at or before ``year``.

    ``factors_wide`` keeps one row per place and year, but a factor can be
    missing in the latest row while an earlier year holds a value. This
    mirrors :func:`src.scoring.scoring.compute_scores`, which scores each
    factor from the latest observation at or before the requested year.
    """
    frame = factors.copy()
    frame["year"] = pd.to_numeric(frame["year"], errors="coerce")
    frame = frame.dropna(subset=["place_id", "year"])
    if year is None:
        year = int(frame["year"].max())
    frame = frame.loc[frame["year"] <= year]
    if frame.empty:
        raise ValueError(f"No factor rows exist on or before {year}.")

    # Sort so ``last`` retains the newest non-null value for every column.
    frame = frame.sort_values("year")
    value_columns = [column for column in frame.columns if column not in {"place_id", "year"}]
    latest = frame.groupby("place_id", as_index=False)[value_columns].last()
    latest["year"] = year
    return latest


def calibrate(
    factors: pd.DataFrame,
    config: dict,
    *,
    year: int | None = None,
    lower_quantile: float = DEFAULT_LOWER_QUANTILE,
    upper_quantile: float = DEFAULT_UPPER_QUANTILE,
    all_years: bool = False,
) -> pd.DataFrame:
    """Compute percentile bounds for every normalized column.

    Parameters
    ----------
    factors : pandas.DataFrame
        Processed wide factor table (``factors_wide.csv``).
    config : dict
        Parsed ``factors_config.yaml``.
    year : int | None
        Baseline year for the snapshot scope. Defaults to the latest year.
    lower_quantile, upper_quantile : float
        Quantiles in ``[0, 1]`` used for the lower and upper anchors.
    all_years : bool
        Use every valid place-year observation instead of the snapshot.

    Returns
    -------
    pandas.DataFrame
        One row per normalized column with sample size, percentiles, and the
        currently configured bounds.
    """
    if not 0 <= lower_quantile < upper_quantile <= 1:
        raise ValueError("Quantiles must satisfy 0 <= lower < upper <= 1.")

    frame = factors if all_years else snapshot_frame(factors, year=year)
    rows: list[BoundsRow] = []

    for factor, column in factor_columns(config):
        if column not in frame.columns:
            continue
        values = pd.to_numeric(frame[column], errors="coerce").dropna()
        if values.empty:
            continue
        configured_lo, configured_hi = configured_bounds(config, factor, column)
        rows.append(
            BoundsRow(
                factor=factor,
                column=column,
                n=int(values.size),
                lower_quantile=lower_quantile,
                upper_quantile=upper_quantile,
                calibrated_lo=round(float(values.quantile(lower_quantile)), 2),
                calibrated_hi=round(float(values.quantile(upper_quantile)), 2),
                configured_lo=configured_lo,
                configured_hi=configured_hi,
            )
        )

    return pd.DataFrame([asdict(row) for row in rows])


def _format_bounds(lo: float | None, hi: float | None) -> str:
    if lo is None or hi is None:
        return "—"
    return f"{lo:g} – {hi:g}"


def build_report(
    bounds: pd.DataFrame,
    *,
    scope: str,
    year: int | None,
    lower_quantile: float,
    upper_quantile: float,
) -> str:
    """Render the calibration report as Markdown."""
    scope_text = (
        f"latest observation per place at or before {year}"
        if scope == "snapshot"
        else "every valid place-year observation"
    )
    lines = [
        "# Normalization Bounds Calibration",
        "",
        f"**Generated by:** `python -m src.scoring.calibrate_bounds`  ",
        f"**Scope:** {scope_text}  ",
        f"**Quantiles:** {lower_quantile:g} / {upper_quantile:g}  ",
        "",
        "Bounds are fixed anchors: they do not change when a place improves, so "
        "scores stay comparable across years. Values outside the bounds are "
        "clipped before normalization.",
        "",
        "| Factor | Column | n | p05 | p95 | Calibrated bounds | Configured bounds |",
        "|---|---|---:|---:|---:|---|---|",
    ]
    for row in bounds.itertuples(index=False):
        lines.append(
            f"| {row.factor} | `{row.column}` | {row.n} | "
            f"{row.calibrated_lo:g} | {row.calibrated_hi:g} | "
            f"{_format_bounds(row.calibrated_lo, row.calibrated_hi)} | "
            f"{_format_bounds(row.configured_lo, row.configured_hi)} |"
        )

    changed = bounds[
        (bounds["calibrated_lo"] != bounds["configured_lo"])
        | (bounds["calibrated_hi"] != bounds["configured_hi"])
    ]
    lines.extend(["", "## Review notes", ""])
    if changed.empty:
        lines.append("Configured bounds already match the calibrated percentiles.")
    else:
        lines.append(
            f"{len(changed)} of {len(bounds)} configured bounds differ from the "
            "calibrated percentiles. Update `src/scoring/factors_config.yaml` "
            "deliberately, then re-run scoring, ML, EDA, and the frontend export."
        )
        lines.append("")
        lines.append("| Factor / indicator | Configured | Calibrated |")
        lines.append("|---|---|---|")
        for row in changed.itertuples(index=False):
            lines.append(
                f"| {row.factor} (`{row.column}`) | "
                f"{_format_bounds(row.configured_lo, row.configured_hi)} | "
                f"{_format_bounds(row.calibrated_lo, row.calibrated_hi)} |"
            )

    lines.extend(
        [
            "",
            "## Reproduce",
            "",
            "```bash",
            "python -m src.scoring.calibrate_bounds"
            + (" --all-years" if scope == "all-years" else f" --year {year}")
            + f" --lower-quantile {lower_quantile:g} --upper-quantile {upper_quantile:g}",
            "python -m src.scoring.run_scoring",
            "python -m src.models.run_ml",
            "python -m src.analysis.run_eda",
            "python -m src.export_frontend_data",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Calibrate scoring normalization bounds from processed data.")
    parser.add_argument("--factors", type=Path, default=FACTORS_WIDE, help="Processed wide factor table.")
    parser.add_argument("--config", type=Path, default=SCORING_CONFIG, help="Scoring configuration YAML.")
    parser.add_argument("--year", type=int, default=None, help="Baseline year for the snapshot scope.")
    parser.add_argument("--all-years", action="store_true", help="Calibrate on all place-year observations.")
    parser.add_argument("--lower-quantile", type=float, default=DEFAULT_LOWER_QUANTILE)
    parser.add_argument("--upper-quantile", type=float, default=DEFAULT_UPPER_QUANTILE)
    parser.add_argument("--report", type=Path, default=REPORTS / "bounds_calibration.md")
    parser.add_argument("--json", action="store_true", help="Print the calibration table as JSON.")
    args = parser.parse_args(argv)

    factors = pd.read_csv(args.factors)
    config = yaml.safe_load(args.config.read_text(encoding="utf-8"))
    scope = "all-years" if args.all_years else "snapshot"
    year = None if args.all_years else (args.year or int(pd.to_numeric(factors["year"], errors="coerce").max()))

    bounds = calibrate(
        factors,
        config,
        year=year,
        lower_quantile=args.lower_quantile,
        upper_quantile=args.upper_quantile,
        all_years=args.all_years,
    )
    if bounds.empty:
        raise SystemExit("No factor columns were available to calibrate.")

    report = build_report(
        bounds,
        scope=scope,
        year=year,
        lower_quantile=args.lower_quantile,
        upper_quantile=args.upper_quantile,
    )
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report, encoding="utf-8")
    print(f"Wrote {args.report}")

    if args.json:
        print(bounds.to_json(orient="records", indent=2))
    else:
        print(bounds.to_string(index=False))


if __name__ == "__main__":
    main()
