# Data Inputs and Interpretation

**Last reviewed:** 14 November 2026

Six local CSVs were confirmed as output from the retired placeholder generator and moved to `data/rejected/generated_placeholders/`. They are excluded from active loaders. See [fabrication audit](data_fabrication_audit.md).

The active pipeline reads local extracts for air quality, cost of living, NCRB safety, NFHS-5 health, RBI NSDP, PLFS unemployment, and CPCB water quality. None is a known match for that generator, but their exact publisher versions, observation values, extraction lineage, and reuse terms have not been independently verified. A filename, source register entry, or schema match is not proof of authenticity.

The latest rebuild covers 61 places: 155 air observations across 46 places (2015–2019 and 2025–2026), 183 safety observations across 61 places (2020–2022), 61 health observations (2021), 57 NSDP and 57 unemployment observations (2023), 390 cost-of-living observations across 26 cities (2010–2024), and 54 water-quality observations (2021). State-level values inherited by cities are flagged in the dashboard with their source year. State air values are derived summaries of the sampled cities, not independent state measurements. Missing values are left missing; the pipeline does not impute.

A balanced composite is available for places that have the weighted factors. Places missing one weighted factor are reweighted and marked partial; places missing two or more remain unscored. Trend projection is disabled for every factor, so no projections are published.

The map geography, place coordinates, region mapping, weights, and display bands are hardcoded reference/configuration values, not source observations. Score normalization anchors are calibrated 5th/95th percentiles of the processed snapshot (see [bounds calibration](bounds_calibration.md)); they are data-derived but not externally validated. Geometry and coordinate provenance still need documentation.

Pipeline validation confirms table structure and processing only; it does not verify source provenance. Do not describe current exploratory outputs as verified public-data findings.
