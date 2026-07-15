import asyncio

from fastapi.testclient import TestClient

from app.main import create_app
from app.config import settings
from app.services.market_data import MockMarketDataProvider
from app.services.refresh_jobs import DataRefreshJobService
from app.services.refresh_scheduler import DataRefreshScheduler
from app.services.storage import JsonStateStore


client = TestClient(create_app())


class WarmableProvider(MockMarketDataProvider):
    def __init__(self, state_store):
        super().__init__(state_store=state_store)
        self.warmed_scopes = []

    def warm_cache(self, scope: str = "all") -> int:
        self.warmed_scopes.append(scope)
        return len(self.get_watchlist() if scope == "watchlist" else self.list_stocks())


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


def test_refresh_job_service_warms_provider_cache(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = WarmableProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)

    job = service.run_refresh(provider=provider, scope="watchlist")

    assert job.status == "success"
    assert provider.warmed_scopes == ["watchlist"]
    assert job.stock_count == len(provider.get_watchlist())


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


def test_refresh_job_service_uses_configured_freshness_threshold(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_freshness_stale_after_minutes", 12)
    store = JsonStateStore(tmp_path / "state.json")
    provider = MockMarketDataProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)

    freshness = service.build_freshness(provider=provider)

    assert freshness.stale_after_minutes == 12


def test_refresh_scheduler_is_disabled_by_default(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = WarmableProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)
    scheduler = DataRefreshScheduler(provider=provider, refresh_service=service, enabled=False)

    assert scheduler.start() is False
    assert scheduler.running is False
    assert provider.warmed_scopes == []


def test_refresh_scheduler_can_run_configured_scope_once(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = WarmableProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)
    scheduler = DataRefreshScheduler(
        provider=provider,
        refresh_service=service,
        enabled=True,
        interval_minutes=5,
        scope="watchlist",
        run_on_startup=False,
    )

    asyncio.run(scheduler.run_once())

    assert provider.warmed_scopes == ["watchlist"]
    assert service.list_jobs()[0].status == "success"


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
