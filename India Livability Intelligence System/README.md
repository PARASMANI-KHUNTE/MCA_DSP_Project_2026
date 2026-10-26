# India Livability Intelligence System

> **Course:** Data Science using Python (CAPCTD3 Elective-V)  
> **Working title:** *Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection*

---

## Live Demo
🔗 _Link to be added after deployment_

## Key Findings
- _To be filled after EDA_
- _To be filled after EDA_
- _To be filled after EDA_

## How to Run Locally

### 1. Clone & install
```bash
git clone <repo-url>
cd "India Livability Intelligence System"
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 2. Add raw data
Download datasets listed in `data/raw/source_register.csv` and place them in the corresponding subfolders under `data/raw/`.

### 3. Run the pipeline
```bash
make data       # clean + merge
make notebooks  # execute notebooks in order
make api        # start FastAPI on port 8000
make web        # start frontend dev server
make test       # run all tests
make docker     # build + run everything via Docker Compose
```

## Data Sources & Licenses
See `data/raw/source_register.csv` for the full register with licenses and attribution.

| Dataset | Publisher | License |
|---|---|---|
| Air Quality 2015–2020 | Kaggle / CPCB | _check Kaggle page_ |
| Crime in India | NCRB | Open Government Data |
| Infant Mortality (SRS) | Registrar General of India | Open |
| Per Capita NSDP | RBI | Open |
| PLFS Unemployment | MoSPI | Open |
| House Rent Snapshot | Kaggle | CC BY-SA 4.0 |
| State Boundaries | DataMeet / open repo | _verify before use_ |

## Methodology
- **Scoring:** `docs/` → M5 in the SRS document
- **ML:** `docs/` → M6 in the SRS document

## Limitations
- City scores for safety, health and economy inherit state-level data.
- Air series joins two sources across a multi-year gap including COVID 2020.
- Projections are naive linear trends from limited yearly data — not predictions.
- Weights are subjective; see sensitivity analysis.

## Project Structure
```
data/raw/           ← untouched downloads + source_register.csv
data/interim/       ← partially cleaned files
data/processed/     ← final analytical tables (CSV / Parquet)
src/                ← Python modules (loaders, cleaning, scoring, models)
notebooks/          ← 00_coverage_check to 05_ml_trend_clustering
reports/            ← data quality report, findings, figures
tests/              ← pytest suite
backend/            ← FastAPI app
frontend/           ← React + Vite app (or Streamlit fallback)
models/             ← saved model artifacts + metrics.json
```

## Author
**Parasmani Khunte** — MCA, 2026
