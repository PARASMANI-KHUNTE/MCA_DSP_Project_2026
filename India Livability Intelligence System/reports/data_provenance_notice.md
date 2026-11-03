# Data Provenance Notice

**Status: blocked pending source-data replacement**  
**Checked:** 3 November 2026

The files listed below have SHA-256 fingerprints identical to outputs from the retired `src/loaders/populate_official_data.py`. That script used hard-coded demonstration values and labelled them as official observations. They are not verified NCRB, SRS, RBI, MoSPI, or CPCB records.

| Raw file | Claimed source | Current treatment |
|---|---|---|
| `data/raw/safety/ncrb_crime_rate_2015_2022.csv` | NCRB | Blocked from pipeline |
| `data/raw/health/srs_infant_mortality_2015_2022.csv` | SRS / Registrar General of India | Blocked from pipeline |
| `data/raw/economy/rbi_nsdp_per_capita_constant.csv` | RBI | Blocked from pipeline |
| `data/raw/economy/plfs_unemployment_rates.csv` | MoSPI / PLFS | Blocked from pipeline |
| `data/raw/air_cpcb/cpcb_aqs_2023.csv` | CPCB | Blocked from pipeline |
| `data/raw/air_cpcb/cpcb_aqs_2024.csv` | CPCB | Blocked from pipeline |

The current generated scores, trends, cluster summaries, statistical findings, project report, slides, and frontend bundle depend on some or all of these inputs. Their numeric claims are withdrawn until verified source files replace the placeholders and the cleaning, scoring, analysis, frontend export, reports, and tests are rerun.

The pipeline and frontend exporter compare these known file fingerprints and stop if they match. The retired generator now raises an error. Existing raw and processed files were left in place for inspection; they have not been silently deleted or overwritten. The frontend displays a persistent warning because its current embedded bundle is marked `unverified`.

## Revalidation steps

1. Download the actual source releases and retain their original files.
2. Record the exact release/table URL, publisher, license/terms, retrieval date, year coverage, and any extraction steps in the source register.
3. Replace the placeholder CSVs with source-derived values and independently spot-check them against the source publication.
4. Run the coverage check; revise the place list to include only entities meeting the verified eligibility rules.
5. Run `make data`, scoring, model evaluation, EDA, and frontend export. Reconcile all report dates/counts with those outputs.
6. Review licensing for the Kaggle datasets and boundary geometry. The current licenses are not sufficiently verified for redistribution; the map geometry's provenance is not documented.
7. Remove the data verification warning only after the new files and generated outputs have been reviewed.
