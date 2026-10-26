# India Livability Intelligence System (ILIS)
## Data-Driven Livability Index with Interactive Map and Trend Projection

**Course:** Data Science using Python (CAPCTD3 Elective-V)  
**Presenter:** Parasmani Khunte (MCA, Batch 2024–2026)  
**Project Defense & Viva Presentation (5-Minute Script)**  

---

# Slide 1: The Problem & Pitch
- **Anecdotes vs. Evidence:** People choosing where to relocate or invest in India rely on informal hearsay rather than objective data.
- **Data Fragmentation:** Environmental, crime, healthcare, and economic data are isolated across separate government ministries with different spatial resolutions and naming formats.
- **Three-Sentence Pitch:**  
  *We integrated official government data on air quality, crime, health, and economy across 61 Indian places into a unified pipeline.*  
  *We built a transparent, adjustable composite livability score with OLS trend projections and an offline clustering comparison.*  
  *We deployed it as a live interactive map where citizens and policymakers can explore trade-offs and test scenarios in real time.*

---

# Slide 2: Scope & Verified Data Architecture
- **Geographic Coverage:** 61 Places — 32 States/UTs + 29 Metropolitan Cities.
- **Core Pillars (2015–2024 where available):**
  1. **Air Quality:** Kaggle NCAP (2015–2019) + CPCB annual monitoring (2023–2024).
  2. **Public Safety:** NCRB Crime in India, state-level, 2015–2022.
  3. **Healthcare:** Sample Registration System (SRS) Infant Mortality Rates, state-level, 2015–2022.
  4. **Economy:** RBI Per Capita NSDP (2018 and 2022) + MoSPI PLFS unemployment.
- **Optional Snapshot:** 2022 house-rent snapshot for 6 Tier-1 metropolises; never trended.
- **Data Pipeline:** Entity alias resolution, calendar synchronization, Tukey IQR outlier flagging, and dual export (`factors_tidy.parquet` + `factors_wide.csv`).

---

# Slide 3: Statistical Findings & Hypothesis Testing
- **Regional ANOVA (2022 cross-section, $H_0$: Regional means are equal):**
  - **Result:** $F = 7.23, p = 2.89 \times 10^{-5} < 0.01$ across 61 scored places.
  - Western places average 72.5 versus 43.2 in the Central region. This describes the latest complete state-level cross-section, not a causal claim.
- **Correlation Insights:**
  - Economic Output (NSDP) is negatively associated with infant mortality ($r = -0.63, p < 0.001, n = 122$).
  - The PM2.5–infant mortality overlap is smaller and not significant ($r = 0.25, p = 0.121, n = 40$).
- **Matplotlib & Seaborn Suite:** 8 publication figures generated in `reports/figures/`.

---

# Slide 4: Livability Scoring Engine
- **Formula & Inversion:**
  - Higher is better (Economy): $S_i = 100 \times \frac{\text{val} - \text{lo}}{\text{hi} - \text{lo}}$
  - Lower is better (Air, Crime, IMR, Unemployment): $S_i = 100 \times \frac{\text{hi} - \text{val}}{\text{hi} - \text{lo}}$
- **Dynamic Weighting:** Supports 5 citizen personas (Balanced, Clean Air, Family & Health, Career, Budget Living).
- **Inheritance & Partial Data Transparency:** Cities inherit state safety/health/economy with explicit metadata flags.

---

# Slide 5: Trend Projections & Offline Clustering
- **OLS Trend Projections (2025–2034):**
  - Uses observed 2015–2024 histories and requires at least 5 yearly points.
  - Reports 95% confidence intervals and does not interpolate missing years.
  - A significant slope ($p < 0.05$) gives *Improving* or *Declining*; otherwise *Stable*.
- **K-Means Comparison ($k=5$, silhouette $0.647$):**
  - Retained as offline analysis with mean cluster scores from 22.9 to 81.3.
  - The app uses explicit score bands — High $\ge 70$, Moderate $50$–$69.9$, Developing $<50$ — instead of cluster labels.
  - Cluster tier names are not presented as official classifications.

---

# Slide 6: Architecture & Implementation Demo
- **Backend (FastAPI):** In-memory DataStore, async request handling, auto OpenAPI docs at `/docs`.
- **Frontend (React + Vite):** Interactive vector India map, dynamic weight recalculation in milliseconds, radar charts, and detail views.
- **Automated Testing:** 59 pytest tests passed, 1 skipped, 0 failures.
- **Docker Compose:** Multi-container orchestration ready for production deployment.

---

# Slide 7: Ethics, Limitations & Future Work
- **Limitations Acknowledged:**
  - City scores inherit state-level safety, health, and economy data.
  - Air quality joins two series across a COVID-19 data gap.
  - Trend projections are naive linear baselines, not macroeconomic forecasts.
- **Responsible Communication:** User weights are explicitly citizen-driven; confidence intervals prevent false precision.
- **Future Expansion:** Ingestion of ward-level sensor feeds, climate vulnerability metrics, and water security datasets.
