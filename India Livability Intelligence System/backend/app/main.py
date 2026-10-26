"""
backend/app/main.py
────────────────────
FastAPI application entrypoint.

Run with:
    uvicorn backend.app.main:app --reload --port 8000

Auto-generated docs:
    http://localhost:8000/docs
    http://localhost:8000/redoc
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.loader import get_store
from backend.app.api.routes_places import router as places_router
from backend.app.api.routes_score import router as score_router
from backend.app.schemas.schemas import HealthResponse

logger = logging.getLogger(__name__)


# ── Lifespan: preload data on startup ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the DataStore once at startup — fail fast if files are missing."""
    logger.info("Starting up — loading data store ...")
    try:
        store = get_store()
        logger.info("Data store loaded: %d places.", len(store.places))
    except Exception as exc:
        logger.critical("FATAL: Could not load data store: %s", exc)
        raise
    yield
    logger.info("Shutting down.")


# ── App ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description=settings.app_description,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────

app.include_router(places_router, prefix="/api", tags=["Places"])
app.include_router(score_router,  prefix="/api", tags=["Scoring"])


# ── Health check ───────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def health():
    """Service status and data version."""
    store = get_store()
    return HealthResponse(
        status="ok",
        version=settings.app_version,
        data_dir=str(settings.data_dir),
    )
