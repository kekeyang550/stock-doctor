from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.screener import ScreenerService


def test_screener_returns_candidates_for_presets():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    service = ScreenerService()

    strong = service.screen(snapshots, diagnoses, preset="strong")
    value = service.screen(snapshots, diagnoses, preset="value")
    capital_risk = service.screen(snapshots, diagnoses, preset="capital-risk")

    assert any(item.symbol == "600519" for item in strong)
    assert any(item.symbol == "000001" for item in value)
    assert any(item.symbol == "300750" for item in capital_risk)
