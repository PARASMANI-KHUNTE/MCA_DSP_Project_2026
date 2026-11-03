# Fabrication and hardcoded-value audit

**Audit date:** 3 November 2026

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

The current pipeline reads `data/raw/air_kaggle/city_day.csv` and `data/raw/cost_of_living/House_Rent_Dataset.csv`. Their fingerprints do not match the six known generated files. This does **not** prove the values match the named Kaggle releases or establish licenses, versions, or extraction history. An unauthenticated download comparison against both public Kaggle endpoints returned HTTP 404, so no upstream file-level comparison was completed. Those points remain unverified; do not present the outputs as source-certified facts. The cited listings are [Air Quality Data in India](https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india) and [House Rent Prediction Dataset](https://www.kaggle.com/datasets/iamsouravbanerjee/house-rent-prediction-dataset).

The air loader found 48 valid city-year observations across 18 cities for 2015–2019. Place-name matching maps 40 city-years across 13 cities; unmatched observations are not assigned. The pipeline derives 40 state-year means from those matched observations across 13 states, plus six rent snapshots. State PM2.5 is an explicit city-sample mean, not a state-monitoring observation. Missing years remain missing. There are no active safety, health, or economy observations, so the project publishes no composite score, ranking, composite statistics, or composite projection.

## Hardcoded configuration and reference data

The following are explicit design/reference values, not observations: place master identifiers and coordinates, state-to-region assignments, map geometry, color bands, score normalization bounds, factor directions, thresholds, default weights, and model split/settings. Score bounds are analyst-selected anchors; they are not computed percentiles. Map geometry and coordinates need source/license documentation before redistribution. These constants must not be described as measured data.

## Output status

Processed factor tables and `frontend/src/data/realData.js` were regenerated after quarantine. Old analytical figures were moved to `reports/archive/withdrawn_figures_20261103/`, and stored notebook outputs were cleared so stale numerical results are not embedded in notebooks. Findings are withheld when complete composite scores are unavailable. A successful pipeline run checks processing structure; it does not verify upstream authenticity.
