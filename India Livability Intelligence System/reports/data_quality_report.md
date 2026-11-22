# Data Quality Report

**Generated (UTC):** 2026-11-22T06:04:02+00:00  
**Place master:** 61 places (32 states/UTs, 29 cities)  
**Tidy rows:** 957  
**Wide rows:** 643  
**Duplicate (place, year, factor) rows:** 0  
**Imputed values:** 0  
**Inherited state-level rows:** 196

## Factor coverage

| Factor | Observations | Places | Years | Inherited rows | Series-break rows |
|---|---:|---:|---|---:|---:|
| `air_quality` | 155 | 46 | 2015–2026 | 0 | 26 |
| `cost_of_living` | 390 | 26 | 2010–2024 | 0 | 0 |
| `health` | 61 | 61 | 2021–2021 | 29 | 0 |
| `per_capita_nsdp_constant` | 57 | 57 | 2023–2023 | 27 | 0 |
| `safety` | 183 | 61 | 2020–2022 | 87 | 0 |
| `unemployment_rate` | 57 | 57 | 2023–2023 | 27 | 0 |
| `water_quality` | 54 | 54 | 2021–2021 | 26 | 0 |

Inherited rows are city records that reuse the latest state-level observation for a factor whose published geography is the state. The dashboard shows the source year for each pillar.

## Missingness

Factors are stored only where an observation exists; the pipeline does not fill missing indicator-years. A place is unscored when two or more weighted factors are missing.

| Factor | Wide rows with a value | Blank rows | Coverage of place-years |
|---|---:|---:|---:|
| `air_quality` | 155 | 488 | 24.1% |
| `safety` | 183 | 460 | 28.5% |
| `health` | 61 | 582 | 9.5% |
| `per_capita_nsdp_constant` | 57 | 586 | 8.9% |
| `unemployment_rate` | 57 | 586 | 8.9% |
| `cost_of_living` | 390 | 253 | 60.7% |
| `water_quality` | 54 | 589 | 8.4% |

## Outliers

1997 source rows were flagged by the domain/IQR rules. See `reports/outlier_log.csv` for the original value, rule, and action.

## Structural validation

**PASSED** — no duplicate keys, unknown place IDs, or negative PM2.5 values.

This confirms output structure only. It does not confirm that the local extracts match their cited publications.

## Known limitations

- The local raw extracts have not been independently reconciled against their publishers.
- State-level air values are derived means of matched city observations, not independent state measurements.
- Safety rates for 2020 and 2021 use the 2022 projected population denominator.
- Cost-of-living values are modelled (`plfs_modeled`) or reference (`numbeo`) estimates.
- Trend projections are disabled because no factor has five comparable annual points after source breaks.
