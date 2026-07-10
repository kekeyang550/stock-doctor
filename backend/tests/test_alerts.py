from app.services.alerts import AlertEngine
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider


def test_alert_engine_flags_hot_and_event_risk():
    provider = MockMarketDataProvider()
    snapshot = provider.get_snapshot("002594")
    assert snapshot is not None
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")

    alerts = AlertEngine().build_alerts(snapshot, diagnosis)

    titles = {alert.title for alert in alerts}
    assert "高分趋势候选" in titles
    assert "短线热度偏高" in titles
    assert "临近解禁窗口" in titles
    assert any(alert.severity == "high" for alert in alerts)


def test_alert_engine_flags_capital_outflow():
    provider = MockMarketDataProvider()
    snapshot = provider.get_snapshot("300750")
    assert snapshot is not None
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")

    alerts = AlertEngine().build_alerts(snapshot, diagnosis)

    assert any(alert.title == "主力资金流出" for alert in alerts)
