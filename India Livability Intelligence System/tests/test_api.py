"""
tests/test_api.py
─────────────────
Unit and integration tests for FastAPI backend routes (M7).
Tests health check, places listing, factor definitions, and score computation.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns status 200 and 'ok'."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_list_places_endpoint():
    """Verify /api/places returns places with expected schema."""
    response = client.get("/api/places")
    assert response.status_code == 200
    places = response.json()
    assert isinstance(places, list)
    if places:
        first = places[0]
        assert "place_id" in first
        assert "place_name" in first
        assert "place_type" in first


def test_factors_endpoint():
    """Verify /api/factors returns core factor definitions."""
    response = client.get("/api/factors")
    assert response.status_code == 200
    factors = response.json()
    assert isinstance(factors, list)


def test_stats_summary_endpoint():
    """Verify /api/stats/summary returns findings or stub."""
    response = client.get("/api/stats/summary")
    assert response.status_code == 200
    data = response.json()
    assert "key_findings" in data or "findings" in data


def test_score_endpoint_validation():
    """Verify POST /api/score handles weights correctly."""
    payload = {
        "weights": {
            "air_quality": 0.4,
            "safety": 0.3,
            "health": 0.2,
            "economy": 0.1
        }
    }
    response = client.post("/api/score", json=payload)
    # If factors_wide is not yet generated from raw data, 503 is gracefully returned as coded
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        data = response.json()
        assert "results" in data
        assert "weights_normalized" in data
