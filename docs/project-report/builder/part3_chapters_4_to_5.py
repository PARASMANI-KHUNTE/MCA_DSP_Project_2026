"""
part3_chapters_4_to_5.py
────────────────────────
Chapters 4 and 5 for India Livability Intelligence System academic report.
"""

CHAPTERS_4_TO_5_MD = r"""# CHAPTER 4: SYSTEM ANALYSIS AND DESIGN

## 4.1 Functional Requirements Specification
The system implements a rigorous set of functional requirements:
- **FR-01 (Multi-Source Ingestion):** The system shall ingest raw public datasets across ambient air quality, crime statistics, health surveys, economic accounts, rental listings, and water quality snapshots without manual re-formatting.
- **FR-02 (Entity Resolution):** The system shall map non-standard state and municipal names to standardized ISO-style place identifiers (`place_id`, e.g., `IN-MH-MUM` for Mumbai, `IN-KA` for Karnataka).
- **FR-03 (Outlier Mitigation):** The system shall flag statistical outliers using Tukey's IQR fencing ($[Q_1 - 1.5 \mathrm{IQR}, Q_3 + 1.5 \mathrm{IQR}]$) non-destructively, preserving raw values while preventing distortion in downstream scaling.
- **FR-04 (Directional Normalization):** The system shall scale physical features to a uniform 0–100 scale, applying inverse scaling ($100 \times \frac{hi - x}{hi - lo}$) for negative indicators and direct scaling ($100 \times \frac{x - lo}{hi - lo}$) for positive indicators.
- **FR-05 (Dynamic Weight Normalization):** The system shall dynamically normalize user weights such that $\sum w_k = 1.0$, automatically re-allocating weights when a place possesses partial data across the requested factors.
- **FR-06 (Persona Configuration):** The system shall provide five pre-configured stakeholder personas (Balanced, Clean Air, Family, Career, Student) and permit custom weight definitions.
- **FR-07 (OLS Trend Projections):** The system shall compute OLS linear regression models for entities with $\ge 5$ observed historical points, projecting scores 10 years forward (2025–2034) with 95% confidence bounds.
- **FR-08 (Interactive Geospatial Visualization):** The system shall render an interactive SVG India map supporting real-time choropleth coloring, hover tooltips, and place selection.
- **FR-09 (Detailed Entity Diagnostics):** The system shall display longitudinal historical trajectories, radar profiles, and source attribution badges upon entity selection.
- **FR-10 (RESTful Service Exposure):** The system shall expose all entities, scores, trends, clusters, and source attributions via documented REST API endpoints.

## 4.2 Non-Functional Requirements Specification
- **NFR-01 (Performance & Latency):** Client-side scoring recalculations upon slider adjustment shall execute in $< 10$ milliseconds. Backend API response times for pre-loaded endpoints shall not exceed 50 milliseconds under standard concurrency.
- **NFR-02 (Data Integrity & Reproducibility):** All scoring computations and machine learning fits shall be strictly deterministic. Re-running the pipeline with identical seeds (`KMEANS_SEED = 42`) shall produce identical outputs.
- **NFR-03 (Transparency & Attribution):** The system shall never present proxy state-level metrics as municipal measurements without explicitly attaching an `is_inherited` indicator.
- **NFR-04 (Graceful Degradation):** If an indicator file is unavailable, the system shall log the absence, compute scores over the remaining available factors, and alert the user rather than terminating with an unhandled exception.
- **NFR-05 (Cross-Platform Compatibility):** The software shall execute identically across Windows, Linux, and macOS environments without requiring platform-specific binary dependencies.

## 4.3 End-to-End System Architecture
The India Livability Intelligence System is organized into three decoupled tiers: the Offline Data Engineering Core, the Backend REST Microservice, and the Client-Side Geospatial Dashboard.

![Figure 4.1: High-Level System Architecture](diagrams/high_level_architecture.png)

*Figure 4.1 illustrates the structural interaction between the public data sources, the Python data engineering core, the FastAPI service, and the React 19 single-page application.*

## 4.4 Data Pipeline & ETL Architecture
The extract, transform, load (ETL) pipeline is orchestrated by `src/cleaning/run_pipeline.py`. It executes sequentially across four modular stages:

![Figure 4.2: Data Ingestion and Analytical Pipeline](diagrams/data_ingestion_pipeline.png)

1. **Stage 1 (Load & Audit):** Ingests raw files from `data/raw/` via dedicated loader scripts. Each file is verified against the SHA-256 provenance register; unverified placeholder files are quarantined in `data/rejected/generated_placeholders/`.
2. **Stage 2 (Standardization & Aliasing):** Resolves geographic names against `data/raw/name_aliases.csv`. Aligns fiscal years (April–March) to calendar years and standardizes physical units.
3. **Stage 3 (Outlier & Quality Fencing):** Applies Tukey's IQR fencing using `flag_outliers()` in `src/utils/helpers.py`. Outliers are recorded in `reports/outlier_log.csv` and flagged without destroying underlying observations. Structural breaks (such as the 2020 COVID-19 lockdown) are tagged with `series_break = True`.
4. **Stage 4 (Consolidation & Export):** Merges cleaned indicators into `factors_tidy.parquet` (audit log format) and `factors_wide.csv` (pivoted matrix).

## 4.5 Data Modeling & Analytical Schemas
The system enforces strict relational and dimensional schemas across all processed artifacts.

### Table 4.1: Primary Entities Master Specification (`places.csv`)
| Column Name | Physical Data Type | Constraints & Range | Description |
|---|---|---|---|
| `place_id` | `VARCHAR(16)` | Primary Key, Unique, Not Null | Standardized identifier (`IN-XX` for states, `IN-XX-YYY` for cities) |
| `place_name` | `VARCHAR(64)` | Not Null | Official display name of the administrative entity |
| `place_type` | `VARCHAR(8)` | Enum: `state`, `city` | Administrative classification level |
| `state_name` | `VARCHAR(64)` | Not Null | Parent state or Union Territory name |
| `latitude` | `FLOAT` | $8.0 \le \text{lat} \le 37.5$ | Geographic centroid latitude for spatial rendering |
| `longitude` | `FLOAT` | $68.0 \le \text{lon} \le 97.5$ | Geographic centroid longitude for spatial rendering |
| `region` | `VARCHAR(16)` | Enum: `North, South, West, East, Central, Northeast` | Macro-geographic zone for ANOVA and disparity modeling |

### Table 4.2: Long Analytical Schema (`factors_tidy.parquet`)
| Column Name | Physical Data Type | Nullable | Description |
|---|---|---|---|
| `place_id` | `VARCHAR(16)` | No | Foreign Key referencing `places.place_id` |
| `year` | `INT16` | No | Observation year ($2010 \le \text{year} \le 2026$) |
| `factor` | `VARCHAR(32)` | No | Factor identifier (e.g., `air_quality`, `safety`, `health`) |
| `indicator` | `VARCHAR(32)` | No | Specific underlying metric (e.g., `pm25`, `crime_rate_per_lakh`) |
| `value_raw` | `FLOAT32` | Yes | Un-normalized physical measurement in native units |
| `value_norm` | `FLOAT32` | Yes | Directionally normalized score bounded in $[0, 100]$ |
| `is_imputed` | `BOOLEAN` | No | Flag indicating if value was statistically imputed |
| `is_inherited` | `BOOLEAN` | No | Flag indicating if municipal score was inherited from state |
| `series_break`| `BOOLEAN` | No | Flag indicating structural discontinuity in time series |
| `gap_flag` | `VARCHAR(32)` | Yes | Specific data qualification note (e.g., `sparse_observations`) |

### Table 4.3: Consolidated Cross-Sectional Table (`factors_wide.csv`)
The wide table pivots indicators into tabular feature vectors per `place_id` × `year`. Columns include:
`place_id`, `year`, `air_quality`, `cost_of_living`, `health`, `per_capita_nsdp_constant`, `safety`, `unemployment_rate`, `water_quality`, followed by corresponding boolean `_series_break` and text `_gap_flag` columns for each factor.

### Table 4.4: Composite Scoring Output Schema (`scores_wide.csv`)
| Column Name | Physical Data Type | Description |
|---|---|---|
| `place_id` | `VARCHAR(16)` | Foreign Key referencing `places.place_id` |
| `year` | `INT16` | Analytical evaluation year |
| `air_quality_score` | `FLOAT32` | Normalized air quality pillar score (0–100) |
| `safety_score` | `FLOAT32` | Normalized public safety pillar score (0–100) |
| `health_score` | `FLOAT32` | Normalized public health pillar score (0–100) |
| `economy_score` | `FLOAT32` | Normalized economic vitality composite score (0–100) |
| `score` | `FLOAT32` | Final weighted composite livability index (0–100) |
| `partial_data` | `BOOLEAN` | True if entity was scored with fewer than 4 core factors |
| `missing_factors`| `VARCHAR(256)` | JSON-formatted array of omitted factor names |
| `weights_used` | `VARCHAR(256)` | JSON-formatted dictionary of normalized factor weights applied |
| `rank` | `INT16` | Ordinal livability rank within the given year (1 = highest) |

### Table 4.5: Longitudinal Trend Projections Schema (`trends.csv`)
| Column Name | Physical Data Type | Description |
|---|---|---|
| `place_id` | `VARCHAR(16)` | Foreign Key referencing `places.place_id` |
| `factor` | `VARCHAR(32)` | Analyzed pillar or `composite` |
| `n_points` | `INT8` | Count of valid historical yearly observations |
| `slope` | `FLOAT32` | OLS regression slope coefficient ($\beta_1$) |
| `intercept` | `FLOAT32` | OLS regression constant term ($\beta_0$) |
| `p_value` | `FLOAT32` | Two-tailed hypothesis test p-value for $\beta_1 \ne 0$ |
| `r2` | `FLOAT32` | Coefficient of determination ($R^2 \in [0, 1]$) |
| `outlook` | `VARCHAR(24)` | Classification: `Improving, Declining, Stable or uncertain, Insufficient data` |
| `projections` | `VARCHAR(1024)` | JSON array of 10-year forecasts with 95% confidence intervals |

## 4.6 RESTful API Design & Endpoint Specifications
The FastAPI application exposes nine read-only REST endpoints structured under the `/api` prefix:

### Table 4.6: REST API Route Catalogue and Response Envelopes
| HTTP Method | Route Path | Handler Function & Module | Response Pydantic Schema | Description & Query Parameters |
|---|---|---|---|---|
| `GET` | `/api/health` | `health()` in `main.py` | `HealthResponse` | Verifies service health, version, and data directory path |
| `GET` | `/api/places` | `list_places()` in `routes_places.py` | `list[PlaceOut]` | Returns catalogue of all 61 places with spatial coordinates |
| `GET` | `/api/places/{place_id}` | `place_detail()` in `routes_places.py` | `PlaceDetailOut` | Detailed metadata and full yearly factor history for a place |
| `GET` | `/api/places/{place_id}/trend` | `place_trend()` in `routes_places.py` | `TrendResponse` | 10-year OLS projections and outlook classifications per factor |
| `GET` | `/api/clusters` | `list_clusters()` in `routes_places.py` | `list[ClusterOut]` | Returns K-Means cluster assignments and tier labels |
| `GET` | `/api/sources` | `list_sources()` in `routes_places.py` | `list[SourceOut]` | Returns complete data provenance register with licenses |
| `POST`| `/api/score` | `compute_score()` in `routes_score.py` | `ScoreResponse` | Dynamic on-demand score computation given custom weights |
| `GET` | `/api/states/{id}/ranking` | `state_ranking()` in `routes_score.py` | `StateRankingResponse` | Intra-state ranking of municipal centers within a state |
| `GET` | `/api/factors` | `list_factors()` in `routes_score.py` | `list[FactorOut]` | Returns factor metadata, directions, and trend eligibility |

## 4.7 Core Mathematical and Statistical Algorithms

### 4.7.1 Directional Min-Max Normalization
Because raw physical measurements operate across disparate dimensions (µg/m³, crimes per lakh, ₹ per annum), each indicator $x$ is normalized to a bounded dimensionless scale $S \in [0, 100]$:

![Figure 4.3: Scoring Algorithm Workflow](diagrams/scoring_algorithm_workflow.png)

1. **Outlier Clipping:**
   $$x_{\text{clipped}} = \text{clip}(x, \text{lo}, \text{hi}) = \max(\text{lo}, \min(x, \text{hi}))$$

2. **Higher-is-Better Scaling (e.g., Economic Output, Healthcare Composite):**
   $$S_i = 100 \times \frac{x_{\text{clipped}} - \text{lo}}{\text{hi} - \text{lo}}$$

3. **Lower-is-Better Scaling (e.g., Ambient PM2.5, Crime Rates, Unemployment):**
   $$S_i = 100 \times \frac{\text{hi} - x_{\text{clipped}}}{\text{hi} - \text{lo}}$$

### Table 4.7: Indicator Direction, Boundaries, and Normalization Anchors
| Factor Identifier | Physical Indicator | Direction | Anchor Lower ($\text{lo}$) | Anchor Upper ($\text{hi}$) | Measurement Unit |
|---|---|---|---|---|---|
| `air_quality` | Ambient PM2.5 Concentration | Lower is better | 10.0 | 150.0 | µg/m³ annual mean |
| `safety` | Cognizable IPC Crime Rate | Lower is better | 100.0 | 600.0 | Crimes per 100,000 population |
| `health` | NFHS-5 Maternal/Child Index | Higher is better | 0.0 | 100.0 | Standardized composite index |
| `economy` (NSDP) | Per-Capita NSDP | Higher is better | ₹50,000 | ₹320,000 | Real ₹ at 2011–12 constant prices |
| `economy` (Unemp) | Usual Status Unemployment | Lower is better | 2.0% | 10.0% | % of active labour force |
| `cost_of_living`| 1BHK Median Monthly Rent | Lower is better | ₹3,000 | ₹40,000 | ₹ / month |
| `water_quality` | Water-Body Quality Score | Higher is better | 0.0 | 100.0 | Standardized composite index |

### 4.7.2 Multi-Factor Weighted Aggregation & Dynamic Reweighting
Given a vector of user weights $\mathbf{w} = [w_1, w_2, \dots, w_K]$, weights are dynamically normalized over the subset of factors observed for place $i$:
$$w_{k, \text{norm}} = \frac{w_k}{\sum_{j \in \text{Observed}_i} w_j}$$
The composite livability score is then evaluated as:
$$\text{Composite Score}_i = \sum_{k \in \text{Observed}_i} w_{k, \text{norm}} \cdot S_{i, k}$$

### Table 4.8: System Persona Weight Allocations
| Persona Identifier | Target User Profile | Air Quality ($w_{\text{air}}$) | Safety ($w_{\text{safe}}$) | Health ($w_{\text{hlth}}$) | Economy ($w_{\text{econ}}$) | Cost of Living ($w_{\text{col}}$) |
|---|---|---|---|---|---|---|
| `balanced` | General Citizen Baseline | 35% | 25% | 25% | 15% | 0% |
| `clean_air_first` | Respiratory Sensitive / Eco | 55% | 15% | 20% | 10% | 0% |
| `family` | Parents with Young Children | 20% | 30% | 30% | 20% | 0% |
| `career` | Working Professionals | 15% | 15% | 10% | 60% | 0% |
| `student` | Budget Relocators | 15% | 25% | 15% | 20% | 25% |

### 4.7.3 Ordinary Least Squares (OLS) Longitudinal Trend Forecasting
For each place-factor pair possessing $n \ge 5$ observed yearly points, an Ordinary Least Squares regression is fitted against calendar year $t$:
$$y_t = \beta_0 + \beta_1 t + \epsilon_t, \quad \epsilon_t \sim \mathcal{N}(0, \sigma^2)$$

Ten-year forward projections for $t \in [2025, 2034]$ are evaluated with approximate 95% prediction intervals:
$$\hat{y}_t = \text{clip}(\hat{\beta}_0 + \hat{\beta}_1 t, 0, 100)$$
$$\text{PI}_{95\%}(t) = \hat{y}_t \pm t_{0.025, n-2} \cdot \hat{\sigma} \sqrt{1 + \frac{1}{n} + \frac{(t - \bar{t})^2}{\sum (t_i - \bar{t})^2}}$$

## 4.8 Security, Data Provenance, and Access Architecture
- **In-Memory DataStore Singleton:** Processed datasets are loaded into memory once during FastAPI application lifespan. An LRU cache keyed on file signatures (mtime, byte size, MD5 hash) eliminates file I/O during request servicing.
- **Cryptographic Provenance Gate:** All raw inputs are verified against known SHA-256 hashes in `src/utils/provenance.py`. Synthetic placeholder files are prevented from entering the active loader pipeline.
- **CORS Protection:** Cross-Origin Resource Sharing is restricted via `CORSMiddleware` to authorized frontend origins (`http://localhost:5173`, `http://localhost:3000`).

---

# CHAPTER 5: IMPLEMENTATION DETAILS

## 5.1 System Entry Points and Lifespan Execution
The India Livability Intelligence System incorporates three primary execution entry points:
1. **Backend Server (`backend/app/main.py`):** Initiates the FastAPI application under Uvicorn (`uvicorn backend.app.main:app --port 8000`). Utilizes an asynchronous `lifespan` context manager that preloads the singleton `DataStore` at server boot.
2. **Geospatial Frontend (`frontend/src/main.jsx` & `App.jsx`):** Renders the root React 19 tree, binds global state, initializes the client-side scoring engine from `realData.js`, and sets up event handlers for persona switching and map zooming.
3. **Pipeline Orchestrator (`src/cleaning/run_pipeline.py`):** Automated ETL runner executed via `python -m src.cleaning.run_pipeline` or `make data`. Coordinates multi-source ingestion, entity aliasing, outlier detection, and analytical export.

## 5.2 Data Loaders and Entity Aliasing (`src/loaders/`)
The ingestion engine comprises modular Python scripts located in `src/loaders/`. Each loader handles parsing, schema normalization, and unit conversion for a specific public repository.

### Table 5.1: Data Loader Registry and Upstream Provenance Sources
| Loader Module | Source Institution | Input Format & File | Granularity | Cleaning & Harmonization Logic |
|---|---|---|---|---|
| `load_air_kaggle.py` | CPCB / Kaggle | CSV (`city_day.csv`, `enriched_aqi_dataset.csv`) | Station/City Daily | Daily-to-annual mean aggregation; excludes zero readings; flags sparse stations |
| `load_air_cpcb.py` | CPCB NAMP Reports | Annual summary tables | City Annual | Historical CPCB annual means; structural series break tagged at 2020 |
| `load_safety.py` | NCRB Crime in India | XLSX (`ncrb_table_1a3_2020_2022.xlsx`) | State Annual | Extracts cognizable IPC rates per 100,000; maps state names; isolates metro rates |
| `load_health_nfhs.py`| MoHFW / IIPS NFHS-5 | CSV (`NFHS_5_India_Districts_Factsheet_Data.csv`) | District Survey | Household-weighted district aggregation to state level; constructs composite index |
| `load_economy.py` | RBI & MoSPI PLFS | XLSX (`rbi_nsdp_2025_table20.xlsx`) & PDF | State Annual | Deflates nominal NSDP to constant 2011–12 prices; parses PLFS unemployment |
| `load_cost_of_living.py` | Compiled Rental Series | CSV (`india_col_salary_longitudinal_2010_2024.csv`) | City Annual | Averaged 1BHK rent; flags modeled vs benchmarked rows; snapshot-locked |
| `load_water_quality.py` | CPCB Water Bodies | CSV (`Water_pond_tanks_2021.csv`) | State Snapshot | Combines Biochemical Oxygen Demand and Dissolved Oxygen into 0–100 index |

### Geographic Entity Aliasing
State and municipal names frequently diverge across government reports (e.g., "Orissa" vs "Odisha", "Pondicherry" vs "Puducherry", "Bangalore" vs "Bengaluru"). The function `resolve_place_id()` in `src/utils/helpers.py` loads `data/raw/name_aliases.csv` and normalizes all names to canonical ISO identifiers before merging.

## 5.3 Normalization and Scoring Implementation (`src/scoring/`)
The core scoring logic resides in `src/scoring/scoring.py` and is designed as a set of pure, side-effect-free mathematical functions:
- `normalize_value(x, lo, hi, direction)`: Applies bounded directional scaling to scalar numbers.
- `normalize_series(series, lo, hi, direction)`: High-speed vectorized NumPy/Pandas implementation.
- `score_factor(df, factor_name, factor_cfg)`: Handles multi-indicator aggregation. For the `economy` factor, per-capita NSDP and unemployment are normalized independently and then averaged.
- `compute_scores(factors_wide, weights, year, config)`: Executes matrix multiplication between normalized factor scores and the re-normalized weight vector, computes ordinal ranks (`rank`), and appends metadata flags (`partial_data`, `missing_factors`).

## 5.4 Machine Learning and Statistical Projections (`src/models/`)
- **Linear Trend Projections (`src/models/trend.py`):** The function `fit_trend(years, scores, place_id, factor)` filters valid observations. If $n \ge 5$, it fits `sm.OLS(scores, sm.add_constant(years))`, extracts slope, p-value, $R^2$, classifies qualitative outlook, and computes 10-year forecasts clipped to $[0, 100]$.
- **K-Means Clustering (`src/models/clustering.py`):** The function `run_clustering(scores_wide, factor_score_cols, k, seed)` standardizes features using `StandardScaler()`, searches $k \in [2, 7]$ via `_choose_k()`, records inertia and silhouette scores, and assigns tier labels.

## 5.5 Backend REST Microservice Implementation (`backend/app/`)
The FastAPI backend is engineered for maximum throughput and architectural separation:
- `backend/app/core/config.py`: Pydantic `Settings(BaseSettings)` class. Features a custom validator `parse_debug_value` ensuring that environment strings such as `"release"`, `"prod"`, `"true"`, or `"1"` are correctly coerced to boolean values without throwing validation errors.
- `backend/app/core/loader.py`: Implements `DataStore` and `get_store()`. Evaluates an MD5 file signature across all nine data files. When signatures match, it returns an in-memory cached instance, ensuring zero filesystem latency.
- `backend/app/api/routes_places.py` & `routes_score.py`: Lightweight router controllers injecting `DataStore` via `Depends(get_store)` and transforming pandas rows into validated Pydantic models.

## 5.6 Frontend Geospatial Dashboard Implementation (`frontend/src/`)
The user interface is structured around modern React 19 functional components:

![Figure 4.4: Frontend Component Architecture](diagrams/frontend_component_hierarchy.png)

- `IndiaMap.jsx`: Renders an interactive vector SVG India map using coordinate paths defined in `indiaMap.js`. Implements mouse hover tooltips, click selection, and dynamic choropleth shading based on the active color mode.
- `WeightControls.jsx`: Renders five persona buttons and dynamic sliders for Air Quality, Safety, Health, Economy, and Cost of Living. Features slider lock toggles and instant normalization.
- `Leaderboard.jsx`: Ranked table displaying entity positions, scores, and pillar breakdowns. Supports search filtering and multi-entity selection for comparative analysis.
- `PlaceDetailModal.jsx`: Modal displaying a 10-year OLS trend chart, multi-pillar radar profile, and data attribution badges.
- `CompareModal.jsx` & `CompareBar.jsx`: Multi-entity comparison tray supporting side-by-side analysis of up to four jurisdictions.
- `scoringService.js`: Pure JavaScript scoring engine running inside the browser. It mirrors `src/scoring/scoring.py` exactly, enabling sub-5-millisecond score recalculation from `realData.js`.

## 5.7 Data Provenance and Quality Assurance Modules (`src/utils/`)
The module `src/utils/provenance.py` maintains SHA-256 fingerprints of unverified placeholder files:
```python
UNVERIFIED_GENERATED_SHA256 = {
    "cpcb_aqs_2023.csv": "e9b2...8a1f",
    "cpcb_aqs_2024.csv": "7c14...3d09",
    "ncrb_crime_rate_2015_2022.csv": "4f55...91bc",
    # Additional quarantined placeholder hashes...
}
```
During pipeline startup, `find_unverified_generated_sources()` scans the workspace. Any matching file triggers immediate isolation, preventing synthetic contamination of published scores.

## 5.8 Error Handling, Edge Cases, and System Reliability
The system implements robust error handling across all layers:
- **Degenerate Bounds Handling:** In `normalize_value()`, if anchor upper equals anchor lower ($hi == lo$), the function returns 50.0 to prevent division-by-zero exceptions.
- **Missing Factor Reweighting:** If an entity has valid data for 3 out of 4 requested factors, weights are proportionally scaled over the observed factors, preventing artificial score penalization.
- **Environment Variable Parsing Resilience:** In `backend/app/core/config.py`, system environment variables like `DEBUG=release` (frequently set on Windows workstations by C++/Rust toolchains) are safely parsed into `False` rather than causing startup validation crashes.
- **Network Independence:** The frontend operates completely offline using `realData.js`. If the FastAPI backend is stopped, all map, scoring, radar, and leaderboard features remain fully functional in the browser.
"""
