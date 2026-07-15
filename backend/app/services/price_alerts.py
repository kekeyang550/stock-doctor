from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.diagnosis import PriceAlert, StockSnapshot
from app.services.storage import StateStore, create_state_store
from app.services.symbols import normalize_a_share_symbol


class PriceAlertService:
    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()

    def list_alerts(self, snapshots: dict[str, StockSnapshot], symbol: str | None = None) -> list[PriceAlert]:
        normalized = normalize_a_share_symbol(symbol) if symbol else None
        raw_alerts = self._state_store.load_price_alerts()
        normalized_alerts, changed = self._normalize_alert_records(raw_alerts)
        if changed:
            self._state_store.save_price_alerts(normalized_alerts)
        alerts = []
        for item in normalized_alerts:
            item_symbol = normalize_a_share_symbol(str(item.get("symbol", "")))
            if normalized and item_symbol != normalized:
                continue
            snapshot = snapshots.get(item_symbol)
            if snapshot is None:
                continue
            alerts.append(self._hydrate(item, snapshot))
        return sorted(alerts, key=lambda item: item.created_at, reverse=True)

    def add_alert(self, snapshot: StockSnapshot, target_price: float, direction: str, label: str) -> PriceAlert:
        record = {
            "id": uuid4().hex,
            "symbol": snapshot.symbol,
            "target_price": round(target_price, 2),
            "direction": direction,
            "label": label.strip(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        alerts = self._state_store.load_price_alerts()
        alerts.insert(0, record)
        self._state_store.save_price_alerts(alerts[:200])
        return self._hydrate(record, snapshot)

    def delete_alert(self, alert_id: str) -> bool:
        alerts = self._state_store.load_price_alerts()
        next_alerts = [item for item in alerts if item.get("id") != alert_id]
        self._state_store.save_price_alerts(next_alerts)
        return len(next_alerts) != len(alerts)

    def _normalize_alert_records(self, alerts: list[dict]) -> tuple[list[dict], bool]:
        changed = False
        normalized_alerts = []
        for item in alerts:
            record = dict(item)
            normalized_symbol = normalize_a_share_symbol(str(record.get("symbol", "")))
            if normalized_symbol and record.get("symbol") != normalized_symbol:
                record["symbol"] = normalized_symbol
                changed = True
            normalized_alerts.append(record)
        return normalized_alerts, changed

    def _hydrate(self, item: dict, snapshot: StockSnapshot) -> PriceAlert:
        target_price = float(item["target_price"])
        direction = str(item["direction"])
        triggered = snapshot.last_price >= target_price if direction == "above" else snapshot.last_price <= target_price
        distance_pct = ((target_price - snapshot.last_price) / snapshot.last_price) * 100
        return PriceAlert(
            id=str(item["id"]),
            symbol=snapshot.symbol,
            name=snapshot.name,
            target_price=round(target_price, 2),
            direction=direction,
            label=str(item["label"]),
            last_price=snapshot.last_price,
            distance_pct=round(distance_pct, 2),
            status="triggered" if triggered else "watching",
            created_at=str(item["created_at"]),
        )
