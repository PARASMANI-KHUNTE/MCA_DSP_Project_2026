<div align="center">

# 🇮🇳 India Livability Intelligence System
### Data Science using Python (DSP) Project — MCA 2026
**Course:** CAPCTD3 Elective-V | **Capstone Project**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React + Vite](https://img.shields.io/badge/Frontend-React_19_%2B_Vite-61DAFB.svg?logo=react&logoColor=black)](https://vitejs.dev/)
[![Pytest](https://img.shields.io/badge/Tests-80_Passed-success.svg?logo=pytest&logoColor=white)](https://pytest.org/)
[![License](https://img.shields.io/badge/Academic-MCA_Capstone_2026-orange.svg)](#acknowledgments)

<p align="center">
  <b>Research Question:</b><br/>
  <i>"Is India Becoming Less Livable? A Data-Driven Livability Index with Interactive Map and Trend Projection"</i>
</p>

</div>

---

## 👥 Authors & Team Members

- **Parasmani Khunte**
- **Shuchi Trivedi**

*Master of Computer Applications (MCA) — Batch 2026*  
*Specialization:* Data Science using Python (DSP)

---

## 📌 Executive Summary

The **India Livability Intelligence System** is an end-to-end, empirical data science platform and interactive intelligence dashboard designed to measure, analyze, and project urban and regional livability across 61 Indian cities and states.

Rather than relying on subjective opinions or anecdotal perceptions, this platform integrates multi-source official public datasets (CPCB, NCRB, RBI, MoSPI, Registrar General of India) into a standardized multi-factor composite index, supported by:
1. **Multi-Pillar Composite Scoring:** Evaluates Air Quality, Healthcare Infrastructure, Public Safety, Economic Vitality, and Cost of Living.
2. **Inferential Statistics & Hypothesis Testing:** One-Way ANOVA for regional disparity, Pearson correlation matrices, and sensitivity testing.
3. **Time-Series Trend Projection:** Ordinary Least Squares (OLS) regression models projecting historical trajectories (2015–2024) to **2034**.
4. **Unsupervised Machine Learning:** K-Means clustering ($k=5$, Silhouette Score $= 0.647$) for grouping regions by multi-dimensional profiles.
5. **Interactive Full-Stack Web Application:** High-speed FastAPI REST API paired with a modern React 19 + Vite dashboard featuring dynamic choropleth maps, radar comparisons, factor breakdowns, and what-if simulation.

---

## 🔬 Key Statistical & Empirical Findings

- **Significant Regional Disparity (2022 Cross-Section):**  
  A One-Way ANOVA across 61 places reveals statistically significant regional differences ($F = 7.23, p = 2.89 \times 10^{-5}$). Mean composite scores range from **72.5 in the West** to **43.2 in the Central region**.
- **Economic Prosperity & Health Outcomes ($r = -0.63, p < 0.001, n = 122$):**  
  Higher per-capita Net State Domestic Product (NSDP) strongly correlates with lower Infant Mortality Rates (IMR).
- **Academic Rigor & Honest Reporting on Air vs. Health ($r = 0.25, p = 0.121, n = 40$):**  
  While air pollution (PM2.5) and IMR intuitively seem linked, the available concurrent cross-sectional overlap is limited and not statistically significant ($p > 0.05$). The system transparently flags this rather than asserting spurious causality.
- **Longitudinal Trend Outlook (Projections to 2034):**  
  Fitting OLS regression across places with at least 5 years of historical data reveals 28 improving series, 21 declining series, 5 stable trajectories, and 190 with insufficient time points.
- **Unsupervised Segmentation ($k=5$, Silhouette $= 0.647$):**  
  K-Means clustering isolates five distinct operational archetypes, spanning low-resource lagging centers (mean composite 22.9) to high-performing metropolitan hubs (mean composite 81.3).

---

## 🛠️ Technology Stack

| Domain | Technologies & Libraries |
|---|---|
| **Programming Language** | Python 3.10+ (tested on Python 3.10 – 3.14) |
| **Data Ingestion & Processing** | `pandas`, `numpy`, `pyarrow`, `openpyxl`, `pdfplumber`, `requests` |
| **Statistical Modeling & ML** | `statsmodels` (OLS regression), `scikit-learn` (K-Means, StandardScaler), `scipy` |
| **Backend Web API** | `FastAPI`, `uvicorn`, `pydantic`, `python-dotenv` |
| **Frontend Web Application** | `React 19`, `Vite`, `Tailwind CSS`, `Leaflet` / `react-leaflet`, `Recharts`, `Lucide Icons` |
| **Notebooks & Prototyping** | `Jupyter Notebook`, `ipykernel`, `matplotlib`, `seaborn` |
| **Testing & Quality Assurance** | `pytest`, `pytest-cov`, `httpx` (60 automated unit & API tests) |
| **Containerization & Tooling** | `Docker`, `docker-compose`, `Makefile` |

---

## 📁 Repository Structure

```text
MCA_DSP_Project_2026/
├── README.md                                    # Repository overview and root documentation
│
└── India Livability Intelligence System/        # Core project workspace
    ├── backend/                                 # FastAPI REST API
    │   └── app/
    │       ├── main.py                          # FastAPI server & route definitions
    │       └── models.py                        # Pydantic schemas
    │
    ├── frontend/                                # Interactive React + Vite application
    │   ├── src/                                 # Components, views, map controls, modals
    │   ├── package.json                         # Node dependencies
    │   └── vite.config.js                       # Vite build configuration
    │
    ├── src/                                     # Core data science Python package
    │   ├── loaders/                             # Data ingesters (CPCB, NCRB, SRS, RBI, etc.)
    │   ├── scoring/                             # Normalization, composite scoring, sensitivity
    │   ├── models/                              # OLS trend models & K-Means clustering
    │   └── utils/                               # Helper functions, constants & logging
    │
    ├── data/                                    # Datasets directory
    │   ├── raw/                                 # Original source downloads & source_register.csv
    │   ├── interim/                             # Cleaned intermediate tables
    │   └── processed/                           # Canonical analytical tables (Parquet & CSV)
    │
    ├── notebooks/                               # Graded DSP Jupyter Notebooks (M3–M6)
    │   ├── 00_coverage_check.ipynb              # Spatial and temporal dataset validation
    │   ├── 01_data_profiling.ipynb              # Missing value distributions & outlier checks
    │   ├── 02_cleaning_merging.ipynb            # Entity resolution, imputation, integration
    │   ├── 03_statistics_eda.ipynb              # Statistical hypothesis testing & EDA
    │   ├── 04_scoring.ipynb                     # Index computation & sensitivity analysis
    │   └── 05_ml_trend_clustering.ipynb         # OLS trend modeling & K-Means clustering
    │
    ├── reports/                                 # Academic deliverables & generated artifacts
    │   ├── project_report.pdf                   # Complete MCA Capstone Report (15 pages)
    │   ├── presentation_slides.pdf              # Viva defense presentation deck
    │   ├── application_guide.pdf                # System manual & operational guide
    │   ├── findings.md                          # Detailed summary of statistical outcomes
    │   └── figures/                             # Generated EDA & model plots
    │
    ├── models/                                  # Persisted model parameters & metrics.json
    ├── tests/                                   # Automated test suite (60 pytest test cases)
    ├── requirements.txt                         # Python dependencies
    ├── Makefile                                 # Build automation commands
    └── docker-compose.yml                       # Multi-container deployment configuration
```

---

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
```
- Open the interactive dashboard in your browser: **`http://localhost:5173/`**

---

## 🐳 Docker Deployment

To launch the full system (Backend + Frontend) via Docker Compose:

```bash
cd "India Livability Intelligence System"
docker-compose up --build
```
The application will be accessible at:
- Web Dashboard: `http://localhost:3000` (or `http://localhost:5173`)
- Backend API: `http://localhost:8000`

---

## 🧪 Testing & Validation

The project maintains comprehensive test coverage across data loading, scoring mechanics, machine learning pipelines, and API endpoints.

To run all 60 tests:
```bash
cd "India Livability Intelligence System"
pytest tests/ -v
```

Expected output:
```text
======================= 59 passed, 1 skipped in ~3.6s =======================
```

---

## 📓 Jupyter Notebooks Workflow (M3–M6)

The project includes step-by-step reproducible notebooks covering the full curriculum:

| Notebook | Focus Area | Key Output |
|---|---|---|
| [`00_coverage_check.ipynb`](file:///notebooks/00_coverage_check.ipynb) | Dataset audit | Spatial & temporal coverage matrix |
| [`01_data_profiling.ipynb`](file:///notebooks/01_data_profiling.ipynb) | Data health | Skewness, missing rates, duplicate checks |
| [`02_cleaning_merging.ipynb`](file:///notebooks/02_cleaning_merging.ipynb) | Pipeline ETL | Canonical master analytical datasets |
| [`03_statistics_eda.ipynb`](file:///notebooks/03_statistics_eda.ipynb) | Statistical analysis | One-Way ANOVA, correlation matrices, boxplots |
| [`04_scoring.ipynb`](file:///notebooks/04_scoring.ipynb) | Index formulation | Composite livability scores & sensitivity analysis |
| [`05_ml_trend_clustering.ipynb`](file:///notebooks/05_ml_trend_clustering.ipynb) | Machine Learning | OLS regression projections to 2034 & K-Means |

Execute all notebooks programmatically:
```bash
make notebooks
```

---

## 📊 Academic Deliverables & Reports

Formatted academic deliverables ready for evaluation are located in the [`reports/`](file:///reports/) directory:

- 📄 **Project Report:** [`reports/project_report.pdf`](India%20Livability%20Intelligence%20System/reports/project_report.pdf) — Comprehensive 15-page capstone report.
- 📊 **Presentation Slides:** [`reports/presentation_slides.pdf`](India%20Livability%20Intelligence%20System/reports/presentation_slides.pdf) — Ready-to-present viva defense slide deck.
- 📖 **Application Guide:** [`reports/application_guide.pdf`](India%20Livability%20Intelligence%20System/reports/application_guide.pdf) — End-user and administrative manual.
- 📑 **Empirical Findings Summary:** [`reports/findings.md`](India%20Livability%20Intelligence%20System/reports/findings.md) — Statistical outputs and table references.

---

## 📑 Data Sources & Governance

All indicators are derived from official, publicly accessible sources:

| Indicator / Domain | Source Institution | Time Horizon |
|---|---|---|
| **Air Quality (AQI / PM2.5 / PM10)** | Central Pollution Control Board (CPCB) | 2015–2019, 2023–2024 |
| **Public Safety (Violent Crime Rate)** | National Crime Records Bureau (NCRB) | 2015–2022 |
| **Healthcare (Infant Mortality Rate)** | Sample Registration System (SRS) / RGI | 2015–2022 |
| **Economic Output (Per-Capita NSDP)** | Reserve Bank of India (RBI) | 2015–2022 |
| **Employment (Unemployment Rate)** | Periodic Labour Force Survey (MoSPI) | 2017–2022 |
| **Cost of Living (Median Rent)** | Metro Rental Snapshot | 2022 Cross-section |

Full licensing, citations, and download URLs are registered in [`data/raw/source_register.csv`](India%20Livability%20Intelligence%20System/data/raw/source_register.csv).

---

## 📄 Acknowledgments

Developed as the capstone submission for the **Master of Computer Applications (MCA)** degree curriculum — **Data Science with Python (DSP) Project - 2026**.
