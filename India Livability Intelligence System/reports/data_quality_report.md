# Data Quality & Coverage Audit Report
### India Livability Intelligence System (MCA DSP Capstone 2026)
**Generated:** October 2026 | **Pipeline Version:** 1.0.0 | **Status:** Validated ✅

---

## 1. Executive Summary

This report establishes the empirical data quality, completeness, distributional properties, and normalization parameters across the multi-source dataset powering the **India Livability Intelligence System**.

| Metric | System Count | Validation Status |
|---|---|---|
| **Total Places Profiled** | **61** (32 States / UTs, 29 Cities) | Complete spatial registry verified |
| **Observation Horizon** | **2015 – 2024** (10 chronological years) | Temporal bounds verified |
| **Total Processed Rows (`factors_wide`)** | **501 rows** across places and years | Zero schema violations |
| **Total Factor Entries (`factors_tidy`)** | **1,234 valid observations** | Primary keys unique on `(place_id, year, factor)` |
| **Synthetic Imputations** | **0** | Strict adherence to zero-fabrication policy |
| **Automated Test Coverage** | **80 tests** (Unit, Integration, Parity, API) | 100% passing across all suites |

---

## 2. Source Register & Temporal Coverage

The platform integrates data across 5 distinct pillars from published statutory bodies and public data registers:

| Pillar | Indicator | Publisher / Source | Level | Temporal Window | Valid Count |
|---|---|---|---|---|---|
| **Air Quality** | PM2.5 Annual Mean ($\mu g/m^3$) | CPCB / Kaggle Open Data | City | 2015–2019, 2023–2024 | 98 |
| **Public Safety** | Violent Crime Rate (per lakh pop.) | National Crime Records Bureau (NCRB) | State | 2015–2022 | 443 |
| **Healthcare** | Infant Mortality Rate (per 1,000 births) | Sample Registration System (SRS) / RGI | State | 2015–2022 | 443 |
| **Economy** | Per-Capita NSDP at Constant Prices (₹) | Reserve Bank of India (RBI) | State | 2018–2022 | 122 |
| **Economy** | Unemployment Rate (% of labour force) | MoSPI Periodic Labour Force Survey | State | 2018–2022 | 122 |
| **Cost of Living** | Median 2BHK Rent (₹/month) | Metro Housing Dataset (CC BY-SA 4.0) | City (6 Metros) | 2022 (Snapshot) | 6 |

---

## 3. Empirical Distribution & Data-Driven Normalization Bounds

Rather than arbitrary estimates, normalization bounds are grounded in empirical 5th and 95th percentiles observed across the processed dataset, cross-referenced with national statutory standards (NAAQS, WHO, RBI):

| Factor / Indicator | Count | Min | 5th % | Median | 95th % | Max | Final Normalization Bounds | Direction | Grounding Rationale |
|---|---|---|---|---|---|---|---|---|---|
| **PM2.5 Air Quality** | 98 | 26.5 | 34.8 | 58.0 | 122.3 | 159.0 | **[10, 150] $\mu g/m^3$** | Lower is better | WHO Clean Air guideline (15) to Severe Air threshold (150); covers 95% of observations (122.3). |
| **Safety (Crime Rate)** | 443 | 48.2 | 140.2 | 252.8 | 510.4 | 1,540.2 | **[100, 600] per lakh** | Lower is better | Covers 5th–95th percentile (140 to 510); clips reporting outliers (e.g. Kerala high-reporting rate 1,540). |
| **Health (IMR)** | 443 | 5.0 | 10.0 | 25.0 | 46.0 | 50.0 | **[5, 50] per 1,000** | Lower is better | Exact empirical minimum (5.0, Kerala/Goa) to maximum (50.0, MP/UP); 5th–95th is [10.0, 46.0]. |
| **NSDP Per Capita (₹)** | 122 | 38,120 | 54,200 | 135,062 | 312,000 | 485,000 | **[₹50,000, ₹3,20,000]** | Higher is better | Derived from empirical 5th percentile (₹54.2k) and 95th percentile (₹312k) at constant 2011-12 prices. |
| **Unemployment Rate (%)** | 122 | 2.2% | 2.4% | 5.2% | 9.4% | 18.2% | **[2.0%, 10.0%]** | Lower is better | Anchored on 5th percentile (2.4%) and 95th percentile (9.4%); protects against single-year spikes. |
| **Cost of Living (Rent)** | 6 | 11,645 | 13,427 | 23,290 | 74,150 | 85,321 | **[₹10,000, ₹90,000]** | Lower is better | Covers empirical 6-metro spectrum: Kolkata (₹11.6k) to Mumbai (₹85.3k). |

---

## 4. Geographic Inheritance & Aggregation

Because comprehensive historical healthcare, safety, and macroeconomic indicators in India are published at the state/union territory level, city-level records inherit the surrounding state’s metric:

- **Total Inherited City-Factor Rows:** 580 instances.
- **Safety Inheritance:** 232 city-year observations inherited from state NCRB records.
- **Health Inheritance:** 232 city-year observations inherited from state SRS records.
- **Economic Indicators:** 58 city-year observations each for NSDP and Unemployment.
- **Transparency Policy:** The interactive dashboard displays an explicit `State-level inherited` badge on city detail cards, ensuring complete transparency for users and evaluators.

---

## 5. Temporal Discontinuities & Structural Series Breaks

1. **Air Quality (2020–2022 Pandemic Gap):**
   - Observations exist for 2015–2019 (Kaggle/CPCB historical) and 2023–2024 (CPCB portal).
   - Due to the COVID-19 nationwide lockdown distortion in 2020 and lack of harmonized continuous open feeds in 2021–2022, no synthetic interpolation was performed. The two segments are tracked with series break metadata.
2. **Criminal Justice Legislation (IPC $\to$ BNS Transition):**
   - The Indian Penal Code (IPC) was replaced by the Bharatiya Nyaya Sanhita (BNS) in July 2024. State safety series end in 2022; future ingestion from 2024 onward is flagged for structural reporting breaks.
3. **SRS Publication Lag:**
   - Infant mortality records maintain a 3-year lag; 2022 is the latest certified release.
4. **Cost of Living Snapshot:**
   - Six-city rental data represents a 2022 cross-sectional snapshot; time-series forecasting is programmatically disabled for this pillar (`trend: never`).

---

## 6. Pipeline Validation & Test Sign-off

- ✅ **Missing Value Policy:** Missing factor values are preserved as `null`/`NaN`. Composite scores dynamically re-normalize weights over available factors rather than inventing synthetic numbers.
- ✅ **Parity Verification:** The mathematical scoring engine in Python ([`src/scoring/scoring.py`](file:///f:/Codes/Projects/DSP%20Project/MCA_DSP_Project_2026/India%20Livability%20Intelligence%20System/src/scoring/scoring.py)) and the client-side JavaScript engine ([`frontend/src/services/scoringService.js`](file:///f:/Codes/Projects/DSP%20Project/MCA_DSP_Project_2026/India%20Livability%20Intelligence%20System/frontend/src/services/scoringService.js)) produce matching scores across all domains and re-weighting conditions (verified by [`tests/test_scoring_parity.py`](file:///f:/Codes/Projects/DSP%20Project/MCA_DSP_Project_2026/India%20Livability%20Intelligence%20System/tests/test_scoring_parity.py)).
- ✅ **Weight Presets:** Balanced preset adheres to the canonical **35% Air, 25% Safety, 25% Health, 15% Economy** baseline specification.
