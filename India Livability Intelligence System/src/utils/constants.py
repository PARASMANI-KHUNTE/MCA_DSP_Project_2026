"""
src/utils/constants.py
─────────────────────
Project-wide constants.  Import from here; never hardcode strings elsewhere.
"""

from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]          # India Livability Intelligence System/
DATA_RAW        = ROOT / "data" / "raw"
DATA_INTERIM    = ROOT / "data" / "interim"
DATA_PROCESSED  = ROOT / "data" / "processed"
REPORTS         = ROOT / "reports"
FIGURES         = ROOT / "reports" / "figures"
MODELS_DIR      = ROOT / "models"
SRC             = ROOT / "src"

# Key raw sub-folders
RAW_AIR_KAGGLE  = DATA_RAW / "air_kaggle"
RAW_AIR_CPCB    = DATA_RAW / "air_cpcb"
RAW_SAFETY      = DATA_RAW / "safety"
RAW_HEALTH      = DATA_RAW / "health"
RAW_ECONOMY     = DATA_RAW / "economy"
RAW_COL         = DATA_RAW / "cost_of_living"
RAW_BOUNDARIES  = DATA_RAW / "boundaries"

# Key processed files
PLACES_CSV          = DATA_PROCESSED / "places.csv"
FACTORS_TIDY        = DATA_PROCESSED / "factors_tidy.parquet"
FACTORS_WIDE        = DATA_PROCESSED / "factors_wide.csv"
SCORES_WIDE         = DATA_PROCESSED / "scores_wide.csv"
TRENDS_CSV          = DATA_PROCESSED / "trends.csv"
CLUSTERS_CSV        = DATA_PROCESSED / "clusters.csv"
METRICS_JSON        = MODELS_DIR / "metrics.json"

# Source register & aliases
SOURCE_REGISTER     = DATA_RAW / "source_register.csv"
NAME_ALIASES        = DATA_RAW / "name_aliases.csv"
SCORING_CONFIG      = SRC / "scoring" / "factors_config.yaml"

# ── Factor identifiers ─────────────────────────────────────────────────────
FACTOR_AIR      = "air_quality"
FACTOR_SAFETY   = "safety"
FACTOR_HEALTH   = "health"
FACTOR_ECONOMY  = "economy"
FACTOR_COL      = "cost_of_living"
CORE_FACTORS    = [FACTOR_AIR, FACTOR_SAFETY, FACTOR_HEALTH, FACTOR_ECONOMY]
ALL_FACTORS     = CORE_FACTORS + [FACTOR_COL]

# ── Place types ────────────────────────────────────────────────────────────
PLACE_STATE = "state"
PLACE_CITY  = "city"

# ── Regions ───────────────────────────────────────────────────────────────
REGIONS = ["North", "South", "East", "West", "Central", "Northeast"]

STATE_REGION_MAP = {
    "Jammu and Kashmir": "North",
    "Ladakh": "North",
    "Himachal Pradesh": "North",
    "Punjab": "North",
    "Chandigarh": "North",
    "Haryana": "North",
    "Uttarakhand": "North",
    "Uttar Pradesh": "North",
    "Delhi": "North",
    "Rajasthan": "North",
    "Gujarat": "West",
    "Maharashtra": "West",
    "Goa": "West",
    "Dadra and Nagar Haveli and Daman and Diu": "West",
    "Madhya Pradesh": "Central",
    "Chhattisgarh": "Central",
    "Bihar": "East",
    "Jharkhand": "East",
    "West Bengal": "East",
    "Odisha": "East",
    "Sikkim": "Northeast",
    "Assam": "Northeast",
    "Arunachal Pradesh": "Northeast",
    "Nagaland": "Northeast",
    "Manipur": "Northeast",
    "Mizoram": "Northeast",
    "Tripura": "Northeast",
    "Meghalaya": "Northeast",
    "Andhra Pradesh": "South",
    "Telangana": "South",
    "Karnataka": "South",
    "Kerala": "South",
    "Tamil Nadu": "South",
    "Puducherry": "South",
    "Lakshadweep": "South",
    "Andaman and Nicobar Islands": "South",
}

# ── AQI Categories (label encoding: higher number = worse air) ─────────────
AQI_CATEGORY_ORDER = {
    "Good": 0,
    "Satisfactory": 1,
    "Moderate": 2,
    "Poor": 3,
    "Very Poor": 4,
    "Severe": 5,
}

# ── Quality thresholds ─────────────────────────────────────────────────────
# City air inclusion rule (M2.1.2)
MIN_KAGGLE_VALID_YEARS  = 4     # within 2015–2019
MIN_CPCB_VALID_YEARS    = 1     # within 2023–2024
MIN_DAY_COVERAGE_PCT    = 0.75  # ≥75% of days in a year to count as valid

# Missing data imputation threshold
MAX_MISSING_PCT_TO_IMPUTE = 0.20   # impute if < 20% missing; else exclude

# Minimum yearly points required for trend projection
MIN_TREND_POINTS = 5

# Normalization score range
SCORE_MIN = 0.0
SCORE_MAX = 100.0

# ── Year alignment rule ────────────────────────────────────────────────────
# Financial year 2022-23  → reference year 2022  (start year)
# Survey year  2022-23   → reference year 2022
YEAR_ALIGNMENT_RULE = "start_year"

# ── Sensitivity analysis ───────────────────────────────────────────────────
SENSITIVITY_N_DRAWS = 1_000   # Dirichlet draws for rank-stability check
SENSITIVITY_SEED    = 42

# ── Statistical thresholds ────────────────────────────────────────────────
P_VALUE_THRESHOLD = 0.05      # significance level for trend classification

# ── K-Means ───────────────────────────────────────────────────────────────
KMEANS_SEED        = 42
KMEANS_K_RANGE     = range(2, 8)   # elbow method search range

# ── Trend projection ──────────────────────────────────────────────────────
PROJECTION_YEARS   = 10
PREDICTION_INTERVAL_ALPHA = 0.05   # 95% prediction interval

# ── COVID year flag ───────────────────────────────────────────────────────
COVID_YEAR = 2020
