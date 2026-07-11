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


def test_screener_returns_candidates_for_new_presets():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    service = ScreenerService()

    breakout = service.screen(snapshots, diagnoses, preset="breakout-volume")
    capital_return = service.screen(snapshots, diagnoses, preset="capital-return")
    risk_avoidance = service.screen(snapshots, diagnoses, preset="risk-avoidance")

    assert any(item.symbol == "600519" for item in breakout)
    assert any(item.symbol == "600519" for item in capital_return)
    assert any(item.symbol == "300750" for item in risk_avoidance)
    assert any(item.symbol == "002594" for item in risk_avoidance)


def test_screener_candidates_include_strategy_explanations():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    service = ScreenerService()

    breakout = service.screen(snapshots, diagnoses, preset="breakout-volume")
    candidate = next(item for item in breakout if item.symbol == "600519")

    assert "站上均线" in candidate.rule_tags
    assert "技术分" in candidate.positive_evidence
    assert "MA20" in candidate.invalidation_risk
