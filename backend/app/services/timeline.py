from datetime import date, timedelta

from app.schemas.diagnosis import AlertItem, DiagnosisResponse, StockSnapshot, TimelineEvent


class TimelineService:
    def build_events(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        alerts: list[AlertItem],
    ) -> list[TimelineEvent]:
        events = [self._from_alert(snapshot, alert) for alert in alerts]
        events.extend(self._from_checklist(snapshot, diagnosis))
        deduped = {event.id: event for event in events}
        return sorted(deduped.values(), key=lambda item: (-self._severity_rank(item.severity), item.due_date))

    def _from_alert(self, snapshot: StockSnapshot, alert: AlertItem) -> TimelineEvent:
        due_days = {
            "事件": snapshot.risk.unlock_days or 7,
            "资金": 1,
            "价位": 1,
            "过热": 3,
            "机会": 2,
            "观察": 5,
        }.get(alert.category, 3)
        return TimelineEvent(
            id=f"alert-{alert.id}",
            symbol=alert.symbol,
            name=alert.name,
            industry=alert.industry,
            event_date=alert.as_of,
            due_date=self._date_after(alert.as_of, due_days),
            severity=alert.severity,
            category=alert.category,
            title=alert.title,
            detail=alert.message,
            trigger=alert.evidence,
            status="open" if alert.severity == "high" else "watching",
        )

    def _from_checklist(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse) -> list[TimelineEvent]:
        events: list[TimelineEvent] = []
        for item in diagnosis.checklist:
            if item.id == "observe-levels":
                continue
            severity = "high" if item.priority == "high" else "medium"
            due_days = 1 if item.priority == "high" else 3
            events.append(
                TimelineEvent(
                    id=f"checklist-{snapshot.symbol}-{item.id}",
                    symbol=snapshot.symbol,
                    name=snapshot.name,
                    industry=snapshot.industry,
                    event_date=snapshot.as_of,
                    due_date=self._date_after(snapshot.as_of, due_days),
                    severity=severity,
                    category="跟踪",
                    title=item.title,
                    detail=item.detail,
                    trigger=f"综合评分 {diagnosis.score.total}",
                    status="watching",
                )
            )
        return events

    def _date_after(self, value: str, days: int) -> str:
        try:
            base_date = date.fromisoformat(value)
        except ValueError:
            return value
        return (base_date + timedelta(days=days)).isoformat()

    def _severity_rank(self, severity: str) -> int:
        return {"high": 3, "medium": 2, "low": 1}[severity]
