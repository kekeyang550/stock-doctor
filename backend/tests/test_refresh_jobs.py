from fastapi.testclient import TestClient

from app.main import create_app
from app.services.market_data import MockMarketDataProvider
from app.services.refresh_jobs import DataRefreshJobService
from app.services.storage import JsonStateStore


client = TestClient(create_app())


def test_refresh_job_service_records_successful_refresh(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = MockMarketDataProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)

    job = service.run_refresh(provider=provider, scope="all")
    jobs = service.list_jobs()

    assert job.status == "success"
    assert job.stock_count >= 1
    assert job.watchlist_count >= 1
    assert jobs[0].id == job.id


def test_refresh_job_service_builds_freshness_status(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = MockMarketDataProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)

    unknown = service.build_freshness(provider=provider)
    assert unknown.status == "unknown"
    assert unknown.last_success_at is None

    service.run_refresh(provider=provider, scope="all")
    freshness = service.build_freshness(provider=provider)

    assert freshness.status == "fresh"
    assert freshness.last_stock_count == len(provider.list_stocks())
    assert freshness.coverage_pct == 100


def test_refresh_jobs_endpoint_creates_and_lists_job():
    create_response = client.post("/api/v1/system/refresh-jobs", json={"scope": "watchlist"})

    assert create_response.status_code == 201
    job = create_response.json()
    assert job["status"] == "success"
    assert job["stock_count"] >= 1

    list_response = client.get("/api/v1/system/refresh-jobs")
    assert list_response.status_code == 200
    assert any(item["id"] == job["id"] for item in list_response.json())


def test_freshness_endpoint_returns_status():
    response = client.get("/api/v1/system/freshness")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"unknown", "fresh", "stale", "expired"}
    assert {"provider", "coverage_pct", "next_action"}.issubset(payload.keys())
