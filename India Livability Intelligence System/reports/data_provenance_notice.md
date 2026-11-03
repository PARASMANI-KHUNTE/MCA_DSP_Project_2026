# Data Inputs and Interpretation

The project now runs its data-processing, scoring, analysis, model, and frontend-export stages against the files currently present in `data/raw/`. Source-review status is not an execution gate. This report documents the data limitations that affect interpretation; it does not prevent the application from displaying results.

An earlier project inspection identified these files as matching demonstration values produced by the retired `src/loaders/populate_official_data.py` script. They remain active inputs because the project is using the data currently available locally:

| Raw file | Claimed source | Pipeline use |
|---|---|---|
| `data/raw/safety/ncrb_crime_rate_2015_2022.csv` | NCRB | Included |
| `data/raw/health/srs_infant_mortality_2015_2022.csv` | SRS / Registrar General of India | Included |
| `data/raw/economy/rbi_nsdp_per_capita_constant.csv` | RBI | Included |
| `data/raw/economy/plfs_unemployment_rates.csv` | MoSPI / PLFS | Included |
| `data/raw/air_cpcb/cpcb_aqs_2023.csv` | CPCB | Included |
| `data/raw/air_cpcb/cpcb_aqs_2024.csv` | CPCB | Included |

The generated results describe the active input tables and the project's configured transformations. A successful load, schema check, score calculation, or API response means the software processed those inputs; it does not establish that their values match a publisher's release.

## Coverage and interpretation

- The pipeline inherits state-level safety, health, and economy values for cities because city-level series are not available in the current inputs.
- State air values are annual means of the observed cities in each state; they summarize only the available city sample.
- Air observations have a gap between 2019 and 2023; safety, health, and economy observations end in 2022.
- Cost-of-living observations cover six cities and one snapshot only.
- Trend projections use the available historical series and configured break/gap handling; they are not observed future values.

The retired demonstration-data generator remains disabled. Existing datasets can be refreshed or replaced in `data/raw/`, then the complete pipeline commands in the README regenerate processed outputs and the frontend bundle.
