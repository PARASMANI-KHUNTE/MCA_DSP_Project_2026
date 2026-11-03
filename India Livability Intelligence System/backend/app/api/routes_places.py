"""
backend/app/api/routes_places.py
──────────────────────────────────
GET /api/places          — list all places
GET /api/places/{id}     — place detail with factor history
GET /api/places/{id}/trend — 10-year projection
GET /api/clusters        — tier labels
GET /api/sources         — source register
"""

import logging

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from backend.app.core.loader import DataStore, get_store
from backend.app.schemas.schemas import (
    ClusterOut,
    FactorHistoryPoint,
    FactorTrendOut,
    PlaceDetailOut,
    PlaceOut,
    ProjectionPoint,
    SourceOut,
    TrendResponse,
)
from backend.app.services.scoring import get_place_trend

logger = logging.getLogger(__name__)
router = APIRouter()


def _coerce(val, typ=float):
    try:
        return typ(val)
    except (TypeError, ValueError):
        return None


def _opt_str(val):
    """Return a string or None, treating pandas NaN/NaT as missing."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return str(val)


def _str(val):
    return _opt_str(val) or ""


@router.get("/places", response_model=list[PlaceOut], summary="List all places")
def list_places(store: DataStore = Depends(get_store)):
    """Return all known places (states and cities) with coordinates."""
    places = store.places
    if places.empty:
        return []
    result = []
    for _, row in places.iterrows():
        result.append(PlaceOut(
            place_id=_str(row.get("place_id")),
            place_name=_str(row.get("place_name")),
            place_type=_str(row.get("place_type")),
            state_name=_str(row.get("state_name")),
            latitude=_coerce(row.get("latitude")),
            longitude=_coerce(row.get("longitude")),
            region=_opt_str(row.get("region")),
        ))
    return result


@router.get("/places/{place_id}", response_model=PlaceDetailOut, summary="Place detail with factor history")
def place_detail(place_id: str, store: DataStore = Depends(get_store)):
    """Return metadata and per-factor historical values for a place."""
    places = store.places
    place_row = places[places["place_id"] == place_id]
    if place_row.empty:
        raise HTTPException(status_code=404, detail=f"Place '{place_id}' not found.")

    row = place_row.iloc[0]
    tidy = store.factors_tidy
    if tidy.empty or "place_id" not in tidy.columns:
        factor_history = {}
    else:
        place_tidy = tidy[tidy["place_id"] == place_id].copy()
        factor_history: dict[str, list[FactorHistoryPoint]] = {}
        for factor, grp in place_tidy.groupby("factor"):
            grp = grp.sort_values("year")
            points = []
            for _, frow in grp.iterrows():
                points.append(FactorHistoryPoint(
                    year=int(frow["year"]) if pd.notna(frow.get("year")) else 0,
                    value_raw=_coerce(frow.get("value_raw")),
                    value_norm=_coerce(frow.get("value_norm")),
                    is_imputed=bool(frow.get("is_imputed", False)),
                    is_inherited=bool(frow.get("is_inherited", False)),
                    series_break=bool(frow.get("series_break", False)),
                    gap_flag=_str(frow.get("gap_flag")),
                ))
            factor_history[str(factor)] = points

    return PlaceDetailOut(
        place_id=_str(row.get("place_id")),
        place_name=_str(row.get("place_name")),
        place_type=_str(row.get("place_type")),
        state_name=_str(row.get("state_name")),
        region=_opt_str(row.get("region")),
        latitude=_coerce(row.get("latitude")),
        longitude=_coerce(row.get("longitude")),
        factor_history=factor_history,
    )


@router.get(
    "/places/{place_id}/trend",
    response_model=TrendResponse,
    summary="10-year trend projection for a place",
)
def place_trend(place_id: str, store: DataStore = Depends(get_store)):
    """Return slope, outlook label, and 10-year projection per factor."""
    places = store.places
    place_row = places[places["place_id"] == place_id]
    if place_row.empty:
        raise HTTPException(status_code=404, detail=f"Place '{place_id}' not found.")

    place_name = place_row.iloc[0]["place_name"]
    raw_trends = get_place_trend(store, place_id)

    trends_out = []
    for t in raw_trends:
        trends_out.append(FactorTrendOut(
            factor=t["factor"],
            n_points=t["n_points"],
            slope=t["slope"],
            p_value=t["p_value"],
            r2=t["r2"],
            outlook=t["outlook"],
            series_break_flag=t["series_break_flag"],
            gap_flag=t["gap_flag"],
            projections=[ProjectionPoint(**p) for p in t["projections"]],
        ))

    return TrendResponse(place_id=place_id, place_name=place_name, trends=trends_out)


@router.get("/clusters", response_model=list[ClusterOut], summary="K-Means tier labels")
def list_clusters(store: DataStore = Depends(get_store)):
    """Return cluster assignments for all places."""
    clusters = store.clusters
    if clusters.empty:
        return []
    places_map = store.places.set_index("place_id")["place_name"].to_dict()
    result = []
    for _, row in clusters.iterrows():
        pid = _str(row.get("place_id"))
        result.append(ClusterOut(
            place_id=pid,
            place_name=_str(places_map.get(pid, pid)),
            cluster_id=int(_coerce(row.get("cluster_id"), int) or 0),
            tier_label=_str(row.get("tier_label")),
        ))
    return result


@router.get("/sources", response_model=list[SourceOut], summary="Dataset source register")
def list_sources(store: DataStore = Depends(get_store)):
    """Return all datasets with their licenses and attribution."""
    sources = store.source_register
    if sources.empty:
        return []
    result = []
    for _, row in sources.iterrows():
        result.append(SourceOut(
            source_id=_str(row.get("source_id")),
            name=_str(row.get("name")),
            publisher=_str(row.get("publisher")),
            url=_opt_str(row.get("url")),
            license=_opt_str(row.get("license")),
            downloaded_on=_opt_str(row.get("downloaded_on")),
            level=_opt_str(row.get("level")),
            notes=_opt_str(row.get("notes")),
        ))
    return result
