from app.services.market_data import MockMarketDataProvider
from app.services.price_alerts import PriceAlertService
from app.services.storage import JsonStateStore


def test_price_alert_service_tracks_trigger_status_and_deletes(tmp_path):
    provider = MockMarketDataProvider()
    snapshot = provider.get_snapshot("600519")
    assert snapshot is not None
    service = PriceAlertService(JsonStateStore(tmp_path / "state.json"))

    alert = service.add_alert(snapshot, target_price=1500, direction="above", label="突破观察")
    alerts = service.list_alerts({snapshot.symbol: snapshot}, symbol="600519")

    assert alerts[0].id == alert.id
    assert alerts[0].status == "triggered"
    assert alerts[0].distance_pct < 0
    assert service.delete_alert(alert.id) is True
    assert service.list_alerts({snapshot.symbol: snapshot}, symbol="600519") == []
