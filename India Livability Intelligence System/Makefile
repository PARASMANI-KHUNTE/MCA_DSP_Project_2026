# ============================================================
# India Livability Intelligence System — Makefile
# Usage: make <target>
# Requires: Python 3.11+ with venv activated, Node.js for frontend
# ============================================================

PYTHON ?= python
PIP    ?= pip
PYTEST ?= python -m pytest
NPM    ?= npm

NB_DIR        = notebooks
REPORT_SCRIPT = ../docs/project-report/make_report.py

.PHONY: help install data notebooks scoring ml eda export analysis api web report test clean

help:
	@echo ""
	@echo "  make install     Install Python + frontend dependencies"
	@echo "  make data        Run the full cleaning and merging pipeline"
	@echo "  make notebooks   Execute all notebooks in order"
	@echo "  make scoring     Compute composite scores and sensitivity"
	@echo "  make ml          Fit trend models, metrics, and clusters"
	@echo "  make eda         Run statistics, findings, and figures"
	@echo "  make export      Refresh the embedded frontend data bundle"
	@echo "  make analysis    data + scoring + ml + eda + export"
	@echo "  make api         Start FastAPI backend on port 8000"
	@echo "  make web         Start frontend dev server"
	@echo "  make report      Build the academic project report (docs/project-report)"
	@echo "  make test        Run the full pytest suite"
	@echo "  make clean       Remove caches and frontend build output"
	@echo ""

install:
	$(PIP) install -r requirements.txt
	@echo "Python dependencies installed."
	cd frontend && $(NPM) install
	@echo "Frontend dependencies installed."

data:
	$(PYTHON) -m src.cleaning.run_pipeline
	@echo "Pipeline complete. Outputs in data/processed/"

notebooks:
	jupyter nbconvert --to notebook --execute --inplace \
		$(NB_DIR)/00_coverage_check.ipynb \
		$(NB_DIR)/01_data_profiling.ipynb \
		$(NB_DIR)/02_cleaning_merging.ipynb \
		$(NB_DIR)/03_statistics_eda.ipynb \
		$(NB_DIR)/04_scoring.ipynb \
		$(NB_DIR)/05_ml_trend_clustering.ipynb
	@echo "All notebooks executed."

scoring:
	$(PYTHON) -m src.scoring.run_scoring
	@echo "Scores written to data/processed/"

ml:
	$(PYTHON) -m src.models.run_ml
	@echo "Trend, metric, and cluster outputs written."

eda:
	$(PYTHON) -m src.analysis.run_eda
	@echo "Figures and reports/findings.md written."

export:
	$(PYTHON) -m src.export_frontend_data
	@echo "Frontend data bundle refreshed."

analysis: data scoring ml eda export
	@echo "Full analysis refresh complete."

api:
	uvicorn backend.app.main:app --reload --port 8000

web:
	cd frontend && $(NPM) run dev

report:
	$(PYTHON) "$(REPORT_SCRIPT)"
	@echo "Project report rebuilt in ../docs/project-report/"

test:
	$(PYTEST) tests/ -v --tb=short --cov=src --cov-report=term-missing

clean:
	$(PYTHON) -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__') if '.venv' not in p.parts]"
	$(PYTHON) -c "import pathlib, shutil; [shutil.rmtree(p, ignore_errors=True) for p in ['.pytest_cache', 'frontend/dist', 'htmlcov']]; [p.unlink() for p in pathlib.Path('.').rglob('*.pyc') if '.venv' not in p.parts]"
	@echo "Cleaned caches and build output."
