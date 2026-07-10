from app.services.market_data import MockMarketDataProvider
from app.services.storage import JsonStateStore


def test_watchlist_persists_across_provider_instances(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    first_provider = MockMarketDataProvider(state_store=store)

    assert first_provider.add_to_watchlist("000001") is True

    second_provider = MockMarketDataProvider(state_store=store)
    symbols = [stock.symbol for stock in second_provider.get_watchlist()]

    assert "000001" in symbols


def test_invalid_state_file_falls_back_to_default(tmp_path):
    state_file = tmp_path / "state.json"
    state_file.write_text("{bad json", encoding="utf-8")
    store = JsonStateStore(state_file)

    assert store.load_watchlist(["600519"]) == ["600519"]


def test_refresh_jobs_persist_in_json_store(tmp_path):
    state_file = tmp_path / "state.json"
    store = JsonStateStore(state_file)
    jobs = [{"id": "job-1", "status": "success"}]

    store.save_refresh_jobs(jobs)

    assert JsonStateStore(state_file).load_refresh_jobs() == jobs


def test_review_action_statuses_persist_in_json_store(tmp_path):
    state_file = tmp_path / "state.json"
    store = JsonStateStore(state_file)
    statuses = [{"key": "600519:swing:a1", "status": "done"}]

    store.save_review_action_statuses(statuses)

    assert JsonStateStore(state_file).load_review_action_statuses() == statuses
