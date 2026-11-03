# India Livability Intelligence System

An MCA data science project that explores livability across Indian states/UTs and major cities using published data. It includes a React dashboard, an optional FastAPI service, data processing and analysis code, and project reports.

> **Course:** Data Science using Python (CAPCTD3 Elective-V)  
> **Working title:** *Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection*

## Project status

- **Data verification blocker:** several state-level and CPCB raw tables currently match hard-coded placeholders from the retired `populate_official_data.py` generator. The data pipeline and frontend-data exporter now refuse those exact files; existing processed tables and the embedded demo bundle are marked unverified and must not be presented as real findings until source-derived data replaces them.
- The dashboard covers **61 places**: 32 states/UTs and 29 cities.
- Processed analytical tables are in `data/processed/`; source files and their attribution register are in `data/raw/` in the working project. Raw data is excluded from Git by `.gitignore` and must be supplied separately for pipeline runs.
- The dashboard has embedded data and computes scores in the browser. The FastAPI backend is available for API use, but is not required to run the dashboard.
- There is no hosted demo linked at present.

## Findings

- The 2022 composite-score cross-section covers 61 places. Regional means range from **72.5 (West)** to **43.2 (Central)**; one-way ANOVA: **F = 7.23, p = 2.89 × 10⁻⁵**.
- Per-capita NSDP and infant mortality are negatively associated (**r = −0.63, p < 0.001, n = 122**). The PM2.5–infant mortality association is not statistically significant (**r = 0.25, p = 0.121, n = 40**).
- The offline trend analysis classifies 28 place-factor series as improving, 21 declining, 5 stable/uncertain, and 190 as having insufficient data. Trend fits require at least five yearly observations; projections are exploratory, not predictions.
- Offline K-Means analysis uses k = 5 (silhouette = 0.647). The dashboard displays explicit score bands rather than those cluster assignments.

See [reports/findings.md](reports/findings.md), [reports/project_report.md](reports/project_report.md), [reports/presentation_slides.md](reports/presentation_slides.md), and [reports/application_guide.md](reports/application_guide.md) for the current written deliverables. PDF versions and `reports/figures/` are not currently included.

## Data coverage and limitations

- City PM2.5 observations cover 2015–2019 and 2023–2024; there are no processed observations for 2021–2022.
- State safety, health, and economy observations end in 2022. City scores inherit those state values and expose their source years.
- Cost of living is a 2022 rent snapshot for six cities, not a time series. Population is not in the processed data, so map markers use a fixed visual scale.
- City scores for safety, health, and economy represent their associated state-level observations. Air quality is city-level.
- Linear trend projections are based on limited and sometimes discontinuous histories. See the application guide for the scoring rules and additional caveats.

## Run the dashboard

Requirements: PowerShell, Node.js compatible with the Vite version in `frontend/package.json` (Node 20.19+ recommended), and npm. Install the frontend dependencies once:

```bash
cd frontend
npm install
cd ..
```

Start the dashboard from the repository root:

```powershell
.\start.ps1
```

Open the URL printed by Vite (configured for port `5173`, usually `http://localhost:5173`). To create and serve a production build locally:

```bash
npm run build
npm run preview
```

## Run the optional API

From the repository root, install the backend dependencies and start FastAPI:

```bash
python -m venv .venv
# Activate the environment for your shell, then:
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

The API documentation is at `http://localhost:8000/docs`; health check: `http://localhost:8000/api/health`. It reads the processed tables and scoring configuration. The frontend is configured to try the API at `http://localhost:8000/api` for score synchronization and falls back to its embedded scoring data if the API is unavailable.

## Data pipeline and analysis

The full Python stack is listed in the root `requirements.txt`. Raw source files are expected under `data/raw/` as described by [`data/raw/source_register.csv`](data/raw/source_register.csv). The checked-in place master is `data/processed/places.csv`. At present, `make data` and `python -m src.export_frontend_data` stop if the known placeholder records are still present. Replace them with verified publisher data and update the source register before regenerating outputs.

```bash
pip install -r requirements.txt
make data       # regenerate processed tables from raw source files
make notebooks  # execute analysis notebooks in order
```

`make notebooks` executes notebooks `00_coverage_check` through `05_ml_trend_clustering`; the coverage notebook may rebuild the place master. The pipeline writes processed tables and updates `reports/data_quality_report.md`.

## Tests and local startup

```bash
make test        # pytest suite with coverage
```

The start script runs the frontend only. The API is optional; start it separately with the command above when API behavior is needed.

## Project structure

```text
backend/          FastAPI application, schemas, scoring service
data/raw/         Source downloads, source register, and aliases (gitignored)
data/processed/   Processed place, factor, score, trend, and cluster tables
frontend/         React + Vite dashboard and embedded data
models/           Model metrics
notebooks/        Coverage, profiling, cleaning, EDA, scoring, ML analysis
reports/          Findings, project report, application guide, audit reports
src/              Data loaders, cleaning, scoring, analysis, and models
tests/            Pytest suite
start.ps1         Start the local frontend from PowerShell
```

## Sources and methodology

See [`data/raw/source_register.csv`](data/raw/source_register.csv) for source URLs, publishers, license notes, and attribution. Scoring bounds, factor directions, trend eligibility, and default weight presets are defined in [`src/scoring/factors_config.yaml`](src/scoring/factors_config.yaml). Analysis notebooks and the application guide describe the statistical and dashboard methodology.

## Author

**Parasmani Khunte** — MCA, 2026
