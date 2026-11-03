# Data Inputs and Interpretation

Six local CSVs were confirmed as output from the retired placeholder generator and moved to `data/rejected/generated_placeholders/`. They are excluded from active loaders. See [fabrication audit](data_fabrication_audit.md).

The active pipeline currently reads the local Kaggle-labeled `city_day.csv` and `House_Rent_Dataset.csv`. They are not known matches for that generator, but their exact publisher versions, observation values, extraction lineage, and reuse terms have not been independently verified. A filename, source register entry, or schema match is not proof of authenticity.

The latest rebuild contains 48 city-year air observations across 18 cities and 40 state-year averages of available city observations across 13 states, plus six rent snapshots. State averages are derived summaries of the sampled cities, not independent state measurements. Missing values are left missing. Safety, health, and economy have no active observations; complete composite scores and rankings are therefore unavailable. Existing score configuration does not authorize scoring from an incomplete subset.

The map geography, place coordinates, region mapping, score bounds, weights, and display bands are hardcoded reference/configuration values, not source observations. Score bounds are analyst-selected anchors rather than empirical percentiles. Geometry and coordinate provenance still need documentation.

Pipeline validation confirms table structure and processing only; it does not verify source provenance. Do not describe current exploratory outputs as verified public-data findings.
