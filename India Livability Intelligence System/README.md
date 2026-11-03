# India Livability Intelligence System

An MCA data science project for exploring livability indicators across Indian states/UTs and cities using locally supplied datasets. The currently active files combine local air-quality and rent data with NCRB, SRS, RBI NSDP and PLFS extracts, but their exact upstream versions and values have not been independently confirmed. It includes a React dashboard, an optional FastAPI service, data processing and analysis code, and project reports.

> **Course:** Data Science using Python (CAPCTD3 Elective-V)  
> **Working title:** *Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection*

## Project status

- **Current workflow:** six raw tables were confirmed byte-for-byte as outputs from the retired placeholder generator and remain quarantined in `data/rejected/generated_placeholders/`. Processed outputs and the frontend bundle combine the remaining local air-quality and rent files with public NCRB safety, SRS health, RBI NSDP and PLFS unemployment extracts.
- The dashboard covers **61 places**: 32 states/UTs and 29 cities.
- Processed analytical tables are in `data/processed/`; source files and their attribution register are in `data/raw/` in the working project. Raw data is excluded from Git by `.gitignore` and must be supplied separately for pipeline runs.
- The dashboard has embedded data and computes factor scores in the browser. At 2023 it supports a full five-factor composite; earlier years are factor-specific views. Air-only and rent-only rankings remain available as presets. The FastAPI backend is optional.
- There is no hosted demo linked at present.

## Findings status

The remaining files are not known matches for the retired generator, but their values, exact upstream versions, and reuse terms have not been independently confirmed. Treat their results as exploratory local-data views, not verified public-data findings. A balanced 2023 composite is published for places that have all weighted factors; places missing a weighted factor remain unscored. Mixed-coverage years expose factor-specific results rather than a composite. See the [fabrication audit](reports/data_fabrication_audit.md).

## Data coverage and limitations

- The air loader finds 48 valid city-year observations across 18 cities for 2015–2019. Name matching maps 40 city-years across 13 cities into the place master; unmatched observations are not assigned to another place.
- The pipeline derives 40 state-year air means from those matched city observations across 13 states. They summarize the available city sample; states without a covered city remain unscored.
- Safety uses NCRB Table 1A.3 for 2020–2022 (36 states/UTs). The 2022 rate is published; 2020 and 2021 rates are derived from reported totals using the 2022 projected population, so those two years are approximations.
- Health uses SRS Bulletin 2022 infant mortality rates for 35 states/UTs.
- Economy uses RBI NSDP per-capita constant-price series (2011–2024) and PLFS 2023-24 unemployment for ages 15+. Gujarat is missing NSDP for 2023–24 and Ladakh is absent from the NSDP table, so both remain unscored under the balanced 2023 composite.
- The local rent file yields six city snapshots. Its observation dates and upstream version remain unverified. It is not a time series.
- State air values are explicitly derived means of available city observations, not independent state measurements.
- Fixed score bounds, place metadata, map geometry, and visual thresholds are configuration/reference data. They are not observed measurements. The composite is anchored at 2023, the latest year with multi-factor observations. Composite projections are currently withheld because trend eligibility requires every weighted factor to share the same observed years; air-only projections remain available when a place has at least five eligible observations. Rent is never projected.

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

The API documentation is at `http://localhost:8000/docs`; health check: `http://localhost:8000/api/health`. It serves health, place, source, factor-availability, score, state-ranking, and factor-trend data. Score requests can rank available factors; they do not produce a composite from missing factors. Trend responses return projections only for eligible time series and label snapshot rent as having no trend. The API reloads its processed-data cache after pipeline outputs change. The frontend uses the generated embedded bundle and does not depend on the API for interactive scoring.

## Data pipeline and analysis

The full Python stack is listed in the root `requirements.txt`. Raw datasets and their attribution records are under `data/raw/`; see [`source_register.csv`](data/raw/source_register.csv). The checked-in place master is `data/processed/places.csv`. Pipeline commands process the files available locally without a source-manifest gate. A successful schema/pipeline run does not independently verify the cited publications.

```bash
pip install -r requirements.txt
make data                              # clean and merge raw source files
python -m src.scoring.run_scoring      # compute scores
python -m src.models.run_ml            # trends, model metrics, clusters
python -m src.analysis.run_eda         # statistics, findings, figures
python -m src.export_frontend_data     # refresh frontend/src/data/realData.js
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




## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/PARASMANI-KHUNTE/MCA_DSP_Project_2026.git
cd MCA_DSP_Project_2026/"India Livability Intelligence System"
```

### 2. Set Up Python Environment
```bash
# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Launch Backend API (FastAPI)
```bash
# From within "India Livability Intelligence System"
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload   
```
- Interactive API Docs (Swagger UI): **`http://localhost:8000/docs`**
- Alternative Docs (ReDoc): **`http://localhost:8000/redoc`**

### 4. Launch Frontend Web App (React + Vite)
```bash
cd frontend
npm install
npm run dev


## Author

**Parasmani Khunte** — MCA, 2026
