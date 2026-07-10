import json
import os
import sqlite3
from pathlib import Path
from typing import Any


class JsonStateStore:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or Path(__file__).resolve().parents[2] / "data" / "state.json"

    def load_watchlist(self, default: list[str]) -> list[str]:
        state = self._load()
        symbols = state.get("watchlist")
        if not isinstance(symbols, list):
            return default
        return [str(symbol).strip().upper() for symbol in symbols if str(symbol).strip()]

    def save_watchlist(self, symbols: list[str]) -> None:
        state = self._load()
        state["watchlist"] = symbols
        self._save(state)

    def load_reports(self) -> list[dict[str, Any]]:
        state = self._load()
        reports = state.get("reports")
        return reports if isinstance(reports, list) else []

    def save_reports(self, reports: list[dict[str, Any]]) -> None:
        state = self._load()
        state["reports"] = reports
        self._save(state)

    def load_notes(self) -> list[dict[str, Any]]:
        state = self._load()
        notes = state.get("notes")
        return notes if isinstance(notes, list) else []

    def save_notes(self, notes: list[dict[str, Any]]) -> None:
        state = self._load()
        state["notes"] = notes
        self._save(state)

    def load_price_alerts(self) -> list[dict[str, Any]]:
        state = self._load()
        alerts = state.get("price_alerts")
        return alerts if isinstance(alerts, list) else []

    def save_price_alerts(self, alerts: list[dict[str, Any]]) -> None:
        state = self._load()
        state["price_alerts"] = alerts
        self._save(state)

    def load_review_action_statuses(self) -> list[dict[str, Any]]:
        state = self._load()
        statuses = state.get("review_action_statuses")
        return statuses if isinstance(statuses, list) else []

    def save_review_action_statuses(self, statuses: list[dict[str, Any]]) -> None:
        state = self._load()
        state["review_action_statuses"] = statuses
        self._save(state)

    def load_refresh_jobs(self) -> list[dict[str, Any]]:
        state = self._load()
        jobs = state.get("refresh_jobs")
        return jobs if isinstance(jobs, list) else []

    def save_refresh_jobs(self, jobs: list[dict[str, Any]]) -> None:
        state = self._load()
        state["refresh_jobs"] = jobs
        self._save(state)

    def _load(self) -> dict[str, object]:
        if not self.path.exists():
            return {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
        return data if isinstance(data, dict) else {}

    def _save(self, state: dict[str, object]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


class SQLiteStateStore:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or Path(__file__).resolve().parents[2] / "data" / "state.sqlite3"
        self._init_schema()

    def load_watchlist(self, default: list[str]) -> list[str]:
        symbols = self._load_key("watchlist", default)
        if not isinstance(symbols, list):
            return default
        return [str(symbol).strip().upper() for symbol in symbols if str(symbol).strip()]

    def save_watchlist(self, symbols: list[str]) -> None:
        self._save_key("watchlist", symbols)

    def load_reports(self) -> list[dict[str, Any]]:
        reports = self._load_key("reports", [])
        return reports if isinstance(reports, list) else []

    def save_reports(self, reports: list[dict[str, Any]]) -> None:
        self._save_key("reports", reports)

    def load_notes(self) -> list[dict[str, Any]]:
        notes = self._load_key("notes", [])
        return notes if isinstance(notes, list) else []

    def save_notes(self, notes: list[dict[str, Any]]) -> None:
        self._save_key("notes", notes)

    def load_price_alerts(self) -> list[dict[str, Any]]:
        alerts = self._load_key("price_alerts", [])
        return alerts if isinstance(alerts, list) else []

    def save_price_alerts(self, alerts: list[dict[str, Any]]) -> None:
        self._save_key("price_alerts", alerts)

    def load_review_action_statuses(self) -> list[dict[str, Any]]:
        statuses = self._load_key("review_action_statuses", [])
        return statuses if isinstance(statuses, list) else []

    def save_review_action_statuses(self, statuses: list[dict[str, Any]]) -> None:
        self._save_key("review_action_statuses", statuses)

    def load_refresh_jobs(self) -> list[dict[str, Any]]:
        jobs = self._load_key("refresh_jobs", [])
        return jobs if isinstance(jobs, list) else []

    def save_refresh_jobs(self, jobs: list[dict[str, Any]]) -> None:
        self._save_key("refresh_jobs", jobs)

    def _connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        return sqlite3.connect(self.path)

    def _init_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS kv_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )

    def _load_key(self, key: str, default: object) -> object:
        try:
            with self._connect() as connection:
                row = connection.execute("SELECT value FROM kv_state WHERE key = ?", (key,)).fetchone()
        except sqlite3.Error:
            return default
        if row is None:
            return default
        try:
            return json.loads(str(row[0]))
        except json.JSONDecodeError:
            return default

    def _save_key(self, key: str, value: object) -> None:
        payload = json.dumps(value, ensure_ascii=False)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO kv_state (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, payload),
            )


StateStore = JsonStateStore | SQLiteStateStore


def create_state_store() -> StateStore:
    backend = os.getenv("STOCK_DOCTOR_STATE_BACKEND", "json").strip().lower()
    path_value = os.getenv("STOCK_DOCTOR_STATE_PATH")
    path = Path(path_value) if path_value else None
    if backend == "sqlite":
        return SQLiteStateStore(path)
    return JsonStateStore(path)
