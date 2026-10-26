# ============================================================
# India Livability Intelligence System — Makefile
# Usage: make <target>
# Requires: Python 3.11+ with venv activated, Node.js for frontend
# ============================================================

PYTHON = python
PIP    = pip
PYTEST = pytest
NPM    = npm

BASE   = "India Livability Intelligence System"
NB_DIR = notebooks

.PHONY: install data notebooks api web test docker clean help

help:
	@echo ""
	@echo "  make install     Install Python + frontend dependencies"
	@echo "  make data        Run the full cleaning and merging pipeline"
	@echo "  make notebooks   Execute all notebooks in order"
	@echo "  make api         Start FastAPI backend on port 8000"
	@echo "  make web         Start frontend dev server"
	@echo "  make test        Run the full pytest suite"
	@echo "  make docker      Build and run everything via Docker Compose"
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
	cd backend && uvicorn app.main:app --reload --port 8000

web:
	cd frontend && $(NPM) run dev

test:
	$(PYTEST) tests/ -v --tb=short --cov=src --cov-report=term-missing

docker:
	docker compose up --build

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned."
