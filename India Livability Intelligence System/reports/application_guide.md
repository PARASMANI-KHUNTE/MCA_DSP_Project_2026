# India Livability Intelligence System (ILIS)
## Application Guide

**Author:** Parasmani Khunte (MCA, Batch 2024–2026)  
**Course:** Data Science using Python (CAPCTD3 Elective-V)  
**Date:** November 2026  
**Application:** `http://localhost:5173` (development) or `http://localhost:4173` (production preview)

---

## 1. What the Application Does

ILIS is a transparent, browser-based decision-support tool for exploring livability across **61 Indian places**:

- **32 states and Union Territories**
- **29 major metropolitan cities**

The dashboard combines air quality, public safety, healthcare and economic conditions into a weighted composite score, with optional cost-of-living and water-quality factors that can be added as priorities or used as single-factor views. Every score is computed from the processed local tables; missing factors are never replaced with invented values.

Observed coverage differs by factor. The year selector runs from **2010 to 2026**, the baseline year of the exported bundle. Trend projection is **disabled for every factor**, so the application does not publish forecast years or projection intervals.

The frontend is a static React single-page application with embedded data. All scoring runs in the browser; no backend service is required.

---

## 2. Data Sources and Coverage

| Pillar | Geography | Processed coverage | Source |
|---|---|---|---|
| Air quality (PM2.5) | City | 155 observations, 46 places, 2015–2019 and 2025–2026 | Kaggle/CBC historic series plus enriched station extract |
| Public safety (IPC crime rate) | State | 183 observations, 61 places, 2020–2022 | NCRB Table 1A.3 |
| Healthcare (NFHS-5 composite) | State | 61 observations, 61 places, 2021 | NFHS-5 district factsheets |
| Economy: per-capita NSDP | State | 57 observations, 2023 | RBI NSDP constant-price series |
| Economy: unemployment | State | 57 observations, 2023 | MoSPI PLFS 2023-24, ages 15+ |
| Cost of living (1BHK rent) | City | 390 observations, 26 cities, 2010–2024 | Longitudinal rent estimates (modelled/reference) |
| Water quality (0–100 index) | State | 54 observations, 2021 | CPCB water-body snapshot (selectable dashboard factor) |

Important consequences:

- Air quality has **no processed observations for 2020–2024**. The historic and enriched segments are not treated as one continuous series.
- State safety, health, economy, and water factors are inherited by cities; the interface shows the actual source year for each pillar.
- Safety rates for 2020 and 2021 use the 2022 projected population denominator, so they are approximations.
- Cost-of-living rows are modelled (`plfs_modeled`) or reference (`numbeo`) estimates and are never projected.
- Population is not part of the processed dataset, so map markers use a fixed visual scale.
- The local raw extracts have **not** been independently verified against their publishers. Treat results as exploratory local-data views.

---

## 3. Scoring Model

### 3.1 Normalization

Each factor is clipped to a calibrated range and scaled to **0–100**:

- **Higher is better:** `S = (value − lower) / (upper − lower) × 100`
- **Lower is better:** `S = (upper − value) / (upper − lower) × 100`

Bounds are the 5th and 95th percentiles of the latest observation per place at or before 2026, computed with `src/scoring/calibrate_bounds.py` and documented in `reports/bounds_calibration.md`.

| Factor | Calibrated bounds | Direction |
|---|---|---|
| Air quality (PM2.5) | 27.91–150.60 µg/m³ | Lower is better |
| Public safety (IPC crime rate) | 119.70–1,274.80 per lakh | Lower is better |
| Healthcare (NFHS-5 composite) | 44.33–72.33 | Higher is better |
| Economy (per-capita NSDP) | ₹51,898–₹2,72,219.80 | Higher is better |
| Economy (unemployment) | 1.24%–7.12% | Lower is better |
| Cost of living (rent) | ₹5,731–₹27,366 per month | Lower is better |
| Water quality (0–100 index) | 42.26–96.33 | Higher is better |

### 3.2 Weighted Composite

`Composite = Σ(weightᵢ × scoreᵢ) / Σ(weightᵢ)`

- Only factors with an observed score and a positive weight enter the denominator.
- A place missing **one** weighted factor is reweighted from the remaining factors and marked **partial**.
- A place missing **two or more** weighted factors is shown as **unranked** rather than assigned an invented score.
- If every weight is zero, the composite is unavailable.
- City safety, health, and economy inherit their parent-state values; the factor card displays the source year.

### 3.3 Score Bands

The interface colours the map and labels places using explicit score bands:

- **Tier 1 / High Livability:** score ≥ 70
- **Tier 2 / Moderate Livability:** score 50–69.9
- **Tier 3 / Developing Livability:** score < 50

These bands are not K-Means clusters. Offline K-Means output is retained for analysis only (current run: k=2 over 60 places for 2026) and is not used for map colours.

---

## 4. Running the Application

### 4.1 Frontend Only (Recommended)

From the `frontend/` directory:

```bash
npm install
npm run dev
```

Vite prints the local development URL, typically `http://localhost:5173`. You can also run `./start.ps1` from the project root.

For a production build:

```bash
npm run build
npm run preview
```

The preview server typically runs at `http://localhost:4173`.

The frontend is fully static: the built `frontend/dist/` directory can be served by any static file host. No API, database, or server-side process is involved.

---

## 5. Navigation and Global Controls

- **Map Explorer:** Interactive India map, priority controls and rankings.
- **Insights & Analytics:** Live regional means, Pearson correlations and data diagnostics.
- **Methodology & Data:** Formulas, calibrated bounds, sources, score bands and limitations.
- **Year selector:** Observed years `2010–2026`; there are no projected years.
- **Compare tray:** Stages two or three places for side-by-side inspection.
- **Engine badge:** Confirms the app is running its embedded client scoring engine.

On smaller screens, the sidebar controls and rankings become vertically stacked to avoid horizontal overflow.

---

## 6. Quick Start and Guided Tour

The quick-start banner appears above the workspace until dismissed:

- Describes the current data coverage: 61 places and factor-specific observed years.
- Offers one-click access to the Clean Air, Family, Career and Student/Budget presets.
- Opens a three-step guided tour explaining priorities, map reading, inherited indicators and comparison.
- The dismissal choice is stored locally with `livability-quickstart-dismissed`.

The tour contains no sample or synthetic values.

---

## 7. Priority Controls and Personas

### 7.1 Presets

| Preset | Air | Safety | Health | Economy | Cost |
|---|---:|---:|---:|---:|---:|
| Balanced Baseline | 35 | 25 | 25 | 15 | 0 |
| Clean Air & Greenery | 55 | 15 | 20 | 10 | 0 |
| Family & Wellbeing | 20 | 40 | 30 | 10 | 0 |
| Career & Economic Growth | 10 | 20 | 20 | 50 | 0 |
| Student / Budget Living | 15 | 25 | 15 | 20 | 25 |

Preset IDs and values match the `presets` block in `src/scoring/factors_config.yaml`.

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
- Each row shows score, rank, score bar, the source year of the underlying observations, and a marker when a state value is inherited.
- Places without a composite score display `—` and are sorted after scored places.
- With trend projection disabled, outlook is **Insufficient data** rather than a projected direction.
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
- Source year badge, plus a **State** badge when a city inherits a state-level value.
- Explicit unavailable state when no observation exists.

The detail view does not display an invented population value or a fallback raw metric.

### 10.3 Trajectory and Projection

- Solid line: observed composite scores where they exist.
- No dashed projection line or interval band: trend projection is disabled for every factor in the current configuration.
- The chart explains that projections are unavailable instead of extrapolating.

---

## 11. Comparison View

- Supports two or three places.
- Shows selected-year composite scores and ranks.
- Provides pillar-by-pillar bars with the leading place highlighted.
- Marks inherited state-level values and shows their source year.
- Hides the cost row when none of the selected places has rent data.
- Displays an unavailable state rather than a fabricated score for missing pillars.

---

## 12. Insights and Analytics

The Insights view computes diagnostics from the current weighted cross-section:

- **Regional snapshot:** Average composite score by region for the latest usable year, with sample-count context.
- **Correlation matrix:** Pearson correlations among available normalized factor scores.
- **Strongest association:** The largest absolute pairwise correlation, reported with a correlation-is-not-causation caveat.
- **Diagnostic cards:** Regional spread, air–health association and factor coverage.
- **Provenance and coverage:** Shares of places with each factor, inherited values, missing cost data, and the fact that no projections are available.

K-Means profiles are intentionally omitted from this view.

---

## 13. Methodology and Data Transparency

The Methodology view documents:

- The composite formula and direction-aware min-max normalization.
- Calibrated bounds, source names and observed years for each factor.
- State-to-city inheritance and source-year labelling.
- Score-band definitions.
- That trend projection is disabled for every factor.
- Known data gaps and ethical limitations.

It does not claim that missing data is replaced by equal-weight fallbacks.

---

## 14. Known Limitations

1. **Unverified inputs:** The local extracts have not been reconciled with their cited publishers.
2. **Ecological fallacy:** City safety, health, economy, and water inherit state aggregates.
3. **Temporal mismatch:** State indicators cover 2020–2023 while the selector extends to 2026.
4. **Air-quality gap:** No processed PM2.5 values exist for 2020–2024.
5. **Sparse economy:** NSDP and unemployment are available only for 2023 in the processed factors.
6. **Limited cost coverage:** Rent survives matching for 26 cities over 2010–2024.
7. **No population weighting:** Map pins use a fixed scale.
8. **No projections:** Trend eligibility is disabled, so no outlook or forecast should be read from the app.
9. **Descriptive correlations:** Associations are not causal estimates.
10. **Offline clustering:** K-Means tiers are not used in the interface.
11. **State-level water:** Water quality is a single 2021 CPCB state snapshot inherited by cities, so it cannot show intra-state or temporal variation.

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
| Change year | Year selector | Recomputes observed factor and composite values |
| Guided tour | Quick-start banner | Opens the three-step tour |

---

## 16. Troubleshooting

- **All places unranked:** Every weight is zero. Reset priorities or raise at least one weight.
- **A factor shows unavailable:** That place has no observation at or before the selected year for that factor.
- **No projection line:** Expected. Trend projection is disabled for every factor.
- **Cost factor unavailable:** Only 26 cities have matched rent observations.
- **2020–2024 air data missing:** This is a known source gap, not a rendering error.

---

## 17. Rebuilding Data and Reports

From the project root:

```bash
python -m src.cleaning.run_pipeline
python -m src.scoring.run_scoring
python -m src.models.run_ml
python -m src.analysis.run_eda
python -m src.export_frontend_data
```

Or run `make analysis`. Then rebuild the frontend:

```bash
cd frontend
npm run lint
npm run build
```

Recalibrate bounds after changing processed inputs (writes the report; review and copy the new values into the YAML):

```bash
python -m src.scoring.calibrate_bounds
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
- `src/` — cleaning, scoring, analysis and export pipeline.
- `data/processed/` — processed datasets used by the app and reports.
- `reports/findings.md` — EDA and statistical findings.
- `reports/bounds_calibration.md` — percentile calibration evidence.
- `reports/data_quality_report.md` — per-factor coverage and validation summary.
- `reports/project_report.pdf` — withdrawn historical report.
- `reports/application_guide.pdf` — this guide.
- `reports/presentation_slides.pdf` — withdrawn historical slides.
- `reports/figures/` — eight generated analysis figures.
