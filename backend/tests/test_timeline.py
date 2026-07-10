from app.services.alerts import AlertEngine
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.timeline import TimelineService


def test_timeline_builds_event_queue_from_alerts_and_checklist():
    provider = MockMarketDataProvider()
    snapshot = provider.get_snapshot("002594")
    assert snapshot is not None
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")
    alerts = AlertEngine().build_alerts(snapshot, diagnosis)

    events = TimelineService().build_events(snapshot, diagnosis, alerts)

    titles = {event.title for event in events}
    assert "临近解禁窗口" in titles
    assert "跟踪解禁窗口" in titles
    assert events[0].severity == "high"
    assert all(event.event_date <= event.due_date for event in events)
