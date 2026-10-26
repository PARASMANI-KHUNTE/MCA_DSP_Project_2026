# India Livability Intelligence System (ILIS)
## Application Guide

**Author:** Parasmani Khunte (MCA, Batch 2024–2026)  
**Course:** Data Science using Python (CAPCTD3 Elective-V)  
**Date:** October 2026  
**Application:** `http://localhost:5173` (development) or `http://localhost:4173` (production preview)

---

## 1. What the Application Does

ILIS is a transparent, browser-based decision-support tool for exploring livability across **61 Indian places**:

- **32 states and Union Territories**
- **29 major metropolitan cities**

The application combines air quality, public safety, healthcare, economic conditions and an optional cost-of-living factor into a weighted composite score. Every score is derived from processed government or published source data.

Observed histories cover **2015–2024**. Composite trajectories are projected to **2034** with ordinary least squares (OLS) only when at least five observed yearly composite scores exist. Missing values are never replaced with fabricated fallback scores.

The frontend runs as a React single-page application. A FastAPI backend is optional; when it is unavailable, the interface uses its embedded client scoring engine.

---

## 2. Verified Data Sources and Coverage

| Pillar | Geography | Processed Coverage | Source |
|---|---|---|---|
| Air quality (PM2.5) | City | 2015–2019 and 2023–2024 | Kaggle NCAP + CPCB |
| Public safety (IPC crime rate) | State | 2015–2022 | NCRB *Crime in India* |
| Healthcare (infant mortality) | State | 2015–2022 | SRS, Registrar General of India |
| Economy: per-capita NSDP | State | 2018 and 2022 | RBI Handbook of Statistics |
| Economy: unemployment | State | 2018 and 2022 | MoSPI PLFS |
| Cost of living (rent) | Six metro cities | 2022 snapshot | Kaggle house-rent data |

Important consequences:

- Air quality has **no processed 2021 or 2022 observations**. The 2015–2019 and 2023–2024 series are not treated as one continuous trend.
- State safety, health and economy data end in **2022**. Scores for 2023–2024 reuse the latest state observation and label its source year.
- Cost of living applies only to the six cities with a 2022 rent snapshot and is never projected.
- Population is not part of the processed dataset, so map markers use a fixed visual scale.

---

## 3. Scoring Model

### 3.1 Normalization

Each factor is clipped to a documented range and scaled to **0–100**:

- **Higher is better:** `S = (value − lower) / (upper − lower) × 100`
- **Lower is better:** `S = (upper − value) / (upper − lower) × 100`

| Factor | Processed bounds | Direction |
|---|---|---|
| Air quality (PM2.5) | 10–150 µg/m³ | Lower is better |
| Public safety (IPC crime rate) | 100–600 per lakh | Lower is better |
| Healthcare (infant mortality) | 5–50 per 1,000 births | Lower is better |
| Economy (per-capita NSDP) | ₹50,000–₹3,50,000 | Higher is better |
| Economy (unemployment) | 2%–15% | Lower is better |
| Cost of living (rent) | ₹5,000–₹80,000 per month | Lower is better |

### 3.2 Weighted Composite

`Composite = Σ(weightᵢ × scoreᵢ) / Σ(weightᵢ)`

- Only factors with an observed score and a positive weight enter the denominator.
- If every active factor is missing, the place is shown as **unranked** rather than assigned an invented score.
- If every weight is zero, the composite is unavailable.
- City safety, health and economy inherit their parent-state values; the factor card displays the actual source year.

### 3.3 Score Bands

The interface colours the map and labels places using explicit score bands:

- **High Livability:** score ≥ 70
- **Moderate Livability:** score 50–69.9
- **Developing Livability:** score < 50

These bands are not K-Means clusters. Offline K-Means output is retained for analysis only because the saved cluster assignments are not consistent with the stored evaluation table.

---

## 4. Running the Application

### 4.1 Frontend Only (Recommended)

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Vite prints the local development URL, typically `http://localhost:5173`.

For a production build:

```bash
npm run build
npm run preview
```

The preview server typically runs at `http://localhost:4173`.

### 4.2 Optional FastAPI Backend

From the project root:

```bash
uvicorn backend.app.main:app --reload --port 8000
```

The application works without the backend. If the backend is offline, the navigation status shows the client engine and the browser console may report expected CORS/network errors for API requests.

---

## 5. Navigation and Global Controls

- **Map Explorer:** Interactive India map, priority controls and rankings.
- **Insights & Analytics:** Live regional means, Pearson correlations and data diagnostics.
- **Methodology & Data:** Formulas, bounds, sources, score bands and limitations.
- **Year selector:** Observed years `2015–2024`; projected years `2025–2034`.
- **Compare tray:** Stages two or three places for side-by-side inspection.
- **Backend pill:** Indicates live API connectivity or standalone client evaluation.

On smaller screens, the sidebar controls and rankings become vertically stacked to avoid horizontal overflow.

---

## 6. Quick Start and Guided Tour

The quick-start banner appears above the workspace until dismissed:

- Describes the real data coverage: 61 places, 2015–2024 observations and OLS projections to 2034.
- Offers one-click access to the Clean Air, Family, Career and Student/Budget presets.
- Opens a three-step guided tour explaining priorities, map reading, projections and comparison.
- The dismissal choice is stored locally with `livability-quickstart-dismissed`.

The tour contains no sample or synthetic values.

---

## 7. Priority Controls and Personas

### 7.1 Presets

| Preset | Air | Safety | Health | Economy | Cost |
|---|---:|---:|---:|---:|---:|
| Balanced Baseline | 30 | 25 | 25 | 20 | 0 |
| Clean Air & Greenery | 55 | 15 | 20 | 10 | 0 |
| Family & Wellbeing | 20 | 40 | 30 | 10 | 0 |
| Career & Economic Growth | 10 | 20 | 20 | 50 | 0 |
| Student / Budget Living | 15 | 25 | 15 | 20 | 25 |

### 7.2 Custom Weights

- Five sliders range from 0 to 100.
- Moving any slider switches the preset label to **Custom**.
- Raw slider values and normalized percentage contributions update immediately.
- **Reset** restores the Balanced Baseline.
- Setting every weight to zero produces an unranked state with an explanatory message.

### 7.3 Colour Modes

- **Composite:** Colours by the weighted composite score.
- **Pillar:** Colours by one selected pillar (`Air`, `Safety`, `Health`, `Economy` or `Cost`).
- **Bands:** Colours by High / Moderate / Developing score bands.

The map legend updates with the active mode.

---

## 8. Interactive India Map

- Renders 32 state/UT polygons and 29 city markers.
- Supports wheel zoom, buttons, drag panning, touch pinch and reset.
- City marker size is fixed because population is not in the processed data.
- Layer controls show cities, states or both.
- Hovering a place reveals its name, type, region, score and rank.
- Clicking a place opens the detail view.
- Places without a score remain visible but are not ranked.

---

## 9. Rankings Leaderboard

- Recalculates when weights, presets, filters or year change.
- Search filters by place name, parent state or region.
- Type filters switch between all places, cities and states/UTs.
- Each row shows score, rank, score bar and outlook.
- Places without a composite score display `—` and are sorted after scored places.
- Outlook values are **Improving**, **Declining**, **Stable** or **Insufficient data**.
- The compare checkbox stages a place for comparison.

---

## 10. Place Detail View

### 10.1 Header

- Place name, type, parent state, region and selected year.
- Composite score for the selected year.
- National rank when the place has a finite score.
- Score-band label.

### 10.2 Factor Cards

For each active pillar:

- Normalized 0–100 score.
- Current weight contribution.
- Source year badge.
- Explicit unavailable state when no observation exists.

The detail view does not display an invented population value or a fallback raw metric.

### 10.3 Trajectory and Projection

- Solid line: observed composite scores from 2015–2024.
- Dashed line and shaded band: OLS projection for 2025–2034 with an approximate 95% interval.
- Selected-year marker: highlights the year currently chosen in the global selector.
- Summary values: selected-year score, 2034 projection and trend p-value.
- If fewer than five observed composite points exist, the projection is hidden and the chart explains the limitation.

---

## 11. Comparison View

- Supports two or three places.
- Shows selected-year composite scores and ranks.
- Provides pillar-by-pillar bars with the leading place highlighted.
- Hides the cost row when none of the selected places has rent data.
- Displays an unavailable state rather than a fabricated score for missing pillars.

---

## 12. Insights and Analytics

The Insights view computes diagnostics from the current weighted cross-section:

- **Regional snapshot:** Average composite score by region for the latest usable year, with sample-count context.
- **Correlation matrix:** Pearson correlations among normalized air, safety, health and economy scores.
- **Strongest association:** The largest absolute pairwise correlation, reported with a correlation-is-not-causation caveat.
- **Diagnostic cards:** Regional spread, air–health association and trend coverage.
- **Provenance and coverage:** Shares of places with each factor, inherited values, missing cost data and available projections.

K-Means profiles are intentionally omitted from this view.

---

## 13. Methodology and Data Transparency

The Methodology view documents:

- The composite formula and direction-aware min-max normalization.
- Exact bounds and source names for each factor.
- State-to-city inheritance and source-year labelling.
- Score-band definitions.
- Projection rules, including the five-point minimum.
- Known data gaps and ethical limitations.

It does not claim that missing data is replaced by equal-weight fallbacks.

---

## 14. Known Limitations

1. **Ecological fallacy:** City safety, health and economy inherit state aggregates.
2. **Temporal mismatch:** State indicators end in 2022 while the selector extends to 2034.
3. **Air-quality gap:** No processed PM2.5 values exist for 2021–2022.
4. **Sparse economy:** NSDP and unemployment are available only for 2018 and 2022 in the processed factors.
5. **Limited cost coverage:** Rent exists for six metros in 2022 only.
6. **No population weighting:** Map pins use a fixed scale.
7. **Naive projections:** OLS extrapolates historical composite scores; it does not model policy, climate or investment shocks.
8. **Descriptive correlations:** Associations are not causal estimates.
9. **Offline clustering:** K-Means tiers are not used in the interface.

---

## 15. Interactions

| Action | Control | Result |
|---|---|---|
| Map zoom | Mouse wheel / `+` / `−` | Zooms the map |
| Map pan | Click and drag | Moves the viewport |
| Map reset | Reset control | Restores the fitted view |
| Select place | Click a state, pin or ranking row | Opens place details |
| Search | Leaderboard search field | Filters places |
| Compare | Row checkbox | Adds a place to the tray (maximum three) |
| Reset priorities | Reset button | Restores Balanced Baseline |
| Change year | Year selector | Recomputes observed scores or projections |
| Guided tour | Quick-start banner | Opens the three-step tour |

---

## 16. Troubleshooting

- **Backend errors in the console:** The backend is optional. Start it on port 8000 or ignore the expected API/CORS messages.
- **All places unranked:** Every weight is zero. Reset priorities or raise at least one weight.
- **A factor shows unavailable:** That place has no observation at or before the selected year for that factor.
- **No projection line:** Fewer than five observed composite points exist under the current weights.
- **Cost factor unavailable:** Only six metros have the 2022 rent snapshot.
- **2021 or 2022 air data missing:** This is a known source gap, not a rendering error.

---

## 17. Rebuilding Data and Reports

From the project root:

```bash
python -m src.cleaning.run_pipeline
python -m src.scoring.run_scoring
python -m src.analysis.run_eda
python -m src.export_frontend_data
```

Then rebuild the frontend:

```bash
cd frontend
npm run lint
npm run build
```

Regenerate this guide and the other PDFs:

```bash
python reports/generate_report.py
python reports/generate_app_guide.py
python reports/generate_slides.py
```

---

## 18. Deliverable Files

- `frontend/` — React/Vite application.
- `backend/` — optional FastAPI service.
- `src/` — cleaning, scoring, analysis and export pipeline.
- `data/processed/` — processed datasets used by the app and reports.
- `reports/findings.md` — EDA and statistical findings.
- `reports/project_report.pdf` — full project report.
- `reports/application_guide.pdf` — this guide.
- `reports/presentation_slides.pdf` — viva presentation slides.
- `reports/figures/` — eight generated analysis figures.
