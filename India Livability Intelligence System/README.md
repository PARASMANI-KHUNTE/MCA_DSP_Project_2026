# India Livability Intelligence System

> **Course:** Data Science using Python (CAPCTD3 Elective-V)  
> **Working title:** *Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection*

---

## Live Demo
🔗 _Link to be added after deployment_

## Key Findings
- **Regional Disparity (2022 cross-section, One-Way ANOVA $F = 7.23, p = 2.89 \times 10^{-5}$):** Mean composite scores range from **72.5 in the West** to **43.2 in the Central region** across 61 scored places. This is the latest year with complete state-level safety, health and economy coverage.
- **Economic Output & Infant Mortality ($r = -0.63, p < 0.001, n = 122$):** Higher per-capita NSDP is strongly associated with lower infant mortality. The PM2.5–IMR overlap is smaller and **not statistically significant** ($r = 0.25, p = 0.121, n = 40$), so the app does not claim a significant air–health correlation.
- **Observed Trends and OLS Outlooks:** Trend models fit observed 2015–2024 series and project to **2034** only when at least five yearly points exist. Across place-factor series, 28 improve, 21 decline, 5 are stable/uncertain, and 190 have insufficient data.
- **Offline K-Means ($k=5$, silhouette $= 0.647$):** Cluster profiles span mean scores from 22.9 to 81.3. The interactive interface deliberately uses explicit score bands instead of cluster labels because the clustering output is retained as offline analysis.
- **Data Gaps Are Explicit:** Air observations exist for 2015–2019 and 2023–2024; state safety, health and economy end in 2022; cost of living is a 2022 rent snapshot for six metros; population is not part of the processed dataset.

## Generated Reports & Deliverables
- 📄 **Academic Project Report:** [`reports/project_report.pdf`](reports/project_report.pdf) (10–15 pages, MCA capstone format)
- 📊 **Presentation Slides:** [`reports/presentation_slides.pdf`](reports/presentation_slides.pdf) (5-minute viva presentation deck)
- 📈 **Statistical Findings & Figures:** [`reports/findings.md`](reports/findings.md) & [`reports/figures/`](reports/figures/)
- 🌐 **Interactive Dashboard:** Run locally on `http://localhost:5173/` (FastAPI backend on `http://localhost:8000/docs`)

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
