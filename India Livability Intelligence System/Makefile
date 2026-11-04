# ============================================================
# India Livability Intelligence System — Makefile
# Usage: make <target>
# Requires: Python 3.11+ with venv activated, Node.js for frontend
# ============================================================

PYTHON = python
PIP    = pip
PYTEST = pytest
NPM    = npm

NB_DIR = notebooks

.PHONY: install data notebooks api web test clean help

help:
	@echo ""
	@echo "  make install     Install Python + frontend dependencies"
	@echo "  make data        Run the full cleaning and merging pipeline"
	@echo "  make notebooks   Execute all notebooks in order"
	@echo "  make api         Start FastAPI backend on port 8000"
	@echo "  make web         Start frontend dev server"
	@echo "  make test        Run the full pytest suite"
	@echo "  make clean       Remove generated data and cache files"
	@echo ""

install:
	$(PIP) install -r requirements.txt
	@echo "✅ Python dependencies installed."
	cd frontend && $(NPM) install
	@echo "✅ Frontend dependencies installed."

data:
	$(PYTHON) -m src.cleaning.run_pipeline
	@echo "✅ Pipeline complete. Outputs in data/processed/"

notebooks:
	jupyter nbconvert --to notebook --execute --inplace \
		$(NB_DIR)/00_coverage_check.ipynb \
		$(NB_DIR)/01_data_profiling.ipynb \
		$(NB_DIR)/02_cleaning_merging.ipynb \
		$(NB_DIR)/03_statistics_eda.ipynb \
		$(NB_DIR)/04_scoring.ipynb \
		$(NB_DIR)/05_ml_trend_clustering.ipynb
	@echo "✅ All notebooks executed."

api:
	uvicorn backend.app.main:app --reload --port 8000

web:
	cd frontend && $(NPM) run dev

test:
	$(PYTEST) tests/ backend/tests/ -v --tb=short --cov=src --cov-report=term-missing

clean:
	@powershell -Command "Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
	@powershell -Command "Get-ChildItem -Recurse -Filter *.pyc | Remove-Item -ErrorAction SilentlyContinue"
	@powershell -Command "Get-ChildItem -Recurse -Directory -Filter .pytest_cache | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
	@echo "✅ Cleaned."
