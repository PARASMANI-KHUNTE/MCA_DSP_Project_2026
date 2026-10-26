"""
reports/generate_report.py
──────────────────────────
Generates the comprehensive 10-15 page Academic Project Report (Deliverable 9)
and exports both project_report.md and project_report.pdf.
"""

from pathlib import Path
from markdown_pdf import Section, MarkdownPdf

REPORT_MD = Path("reports/project_report.md")
REPORT_PDF = Path("reports/project_report.pdf")

content = """# India Livability Intelligence System
## A Multi-Criteria Analytical Framework, Statistical Trend Projections, and Interactive Spatial Decision Support System

**Course:** Data Science using Python (CAPCTD3 Elective-V)  
**Author:** Parasmani Khunte (MCA, Batch 2024–2026)  
**Date:** October 2026  
**Institution:** Department of Computer Applications  

---

## Abstract
Selecting an urban center or state to reside in within India is conventionally steered by anecdotal narratives, uncurated perceptions, or isolated cost indices. Public indicators concerning ambient air quality, public safety, infant healthcare outcomes, and macroeconomic opportunities are fragmented across disparate ministry repositories, varying measurement standards, and divergent spatial scales. This project establishes the **India Livability Intelligence System (ILIS)**: an end-to-end data science architecture and decision support system spanning 61 geographic entities (32 states/UTs and 29 metropolitan centers). 

The platform aggregates official time series from the Central Pollution Control Board (CPCB), Kaggle NCAP air quality monitoring, National Crime Records Bureau (NCRB), Sample Registration System (SRS) of the Registrar General of India, Reserve Bank of India (RBI), and Ministry of Statistics & Programme Implementation (MoSPI). A transparent multi-criteria composite scoring engine was engineered using min-max normalization, direction inversion, and customizable user personas. Long-term trajectories are modelled through Ordinary Least Squares (OLS) linear trend projections with approximate 95% confidence intervals. An offline K-Means comparison ($k=5$, mean silhouette $= 0.647$) is documented but not used for interactive tier labels; the interface instead applies explicit score bands. The system is deployed through a FastAPI backend and a React/Vite geospatial dashboard with client-side sensitivity evaluation.

---

## 1. Introduction & Problem Statement (M0 & M1)
India's rapid urbanization over the last two decades has spurred economic expansion alongside mounting infrastructural, ecological, and healthcare challenges. While metropolitan centers offer elevated household incomes, they frequently impose severe respiratory penalties, elevated living expenditures, and strain on civic infrastructure. Conversely, smaller urban centers may exhibit cleaner atmospheres yet constrained economic vibrancy.

Prior analytical attempts, such as the Ease of Living Index (EoLI) published by the Ministry of Housing and Urban Affairs (MoHUA), suffer from opaque weighting schemas, multi-year publication lags, and static cross-sectional snapshots devoid of longitudinal projections.

### 1.1 Project Objectives
1. **Multi-Source Data Integration:** Ingest, standardize, and reconcile multi-level public datasets spanning city-level daily air metrics and state-level socio-economic indicators across 2015–2024.
2. **Transparent Composite Indexing:** Formulate a normalized, direction-aware composite Livability Index (0–100) that allows dynamic stakeholder weight re-tuning.
3. **Statistical Hypothesis Testing:** Statistically evaluate regional disparities in environmental and developmental outcomes using parametric hypothesis tests (One-Way ANOVA and Pearson correlation).
4. **Statistical Projections & Offline Clustering:** Develop OLS trend models projecting composite scores over 2025–2034 with uncertainty bands, and retain K-Means as an offline comparison while using transparent score bands in the interface.
5. **Interactive Spatial Visualization:** Deliver an interactive choropleth and vector mapping dashboard supporting scenario modeling, ranking filters, and drill-down analytics.

---

## 2. Data Engineering & Pipeline Architecture (M2 & M3)

### 2.1 Data Sources & Provenance
The system relies exclusively on verified public repositories:
- **Air Quality (City-Level):** Kaggle Ambient Air Quality (2015–2019 daily readings across 34 cities) combined with CPCB National Ambient Air Quality Status reports (2023–2024 annual summaries).
- **Public Safety (State-Level):** National Crime Records Bureau (NCRB) *Crime in India* compendiums (2015–2022 cognizable IPC crime rates per 100,000 population).
- **Public Health (State-Level):** Sample Registration System (SRS) statistical bulletins (2015–2022 Infant Mortality Rates per 1,000 live births).
- **Economic Productivity (State-Level):** RBI Handbook of Statistics on Indian States (Per Capita Net State Domestic Product at constant 2011–12 prices).
- **Employment Health (State-Level):** MoSPI Periodic Labour Force Survey (PLFS Usual Status unemployment rates; processed intersections at 2018 and 2022).
- **Cost of Living (City Snapshot):** Kaggle Indian House Rent dataset (2022 snapshot across 6 major metropolises).

### 2.2 Data Cleaning & Transformation Pipeline
The ETL pipeline (`src.cleaning.run_pipeline`) enforces strict data integrity rules:
- **Entity Resolution:** Resolved non-standard state and municipal names via an alias mapping table (`data/raw/name_aliases.csv`).
- **Calendar & Unit Normalization:** Reconciled fiscal years (April–March) to calendar years and normalized all volumetric measures.
- **Outlier Mitigation:** Implemented Tukey's interquartile range (IQR) fencing ($[Q_1 - 1.5 \\text{IQR}, Q_3 + 1.5 \\text{IQR}]$) with non-destructive boolean outlier tagging.
- **Series Break Management:** Flagged the Kaggle-to-CPCB join as a structural series break due to the intervening 2020 COVID-19 disruption and sensor deployment expansions.
- **Dual Analytical Tables:** Exported both `factors_tidy.parquet` (long format preserving imputation, inheritance, and series-break flags) and `factors_wide.csv` (pivoted entity $\\times$ year table).

---

## 3. Exploratory Data Analysis & Statistical Inference (M4)

### 3.1 Univariate & Distributional Characteristics
Evaluation of primary indicators revealed significant skewness:
- **PM2.5 Concentrations:** Positive right-skewed distribution (mean $= 67.3$ µg/m³, standard deviation $= 29.5$ µg/m³, $n=98$), with the highest observed values exceeding 150 µg/m³.
- **Infant Mortality Rates:** Centered at 26.8 deaths per 1,000 live births (range: 5 in Kerala to 50 in Madhya Pradesh, $n=443$).
- **Per Capita NSDP:** Log-normal distribution spanning ₹38,120 (Bihar, 2018) to ₹485,000 (Goa, 2022), $n=122$.

### 3.2 Hypothesis Testing & Regional Disparity
A One-Way Analysis of Variance (ANOVA) was conducted across Indian geographic zones (South, West, North, Central, East, Northeast):
$$\\text{Null Hypothesis } H_0: \\mu_{\\text{South}} = \\mu_{\\text{West}} = \\mu_{\\text{North}} = \\mu_{\\text{Central}} = \\mu_{\\text{East}} = \\mu_{\\text{Northeast}}$$

**Result:** $F = 7.2338, p = 2.8868 \\times 10^{-5}$ across the latest complete cross-section (2022, $n=61$). With $p < 0.01$, the null hypothesis is rejected. Western places have the highest mean composite score (72.5), while the Central region has the lowest (43.2). This is a descriptive association for the processed cross-section, not a causal estimate.

Pearson correlation between ambient PM2.5 and infant mortality was $r = 0.2494$ ($p = 0.1207$, $n=40$) and is **not statistically significant**. By contrast, per-capita NSDP and infant mortality were negatively associated ($r = -0.6267$, $p = 1.15 \\times 10^{-14}$, $n=122$).

---

## 4. Livability Scoring Engine (M5)

### 4.1 Mathematical Normalization
Raw indicators operate on disparate physical dimensions (µg/m³, per lakh, per thousand, rupees). Each factor $x$ is normalized to a bounded scale $S \\in [0, 100]$:

**Higher is Better (e.g., Economic Output):**
$$S_i = 100 \\times \\frac{\\text{clip}(x_i, \\text{lo}, \\text{hi}) - \\text{lo}}{\\text{hi} - \\text{lo}}$$

**Lower is Better (e.g., PM2.5, Crime, Infant Mortality, Unemployment):**
$$S_i = 100 \\times \\frac{\\text{hi} - \\text{clip}(x_i, \\text{lo}, \\text{hi})}{\\text{hi} - \\text{lo}}$$

### 4.2 Weighted Aggregation
Let $w_k$ represent user-defined weights across $K$ factors. Weights are dynamically normalized such that $\\sum_{k} w_k = 1.0$:
$$\\text{Score} = \\sum_{k=1}^{K} w_k \\cdot S_k$$

Where factor data is missing for an entity, the denominator includes only observed factors with positive weight. The interface also reports the number of available pillars and shows source years, preserving analytical transparency.

### 4.3 Default Persona Presets
- **Balanced Baseline:** Air (30%), Safety (25%), Health (25%), Economy (20%), Cost (0%).
- **Clean Air & Greenery:** Air (55%), Safety (15%), Health (20%), Economy (10%), Cost (0%).
- **Family & Wellbeing:** Air (20%), Safety (40%), Health (30%), Economy (10%), Cost (0%).
- **Career & Economic Growth:** Air (10%), Safety (20%), Health (20%), Economy (50%), Cost (0%).
- **Student / Budget Living:** Air (15%), Safety (25%), Health (15%), Economy (20%), Cost (25%).

---

## 5. Statistical Trend Models & Offline Clustering (M6)

### 5.1 OLS Linear Trend Projection
For each entity with at least **5** observed yearly composite scores, an Ordinary Least Squares (OLS) regression was fitted against time:
$$y_t = \\beta_0 + \\beta_1 t + \\epsilon_t$$

Observed histories cover 2015–2024; projections extend across 2025–2034. The slope coefficient $\\beta_1$ determines the qualitative outlook:
- **Improving:** slope is positive and the two-sided slope test gives $p < 0.05$.
- **Declining:** slope is negative and $p < 0.05$.
- **Stable:** slope is not statistically significant at $p < 0.05$.
- **Insufficient data:** fewer than five observed yearly composite scores.

All projections carry approximate 95% confidence intervals and explicit warnings regarding naive linear extrapolation over policy disruptions.

### 5.2 Offline K-Means Comparison
K-Means was executed as an offline comparison, with Z-score-standardized feature inputs and silhouette analysis over $k \\in [2, 7]$. The saved assignments are not used to label places in the application because the cluster membership is not consistent with the stored evaluation outputs; the interface uses explicit score bands instead.

| Number of Clusters ($k$) | Inertia | Mean Silhouette Score |
|---|---|---|
| $k=2$ | 13.2 | 0.619 |
| $k=3$ | 6.2 | 0.549 |
| $k=4$ | 2.6 | 0.646 |
| **$k=5$ (Optimal)** | **2.0** | **0.647** |
| $k=6$ | 1.4 | 0.550 |
| $k=7$ | 0.7 | 0.603 |

The saved cluster profiles have mean composite scores ranging from 22.9 to 81.3. These profile values are reported as an offline diagnostic only; they are not presented as developmental tiers or causal groupings.

---

## 6. System Architecture & Full-Stack Implementation (M7, M8, M9)

### 6.1 Backend API (FastAPI)
The backend architecture is structured around modular, asynchronous micro-services:
- `backend/app/main.py`: Application lifespan management, CORS configuration, and route binding.
- `backend/app/core/loader.py`: Singleton in-memory DataStore caching pre-processed datasets at startup.
- `backend/app/api/routes_places.py`: Entity catalogue, spatial coordinates, and detailed factor histories.
- `backend/app/api/routes_score.py`: Real-time composite scoring and custom weight computation engine.
- Interactive documentation auto-generated via OpenAPI Specification at `/docs` and `/redoc`.

### 6.2 Frontend Geospatial Interface (React + Vite)
Built as a responsive single-page web application featuring:
- **SVG Vector Map Engine:** Interactive pan-and-zoom India map rendering all 32 states/UTs and 29 metropolitan pinpoints.
- **Multi-Pillar Color Modes:** Real-time choropleth switching between Composite Livability, individual pillars, and explicit score bands.
- **Dynamic Weight Sliders & Presets:** Sliders with instant client-side recalculation of scores and rankings.
- **Detailed Entity Modal:** Longitudinal trend charts, radar pillar profiles, and data source attributions.

---

## 7. Testing, Verification, and Reliability (M10)
A rigorous automated test suite was constructed using `pytest` (`tests/`):
1. **Schema & Referential Integrity Tests:** Validated that all entities in analytical tables strictly resolve to `places.csv` and that no duplicate records exist.
2. **Coverage Assertions:** Ensured every place retains valid core factor data and no negative physical quantities occur.
3. **Scoring Engine Invariants:** Verified boundary behavior ($lo \\to 0$, $hi \\to 100$), direction consistency, and weight normalization determinism.
4. **Model Safety Tests:** Checked that trend fitting uses only observed yearly scores, preserves missing years, and that offline K-Means metrics are reproducible.
5. **API Integration Tests:** Automated HTTP request verification for schema conformance across all exposed endpoints.

**Result:** 59 tests passed, 1 skipped, 0 failures.

---

## 8. Ethical Considerations, Fairness, and Limitations (M11 & CO6)
1. **Ecological Fallacy:** City scores for safety, health, and economy inherit state-level aggregates due to the absence of centralized municipal crime and healthcare registries. Users are transparently alerted via UI badges.
2. **COVID-19 Disruption:** Data between 2020 and 2022 reflects anomalous lockdown drops in industrial emissions and economic fluctuations; models incorporate structural break indicators rather than assuming seamless continuity.
3. **Algorithmic Accountability:** Livability is subjective. Rather than imposing a prescriptive index, the platform empowers citizens to transparently set their own values and inspect underlying metrics.

---

## 9. Conclusion
The India Livability Intelligence System successfully demonstrates how heterogeneous public data sources can be unified into an empirically grounded, statistically verified, and citizen-accessible intelligence platform. By bridging data science rigor with intuitive spatial design, the system provides transparent insights into the real trade-offs defining India's living environments.

---

## References & Data Citations
1. Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change, Government of India. *National Ambient Air Quality Monitoring Programme (NAMP) Reports*, 2023–2024.
2. National Crime Records Bureau (NCRB), Ministry of Home Affairs, Government of India. *Crime in India Compendiums*, 2015–2022.
3. Office of the Registrar General & Census Commissioner, India. *Sample Registration System (SRS) Bulletins: Infant Mortality Rates*, 2015–2022.
4. Reserve Bank of India (RBI). *Handbook of Statistics on Indian States: Table 16 - Per Capita Net State Domestic Product*, 2015–2024.
5. Ministry of Statistics and Programme Implementation (MoSPI). *Periodic Labour Force Survey (PLFS) Annual Reports*, 2018–2023.
"""

REPORT_MD.write_text(content, encoding="utf-8")
print(f"Saved: {REPORT_MD}")

pdf = MarkdownPdf(toc_level=2)
pdf.add_section(Section(content))
pdf.save(str(REPORT_PDF))
print(f"Saved: {REPORT_PDF}")
