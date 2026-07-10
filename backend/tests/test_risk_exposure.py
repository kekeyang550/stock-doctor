from app.services.alerts import AlertEngine
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.risk_exposure import RiskExposureService


def test_risk_exposure_groups_alerts_by_category():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    alerts = []
    for stock in provider.list_stocks():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = engine.diagnose(snapshot, horizon="swing")
        alerts.extend(AlertEngine().build_alerts(snapshot, diagnosis))

    exposure = RiskExposureService().summarize(alerts)

    assert len(exposure) > 0
    assert exposure[0].severity_score >= exposure[-1].severity_score
    assert any(item.category == "事件" for item in exposure)
