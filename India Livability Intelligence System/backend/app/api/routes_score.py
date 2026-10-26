"""
backend/app/api/routes_score.py
────────────────────────────────
POST /api/score                          — compute scores for all places
GET  /api/states/{state_id}/ranking      — city ranking within a state
GET  /api/factors                        — factor definitions
GET  /api/stats/summary                  — key statistical findings
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.core.loader import DataStore, get_store
from backend.app.schemas.schemas import (
    FactorOut,
    ScoreRequest,
    ScoreResponse,
    StateRankingResponse,
    StatsSummaryResponse,
)
from backend.app.services.scoring import score_all_places

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/score", response_model=ScoreResponse, summary="Compute livability scores")
def compute_score(
    request: ScoreRequest,
    store: DataStore = Depends(get_store),
):
    """
    Body: weights dict (auto-normalized), optional year and place_type.
    Returns scores and ranks for all places in scope.
    Weights that don't sum to 1 are normalized automatically.
    """
    used_year, norm_weights, results = score_all_places(
        store,
        weights=request.weights,
        year=request.year,
        place_type=request.place_type,
    )

    if not results:
        raise HTTPException(
            status_code=503,
            detail="No score results produced. Has the pipeline been run?",
        )

    return ScoreResponse(
        year=used_year,
        weights_normalized=norm_weights,
        results=results,  # type: ignore[arg-type]
    )


@router.get(
    "/states/{state_id}/ranking",
    response_model=StateRankingResponse,
    summary="City ranking within a state",
)
def state_ranking(
    state_id: str,
    store: DataStore = Depends(get_store),
    air_quality: float = Query(0.30, ge=0, le=1),
    safety: float      = Query(0.25, ge=0, le=1),
    health: float      = Query(0.25, ge=0, le=1),
    economy: float     = Query(0.20, ge=0, le=1),
    year: int | None   = Query(None),
):
    """
    Return a ranked list of cities within a state for the given factor weights.
    Weights are passed as query parameters and are auto-normalized.
    """
    places = store.places
    state_row = places[places["place_id"] == state_id]
    if state_row.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_id}' not found.")

    state_info = state_row.iloc[0]
    state_name = state_info["place_name"]

    # Get state score
    weights = {"air_quality": air_quality, "safety": safety,
               "health": health, "economy": economy}
    used_year, norm_w, all_results = score_all_places(store, weights, year, None)

    state_score_item = next((r for r in all_results if r["place_id"] == state_id), None)
    state_score = state_score_item["score"] if state_score_item else None

    # Get city IDs belonging to this state
    city_ids = set(
        places[
            (places["place_type"] == "city") &
            (places["state_name"] == state_name)
        ]["place_id"].tolist()
    )

    city_results = [r for r in all_results if r["place_id"] in city_ids]
    city_results.sort(key=lambda r: (r["score"] is None, -(r["score"] or 0)))

    return StateRankingResponse(
        state_id=state_id,
        state_name=state_name,
        state_score=state_score,
        cities=city_results,  # type: ignore[arg-type]
    )


@router.get("/factors", response_model=list[FactorOut], summary="Factor definitions")
def list_factors(store: DataStore = Depends(get_store)):
    """Return all factor definitions, including direction, level and trend eligibility."""
    config = store.scoring_config.get("factors", {})
    result = []
    for factor_id, fcfg in config.items():
        trend_setting = fcfg.get("trend", "eligible")
        result.append(FactorOut(
            factor_id=factor_id,
            direction=fcfg.get("direction", fcfg.get("indicators", [{}])[0].get("direction", "unknown")),
            level=fcfg.get("level", "unknown"),
            trend_eligible=trend_setting not in ("never", "snapshot"),
            source_id=fcfg.get("source_id"),
            notes=fcfg.get("notes"),
        ))
    return result


@router.get("/stats/summary", response_model=StatsSummaryResponse, summary="Key statistical findings")
def stats_summary(store: DataStore = Depends(get_store)):
    """Return pre-computed key findings from EDA and hypothesis tests."""
    # In production this would be loaded from a reports/findings.json
    # For now return a stub that the notebook will populate.
    return StatsSummaryResponse(
        key_findings=[
            "See reports/findings.md for full EDA results.",
            "Hypothesis test results will be populated after running notebook 03.",
        ],
        hypothesis_tests=[],
        model_metrics=store.metrics,
    )
