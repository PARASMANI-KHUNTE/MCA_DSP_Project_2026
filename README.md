# MCA DSP Project 2026 — India Livability Intelligence System

Repository for the MCA Data Science capstone **India Livability Intelligence System** (course CAPCTD3 Elective-V, MCA Batch 2026).

## Where things live

| Path | Contents |
| --- | --- |
| `India Livability Intelligence System/` | The project: data pipeline (`src/`), static React dashboard (`frontend/`), notebooks, tests, reports, and the main [`README`](India%20Livability%20Intelligence%20System/README.md). |
| `.kilo/` | Local agent configuration. |

Start with the project README:

```bash
cd "India Livability Intelligence System"
cat README.md
```

## Quick start

```bash
cd "India Livability Intelligence System"

# Python environment
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Full analysis refresh
make data
python -m src.scoring.run_scoring
python -m src.models.run_ml
python -m src.analysis.run_eda
python -m src.export_frontend_data

# Dashboard
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Tests:

```bash
cd "India Livability Intelligence System"
python -m pytest tests/ -q
```

## Data disclaimer

The pipeline runs on locally supplied extracts. Their values, exact upstream versions, and reuse terms have not been independently verified against the cited publishers. Treat all results as exploratory local-data views rather than verified public-data findings. See [`reports/data_fabrication_audit.md`](India%20Livability%20Intelligence%20System/reports/data_fabrication_audit.md) and [`reports/data_provenance_notice.md`](India%20Livability%20Intelligence%20System/reports/data_provenance_notice.md).

## Repository history note

An earlier revision of this repository kept a second, stale copy of the React app at the repository root (including a committed `node_modules/`). That copy was removed; `India Livability Intelligence System/frontend/` is the single source of truth. The old files remain available in Git history.
