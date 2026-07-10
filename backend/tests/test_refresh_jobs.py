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


def test_refresh_jobs_endpoint_creates_and_lists_job():
    create_response = client.post("/api/v1/system/refresh-jobs", json={"scope": "watchlist"})

    assert create_response.status_code == 201
    job = create_response.json()
    assert job["status"] == "success"
    assert job["stock_count"] >= 1

    list_response = client.get("/api/v1/system/refresh-jobs")
    assert list_response.status_code == 200
    assert any(item["id"] == job["id"] for item in list_response.json())
