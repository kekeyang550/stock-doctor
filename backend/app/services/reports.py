from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.schemas.diagnosis import ChecklistItem, DataQualityReport, DiagnosisResponse, ReportRecord
from app.services.storage import StateStore, create_state_store


class ReportService:
    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()

    def list_reports(self, limit: int = 20) -> list[ReportRecord]:
        reports = [ReportRecord.model_validate(self._migrate_report(item)) for item in self._state_store.load_reports()]
        return sorted(reports, key=lambda item: item.generated_at, reverse=True)[:limit]

    def save_report(self, diagnosis: DiagnosisResponse, data_quality: DataQualityReport | None = None) -> ReportRecord:
        record = ReportRecord(
            id=uuid4().hex,
            generated_at=datetime.now(timezone.utc).isoformat(),
            diagnosis=diagnosis,
            data_quality=data_quality,
        )
        reports = self._state_store.load_reports()
        reports.insert(0, record.model_dump(mode="json"))
        self._state_store.save_reports(reports[:100])
        return record

    def delete_report(self, report_id: str) -> bool:
        reports = self._state_store.load_reports()
        next_reports = [item for item in reports if item.get("id") != report_id]
        self._state_store.save_reports(next_reports)
        return len(next_reports) != len(reports)

    def _migrate_report(self, report: dict[str, Any]) -> dict[str, Any]:
        diagnosis = report.get("diagnosis")
        if not isinstance(diagnosis, dict) or "checklist" in diagnosis:
            return report

        key_levels = diagnosis.get("key_levels")
        if not isinstance(key_levels, dict):
            key_levels = {}

        diagnosis["checklist"] = [
            ChecklistItem(
                id="observe-levels",
                title="观察关键价位",
                detail=(
                    f"支撑 {self._level(key_levels, 'support')}，风控 {self._level(key_levels, 'risk_line')}，"
                    f"压力 {self._level(key_levels, 'pressure')}。"
                ),
                status="watch",
                priority="medium",
            ).model_dump(mode="json")
        ]
        return report

    def _level(self, key_levels: dict[str, Any], name: str) -> str:
        value = key_levels.get(name)
        return f"{value:.2f}" if isinstance(value, int | float) else "--"
