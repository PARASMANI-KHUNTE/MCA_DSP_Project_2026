# Key Findings and Statistical Analysis Report
**India Livability Intelligence System (ILIS)**  
*CAPCTD3 Elective-V: Data Science using Python*  
*Date: 15 November 2026 | Author: Parasmani Khunte (MCA, 2026)*

---

## 1. Executive Summary
This report synthesizes empirical findings from 61 Indian places (32 states/UTs and 29 cities) and 643 processed factor-year rows. The cross-section below uses **2026**, the latest year with at least 50 scored places. Composite scores use each place's latest observation at or before the selected year, so city scores can inherit state safety, health and economy values whose source years are older.

| Metric | Result | Interpretation |
|---|---|---|
| **One-Way ANOVA (Regional Livability, 2026)** | $F = 0.90, p = 4.8896e-01$ | Regional differences are not statistically significant at $\alpha = 0.05$ across 60 scored places. |
| **Pearson Correlation (PM2.5 vs NFHS-5 health index)** | Not computable | Not computed: only 0 rows have both values (at least 6 are required). City-level air observations and the state health snapshot do not overlap enough in this rebuild. |
| **Pearson Correlation (NSDP vs NFHS-5 health index)** | Not computable | Not computed: only 0 rows have both values (at least 6 are required). |
| **Trend fitting (M6)** | Disabled — 0 series fitted | Every factor is configured `trend: never`, so no projections or outlooks are published. |
| **K-Means Analysis (offline)** | k=2, silhouette=0.581 | Offline K-Means analysis selected $k=2$ (mean silhouette 0.581); cluster profile scores span 45.9 to 68.7. The interactive interface uses explicit score bands instead of cluster labels. |

---

## 2. Key Statistical Insights

### 2.1 Regional Disparities (M4.3 & M4.4)
- **South:** 11 scored places, mean 65.8, median 75.1.
- **Northeast:** 9 scored places, mean 62.6, median 62.5.
- **West:** 8 scored places, mean 61.6, median 65.1.
- **Central:** 5 scored places, mean 59.2, median 55.0.
- **North:** 18 scored places, mean 59.1, median 59.7.
- **East:** 9 scored places, mean 53.4, median 57.6.

The null hypothesis of equal regional means is **not rejected** at $\alpha = 0.05$ ($F = 0.90, p = 4.8896e-01$). This describes the latest broad cross-section, not a causal claim about any individual place.

### 2.2 Factor Correlations (M4.5)
- **Air Quality and the NFHS-5 Health Index:** Not computed: only 0 rows have both values (at least 6 are required). City-level air observations and the state health snapshot do not overlap enough in this rebuild.
- **Economic Output and the NFHS-5 Health Index:** Not computed: only 0 rows have both values (at least 6 are required).

### 2.3 Trends and Clustering (M6)
- **OLS Trends:** Disabled for every factor in `src/scoring/factors_config.yaml` (`trend: never`). 0 place-factor series were fitted, so no projections or outlooks are published. Missing years stay missing; no synthetic interpolation is added for the web app.
- **Outlook Counts:** 0 improving, 0 declining, 0 stable/uncertain, and 0 insufficient-data place-factor series.
- **K-Means:** Offline K-Means analysis selected $k=2$ (mean silhouette 0.581); cluster profile scores span 45.9 to 68.7. The interactive interface uses explicit score bands instead of cluster labels.

---

## 3. Known Data Gaps
- Air has historic processed observations for 2015–2019 and enriched observations for 2025–2026, with no 2020–2024 values. Every enriched 2025–2026 city-year is flagged as sparse because it has fewer than seven PM2.5 observations.
- Safety ends in 2022, health and water quality are 2021 snapshots, and the economy indicators are 2023. City scores inherit those latest state observations and display the source year.
- Cost of living is modelled/estimated city rent for 2010–2024 across 26 matched cities and is never trended.
- Population is not present in the processed data, so pins use a fixed scale.

---

## 4. Visual Figures Generated
All visual outputs conform to the M4.6 Matplotlib & Seaborn checklist and are stored in `reports/figures/`:
1. `01_univariate_distributions.png`: Histograms and KDE plots for core factors.
2. `02_regional_boxplots.png`: Composite score distribution by region for 2026.
3. `03_correlation_heatmap.png`: Correlation matrix across livability pillars.
4. `04_air_quality_trends.png`: PM2.5 trajectories for major cities against CPCB and WHO thresholds.
5. `05_kmeans_clusters.png`: K-Means silhouette curve and offline cluster score profiles.
6. `06_scatter_relationships.png`: PM2.5 vs NFHS-5 health index scatter plot.
7. `07_top_bottom_rankings.png`: Top and bottom 10 places for 2026.
8. `08_coverage_matrix.png`: Factor completeness across the processed panel.
