# Key Findings and Statistical Analysis Report
**India Livability Intelligence System (ILIS)**  
*CAPCTD3 Elective-V: Data Science using Python*  
*Date: 26 October 2026 | Author: Parasmani Khunte (MCA, 2026)*

---

## 1. Executive Summary
This report synthesizes empirical findings from 61 Indian places (32 states/UTs and 29 metropolitan centers) and 320 processed factor-year rows. The cross-section below uses **2023**, the latest year with at least 50 scored places; 2023–2024 scores cover cities only because the state safety/health/economy series end in 2022.

| Metric | Result | Interpretation |
|---|---|---|
| **One-Way ANOVA (Regional Livability, 2023)** | $F = 13.27, p = 3.3757e-04$ | Regional differences are statistically significant at $\alpha = 0.05$ across 24 scored places. |
| **Pearson Correlation (PM2.5 vs IMR)** | $r = 0.00, p = 1.0000$ | Association is not statistically significant; only 0 rows have both values. |
| **Pearson Correlation (NSDP vs IMR)** | $r = 0.00, p = 1.0000e+00$ | Higher per-capita NSDP is not statistically significant and negatively associated with infant mortality. |
| **Trend Outlook (place-factor series)** | Improving: 10, Declining: 0, Stable/uncertain: 16, Insufficient: 218 | 26 series meet the minimum observation rule for an outlook. |
| **K-Means Analysis (offline)** | k=7, silhouette=0.812 | Offline K-Means analysis selected $k=7$ (mean silhouette 0.812); cluster profile scores span 38.7 to 75.5. The interactive interface uses explicit score bands instead of cluster labels. |

---

## 2. Key Statistical Insights

### 2.1 Regional Disparities (M4.3 & M4.4)
- **West:** 2 scored places, mean 66.7, median 66.7.
- **South:** 8 scored places, mean 64.1, median 61.6.
- **Northeast:** 2 scored places, mean 59.9, median 59.9.
- **East:** 4 scored places, mean 57.4, median 57.4.
- **North:** 8 scored places, mean 44.0, median 42.6.

The null hypothesis of equal regional means is **rejected** at $\alpha = 0.05$ ($F = 13.27, p = 3.3757e-04$). This describes the latest broad cross-section, not a causal claim about any individual place.

### 2.2 Factor Correlations (M4.5)
- **Air Quality and Infant Mortality:** $r = 0.00$ ($p = 1.0000$, n = 0). This is not statistically significant; the limited overlap comes from city-level air observations and state-level health series.
- **Economic Output and Infant Mortality:** $r = 0.00$ ($p = 1.0000e+00$, n = 0). The negative direction is consistent with higher state income accompanying lower infant mortality, but remains an association rather than a causal estimate.

### 2.3 Trends and Clustering (M6)
- **OLS Projections:** Trends are fitted to observed 2015–2024 series and projected to 2034 only when at least five yearly points exist. Missing years stay missing; no synthetic interpolation is added for the web app.
- **Outlook Counts:** 10 improving, 0 declining, 16 stable/uncertain, and 218 insufficient-data place-factor series.
- **K-Means:** Offline K-Means analysis selected $k=7$ (mean silhouette 0.812); cluster profile scores span 38.7 to 75.5. The interactive interface uses explicit score bands instead of cluster labels.

---

## 3. Known Data Gaps
- Air has processed observations for 2015–2019 and 2023–2024, with no 2021–2022 values.
- State safety, health and economy end in 2022; 2023–2024 city scores inherit those latest observations and display the source year.
- Cost of living is a 2022 rent snapshot for six metros and is never trended.
- Population is not present in the processed data, so pins use a fixed scale.

---

## 4. Visual Figures Generated
All visual outputs conform to the M4.6 Matplotlib & Seaborn checklist and are stored in `reports/figures/`:
1. `01_univariate_distributions.png`: Histograms and KDE plots for core factors.
2. `02_regional_boxplots.png`: Composite score distribution by region for 2023.
3. `03_correlation_heatmap.png`: Correlation matrix across livability pillars.
4. `04_air_quality_trends.png`: PM2.5 trajectories for major cities against CPCB and WHO thresholds.
5. `05_kmeans_clusters.png`: K-Means silhouette curve and offline cluster score profiles.
6. `06_scatter_relationships.png`: PM2.5 vs infant mortality scatter plot.
7. `07_top_bottom_rankings.png`: Top and bottom 10 places for 2023.
8. `08_coverage_matrix.png`: Factor completeness across the processed panel.
