# Fabrication and hardcoded-value audit

**Audit date:** 3 November 2026 · **Last reviewed:** 14 November 2026

## Confirmed generated inputs

Six CSV files exactly matched SHA-256 fingerprints of output from the project's retired placeholder generator. They have been moved out of every active raw-input directory into `data/rejected/generated_placeholders/`; loaders exclude them. The retired generator was moved there as a text archive so it cannot be run as a Python module. The archived files are retained for audit evidence, not pipeline use.

| Former input | Claimed subject | Disposition |
|---|---|---|
| `cpcb_aqs_2023.csv`, `cpcb_aqs_2024.csv` | CPCB air quality | Quarantined |
| `ncrb_crime_rate_2015_2022.csv` | NCRB crime | Quarantined |
| `srs_infant_mortality_2015_2022.csv` | SRS infant mortality | Quarantined |
| `rbi_nsdp_per_capita_constant.csv` | RBI NSDP | Quarantined |
| `plfs_unemployment_rates.csv` | MoSPI PLFS unemployment | Quarantined |

## Active local inputs and limits

The pipeline reads the following local extracts. None is a known match for the six generated files, but that does **not** prove the values match the cited releases or establish versions, extraction history, or reuse terms. An unauthenticated download comparison against the two public Kaggle endpoints returned HTTP 404, so no upstream file-level comparison was completed. Do not present the outputs as source-certified facts.

| Local file | Factor | Cited subject |
|---|---|---|
| `air_kaggle/city_day.csv` | air quality (historic) | Kaggle "Air Quality Data in India" |
| `air_kaggle/enriched_aqi_dataset.csv` | air quality (2025–26) | Enriched station extract; upstream unconfirmed |
| `cost_of_living/House_Rent_Dataset.csv`, `cost_of_living/archive/india_col_salary_longitudinal_2010_2024.csv` | cost of living | Kaggle house-rent data plus modelled/reference longitudinal estimates |
| `safety/ncrb_table_1a3_2020_2022.xlsx` | safety | NCRB Table 1A.3, 2020–2022 |
| `health/NFHS_5_India_Districts_Factsheet_Data.csv` | health | NFHS-5 district factsheets (2019–21) |
| `economy/rbi_nsdp_2025_table20.xlsx` | economy (NSDP) | RBI NSDP per-capita constant prices |
| `economy/plfs_2023_24_annual_report.pdf` | economy (unemployment) | MoSPI PLFS 2023-24 |
| `Water bodies quality data - India/Water_pond_tanks_2021.csv` | water quality | CPCB water-body snapshot, 2021 |

Current processed coverage (from `data_quality_report.md`): 61 places (32 states/UTs, 29 cities); air 155 observations across 46 places (2015–2019 and 2025–2026); safety 183 across 61 (2020–2022); health 61 across 61 (2021); NSDP and unemployment 57 each (2023); cost of living 390 across 26 cities (2010–2024); water quality 54 across 54 (2021). State-level factors are inherited by cities and flagged in the dashboard with the source year. A balanced composite is published for places that have the weighted factors; places missing one weighted factor are reweighted and marked partial, and places missing two or more remain unscored.

## Hardcoded configuration and reference data

The following are explicit design/reference values, not observations: place master identifiers and coordinates, state-to-region assignments, map geometry, color bands, factor directions, thresholds, default weights, and model split/settings. Score normalization anchors are now calibrated 5th/95th percentiles of the latest observation per place at or before 2026 (`src/scoring/calibrate_bounds.py`; evidence in `bounds_calibration.md`). They are data-derived but still not externally validated, and they must not be described as measured data. Map geometry and coordinates need source/license documentation before redistribution.

## Output status

Processed factor tables and `frontend/src/data/realData.js` were regenerated on 14 November 2026. Trend projection is disabled for every factor (`trend: never`), so `data/processed/trends.csv` is header-only and `models/metrics.json` records `n_fitted: 0`. Old analytical figures were moved to `reports/archive/withdrawn_figures_20261103/` and are not cited by active reports. A successful pipeline run checks processing structure; it does not verify upstream authenticity.
