"""
backend/app/schemas/schemas.py
────────────────────────────────
Pydantic v2 request/response models for all API endpoints.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, field_validator, model_validator


# ── Shared ─────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    data_dir: str


class PlaceOut(BaseModel):
    place_id: str
    place_name: str
    place_type: str          # 'state' | 'city'
    state_name: str
    latitude: float | None = None
    longitude: float | None = None
    region: str | None = None


class FactorOut(BaseModel):
    factor_id: str
    direction: str
    level: str
    trend_eligible: bool
    source_id: str | None = None
    notes: str | None = None


# ── Score endpoint ──────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    weights: dict[str, float]
    year: int | None = None
    place_type: str | None = None   # 'state' | 'city' | None (both)

    @field_validator("weights")
    @classmethod
    def weights_not_empty(cls, v: dict) -> dict:
        if not v:
            raise ValueError("'weights' must not be empty.")
        if all(w == 0 for w in v.values()):
            raise ValueError("At least one weight must be non-zero.")
        return v

    @model_validator(mode="after")
    def normalize_weights(self) -> "ScoreRequest":
        total = sum(self.weights.values())
        if total > 0:
            self.weights = {k: v / total for k, v in self.weights.items()}
        return self


class PlaceScoreOut(BaseModel):
    place_id: str
    place_name: str
    place_type: str
    state_name: str
    score: float | None
    rank: int | None
    factor_scores: dict[str, float | None]
    partial_data: bool
    missing_factors: list[str]
    inherited_factors: list[str]


class ScoreResponse(BaseModel):
    year: int
    weights_normalized: dict[str, float]
    results: list[PlaceScoreOut]


# ── State ranking endpoint ──────────────────────────────────────────────────

class StateRankingResponse(BaseModel):
    state_id: str
    state_name: str
    state_score: float | None
    cities: list[PlaceScoreOut]


# ── Place detail endpoint ───────────────────────────────────────────────────

class FactorHistoryPoint(BaseModel):
    year: int
    value_raw: float | None
    value_norm: float | None
    is_imputed: bool
    is_inherited: bool
    series_break: bool
    gap_flag: str


class PlaceDetailOut(BaseModel):
    place_id: str
    place_name: str
    place_type: str
    state_name: str
    region: str | None
    latitude: float | None
    longitude: float | None
    factor_history: dict[str, list[FactorHistoryPoint]]


# ── Trend endpoint ──────────────────────────────────────────────────────────

class ProjectionPoint(BaseModel):
    year: int
    yhat: float
    lower: float
    upper: float


class FactorTrendOut(BaseModel):
    factor: str
    n_points: int
    slope: float | None
    p_value: float | None
    r2: float | None
    outlook: str      # 'Improving' | 'Declining' | 'Stable or uncertain' | 'Insufficient data' | 'No trend available'
    series_break_flag: bool
    gap_flag: str
    projections: list[ProjectionPoint]
    disclaimer: str = (
        "Naive linear trend projection from limited yearly data. "
        "Not a prediction of future conditions."
    )


class TrendResponse(BaseModel):
    place_id: str
    place_name: str
    trends: list[FactorTrendOut]


# ── Clusters endpoint ───────────────────────────────────────────────────────

class ClusterOut(BaseModel):
    place_id: str
    place_name: str
    cluster_id: int
    tier_label: str


# ── Stats summary endpoint ──────────────────────────────────────────────────

class StatsSummaryResponse(BaseModel):
    key_findings: list[str]
    hypothesis_tests: list[dict[str, Any]]
    model_metrics: dict[str, Any]


# ── Source register endpoint ────────────────────────────────────────────────

class SourceOut(BaseModel):
    source_id: str
    name: str
    publisher: str
    url: str | None
    license: str | None
    downloaded_on: str | None
    level: str | None
    notes: str | None
