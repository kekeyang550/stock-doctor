from app.services.storage import SQLiteStateStore, create_state_store


def test_sqlite_watchlist_persists_across_instances(tmp_path):
    path = tmp_path / "state.sqlite3"
    first_store = SQLiteStateStore(path)

    assert first_store.load_watchlist(["600519"]) == ["600519"]

    first_store.save_watchlist(["000001", " 600519 "])
    second_store = SQLiteStateStore(path)

    assert second_store.load_watchlist([]) == ["000001", "600519"]


def test_sqlite_persists_state_collections(tmp_path):
    store = SQLiteStateStore(tmp_path / "state.sqlite3")
    payload = [{"id": "record-1", "value": 1}]

    store.save_reports(payload)
    store.save_notes(payload)
    store.save_price_alerts(payload)
    store.save_refresh_jobs(payload)
    store.save_review_action_statuses(payload)

    assert store.load_reports() == payload
    assert store.load_notes() == payload
    assert store.load_price_alerts() == payload
    assert store.load_refresh_jobs() == payload
    assert store.load_review_action_statuses() == payload


def test_create_state_store_can_select_sqlite(tmp_path, monkeypatch):
    path = tmp_path / "state.sqlite3"
    monkeypatch.setenv("STOCK_DOCTOR_STATE_BACKEND", "sqlite")
    monkeypatch.setenv("STOCK_DOCTOR_STATE_PATH", str(path))

    store = create_state_store()

    assert isinstance(store, SQLiteStateStore)
    store.save_watchlist(["300750"])
    assert SQLiteStateStore(path).load_watchlist([]) == ["300750"]
