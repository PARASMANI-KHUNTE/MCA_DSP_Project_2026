"""
Export the processed project data to a frontend ES module.

The frontend is intentionally static (Vite preview / Docker), so it consumes
a generated module rather than querying a development-only API. Every value
written here comes from data/processed or the scoring configuration; no
placeholder or synthetic observations are added.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pandas as pd
import yaml

from src.utils.constants import (
    DATA_PROCESSED,
    FACTORS_TIDY,
    FACTORS_WIDE,
    PLACES_CSV,
    RAW_COL,
    SCORING_CONFIG,
)

OUTPUT = Path(__file__).resolve().parents[1] / "frontend" / "src" / "data" / "realData.js"


def _number(value) -> float | None:
    if value is None or pd.isna(value):
        return None
    return float(value)


def _clean_place(row: pd.Series) -> dict:
    return {
        "id": str(row["place_id"]),
        "name": str(row["place_name"]),
        "type": str(row["place_type"]),
        "state": str(row["state_name"]),
        "lat": _number(row.get("latitude")),
        "lng": _number(row.get("longitude")),
        "region": str(row.get("region") or ""),
    }


def _factor_definitions(config: dict) -> dict:
    factors = config["factors"]

    air = factors["air_quality"]
    safety = factors["safety"]
    health = factors["health"]
    economy = factors["economy"]
    col = factors["cost_of_living"]

    return {
        "air": {
            "key": "air",
            "column": air["column"],
            "label": "Air Quality",
            "shortLabel": "Air",
            "direction": air["direction"],
            "bounds": air["bounds"],
            "level": air["level"],
            "source": "CPCB / Kaggle PM2.5",
            "sourceId": air.get("source_id"),
            "unit": "µg/m³",
            "trend": air.get("trend"),
        },
        "safety": {
            "key": "safety",
            "column": safety["column"],
            "label": "Public Safety",
            "shortLabel": "Safety",
            "direction": safety["direction"],
            "bounds": safety["bounds"],
            "level": safety["level"],
            "source": "NCRB crime rate",
            "sourceId": safety.get("source_id"),
            "unit": "per lakh",
            "trend": safety.get("trend"),
        },
        "health": {
            "key": "health",
            "column": health["column"],
            "label": "Healthcare",
            "shortLabel": "Health",
            "direction": health["direction"],
            "bounds": health["bounds"],
            "level": health["level"],
            "source": "SRS infant mortality",
            "sourceId": health.get("source_id"),
            "unit": "per 1,000 births",
            "trend": health.get("trend"),
        },
        "economy": {
            "key": "economy",
            "label": "Economy & Jobs",
            "shortLabel": "Econ",
            "direction": "mixed",
            "level": economy["level"],
            "source": "RBI NSDP / PLFS",
            "trend": economy.get("trend"),
            "indicators": [
                {
                    "key": "nsdp",
                    "column": indicator["column"],
                    "label": "NSDP per capita",
                    "direction": indicator["direction"],
                    "bounds": indicator["bounds"],
                    "sourceId": indicator.get("source_id"),
                }
                for indicator in economy["indicators"]
            ],
        },
        "col": {
            "key": "col",
            "column": col["column"],
            "label": "Cost of Living",
            "shortLabel": "Cost",
            "direction": col["direction"],
            "bounds": col["bounds"],
            "level": col["level"],
            "source": "Kaggle housing snapshot",
            "sourceId": col.get("source_id"),
            "unit": "₹/month",
            "trend": col.get("trend"),
        },
    }


def _cost_snapshot_year() -> int:
    path = RAW_COL / "House_Rent_Dataset.csv"
    if not path.exists():
        return 2022
    posted = pd.read_csv(path, usecols=["Posted On"])["Posted On"]
    return int(pd.to_datetime(posted, errors="coerce").dt.year.max())


def build_payload() -> dict:
    places = pd.read_csv(PLACES_CSV, dtype=str)
    factors = pd.read_csv(FACTORS_WIDE)
    tidy = pd.read_parquet(FACTORS_TIDY)
    config = yaml.safe_load(SCORING_CONFIG.read_text(encoding="utf-8"))

    for column in [
        "year", "air_quality", "safety", "health",
        "per_capita_nsdp_constant", "unemployment_rate",
    ]:
        if column in factors.columns:
            factors[column] = pd.to_numeric(factors[column], errors="coerce")

    factor_rows = []
    for _, row in factors.dropna(subset=["year"]).sort_values(["place_id", "year"]).iterrows():
        factor_rows.append({
            "placeId": str(row["place_id"]),
            "year": int(row["year"]),
            "air": _number(row.get("air_quality")),
            "safety": _number(row.get("safety")),
            "health": _number(row.get("health")),
            "nsdp": _number(row.get("per_capita_nsdp_constant")),
            "unemployment": _number(row.get("unemployment_rate")),
        })

    cost_year = _cost_snapshot_year()
    cost_rows = []
    for _, row in tidy[tidy["factor"] == "cost_of_living"].iterrows():
        cost_rows.append({
            "placeId": str(row["place_id"]),
            "year": cost_year,
            "value": _number(row["value_raw"]),
        })

    years = sorted({row["year"] for row in factor_rows})
    last_year = {}
    first_year = {}
    for factor_key, column in {
        "air": "air", "safety": "safety", "health": "health",
        "economy": "nsdp", "col": "value",
    }.items():
        if factor_key == "col":
            values = [row["year"] for row in cost_rows if row["value"] is not None]
        else:
            values = [row["year"] for row in factor_rows if row[column] is not None]
        if values:
            last_year[factor_key] = max(values)
            first_year[factor_key] = min(values)

    factor_rows_by_factor = tidy.groupby("factor").size().astype(int).to_dict()
    inherited_by_factor = (
        tidy[tidy["is_inherited"] == True].groupby("factor").size().astype(int).to_dict()
    )

    counts = {
        "places": int(len(places)),
        "states": int((places["place_type"] == "state").sum()),
        "cities": int((places["place_type"] == "city").sum()),
        "factorRows": len(factor_rows),
        "costSnapshots": len(cost_rows),
        "inheritedRows": int(tidy["is_inherited"].sum()),
        "imputedRows": int(tidy["is_imputed"].sum()),
        "airCityYears": int((tidy["factor"] == "air_quality").sum()),
        "factorRowsByFactor": factor_rows_by_factor,
        "inheritedByFactor": inherited_by_factor,
    }

    return {
        "meta": {
            "generated": date.today().isoformat(),
            "baselineYear": 2024,
            "projectionEndYear": 2034,
            "years": years,
            "firstYearByFactor": first_year,
            "lastYearByFactor": last_year,
            "counts": counts,
            "sourceFiles": [
                "data/processed/places.csv",
                "data/processed/factors_wide.csv",
                "data/processed/factors_tidy.parquet",
                "data/raw/cost_of_living/House_Rent_Dataset.csv",
                "src/scoring/factors_config.yaml",
            ],
            "note": (
                "Scores use the latest real observation at or before the selected year. "
                "City safety, health and economy are inherited from the city's state and "
                "keep their observed source years. No synthetic values are used."
            ),
        },
        "places": [_clean_place(row) for _, row in places.iterrows()],
        "factorDefs": _factor_definitions(config),
        "rows": factor_rows,
        "costSnapshots": cost_rows,
    }


def main() -> None:
    payload = build_payload()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "// Generated by src/export_frontend_data.py — do not hand-edit.\n"
        f"export const DATA = {json.dumps(payload, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
    print(
        f"Places: {len(payload['places'])}, factor rows: {len(payload['rows'])}, "
        f"cost snapshots: {len(payload['costSnapshots'])}"
    )


if __name__ == "__main__":
    main()
