# India Livability Intelligence System

An MCA data science project that explores livability across Indian states/UTs and major cities using published data. It includes a React dashboard, an optional FastAPI service, data processing and analysis code, and project reports.

> **Course:** Data Science using Python (CAPCTD3 Elective-V)  
> **Working title:** *Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection*

## Project status

- **Current workflow:** the project processes the datasets present in `data/raw/`, generates scores, trends, clustering and analysis outputs, and exports the processed data used by the dashboard. The pipeline does not wait for source-review approval. Its outputs reflect the supplied files and configured methodology; a successful run checks pipeline behavior, not whether a source publication was independently audited.
- The dashboard covers **61 places**: 32 states/UTs and 29 cities.
- Processed analytical tables are in `data/processed/`; source files and their attribution register are in `data/raw/` in the working project. Raw data is excluded from Git by `.gitignore` and must be supplied separately for pipeline runs.
- The dashboard has embedded data and computes scores in the browser. The FastAPI backend is available for API use, but is not required to run the dashboard.
- There is no hosted demo linked at present.

## Findings status

Scores, rankings, trends, clustering and statistical findings are generated from the active local datasets. Interpret them with the coverage and indicator limitations below; they describe the data supplied to this project.

## Data coverage and limitations

- City PM2.5 observations cover 2015–2019 and 2023–2024; there are no processed observations for 2021–2022.
- State air scores use the mean PM2.5 value across available observed cities in each state and year; states without a covered city may remain unscored.
- State safety, health, and economy observations end in 2022. City scores inherit those state values and expose their source years.
- Cost of living is a 2022 rent snapshot for six cities, not a time series. Population is not in the processed data, so map markers use a fixed visual scale.
- City scores for safety, health, and economy represent their associated state-level observations. State air scores summarize the cities with available observations.
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

The API documentation is at `http://localhost:8000/docs`; health check: `http://localhost:8000/api/health`. It reads the processed tables and scoring configuration and serves score, place, trend, and cluster endpoints. The frontend uses the generated embedded bundle and calculates interactive scores in the browser; API score synchronization is not wired into the UI.

## Data pipeline and analysis

The full Python stack is listed in the root `requirements.txt`. Raw datasets and their attribution records are under `data/raw/`; see [`source_register.csv`](data/raw/source_register.csv). The checked-in place master is `data/processed/places.csv`. Pipeline commands process the files available locally without a source-manifest gate. A successful schema/pipeline run does not independently verify the cited publications.

New downloads under `data/raw/newData/` were inventoried but have not been admitted as active pipeline inputs. Some are duplicate or use different indicator definitions, and other files need additional source/reuse review. See the [new-data source audit](reports/new_data_source_audit.md) and [integration plan](reports/new_data_integration_plan.md) before using them.

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
