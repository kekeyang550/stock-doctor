from datetime import datetime, timezone

from app.schemas.diagnosis import (
    AlertItem,
    DataQualityReport,
    DiagnosisChangeReport,
    DiagnosisResponse,
    DiagnosisThesis,
    ReviewActionItem,
    ReviewActionPlan,
)


class ReviewActionService:
    def build_plan(
        self,
        diagnosis: DiagnosisResponse,
        thesis: DiagnosisThesis,
        quality: DataQualityReport,
        change: DiagnosisChangeReport,
        alerts: list[AlertItem],
    ) -> ReviewActionPlan:
        items: list[ReviewActionItem] = []

        for checklist in diagnosis.checklist:
            items.append(
                self._item(
                    title=checklist.title,
                    priority=checklist.priority,
                    category="诊断清单",
                    detail=checklist.detail,
                    source="diagnosis",
                    raw_id=checklist.id,
                )
            )

        for index, next_check in enumerate(thesis.next_checks, start=1):
            items.append(
                self._item(
                    title=f"验证论证假设 {index}",
                    priority="medium",
                    category="论证验证",
                    detail=next_check,
                    source="thesis",
                    raw_id=f"thesis-{index}",
                )
            )

        for check in quality.checks:
            if check.status == "pass":
                continue
            items.append(
                self._item(
                    title=f"复核{check.label}",
                    priority="high" if check.status == "fail" else "medium",
                    category="数据质量",
                    detail=f"{check.detail} {check.impact}",
                    source="data_quality",
                    raw_id=f"quality-{check.key}",
                )
            )

        items.extend(self._change_actions(change))

        for alert in alerts:
            if alert.severity == "low":
                continue
            items.append(
                self._item(
                    title=alert.title,
                    priority=alert.severity,
                    category=f"风险预警 · {alert.category}",
                    detail=f"{alert.message} 依据：{alert.evidence}。",
                    source="alerts",
                    raw_id=alert.id,
                )
            )

        deduped = self._dedupe(items)
        priority_rank = {"high": 0, "medium": 1, "low": 2}
        deduped.sort(key=lambda item: (priority_rank[item.priority], item.category, item.title))

        return ReviewActionPlan(
            symbol=diagnosis.symbol,
            name=diagnosis.name,
            horizon=diagnosis.horizon,
            generated_at=datetime.now(timezone.utc).isoformat(),
            high_count=len([item for item in deduped if item.priority == "high"]),
            medium_count=len([item for item in deduped if item.priority == "medium"]),
            low_count=len([item for item in deduped if item.priority == "low"]),
            items=deduped,
        )

    def _change_actions(self, change: DiagnosisChangeReport) -> list[ReviewActionItem]:
        if change.status == "weakened":
            return [
                self._item(
                    title="诊断转弱复核",
                    priority="high",
                    category="诊断变化",
                    detail=f"{change.summary} 优先复核评分下降项和风险分变化。",
                    source="diagnosis_change",
                    raw_id="change-weakened",
                )
            ]
        if change.rating_changed:
            return [
                self._item(
                    title="评级变化复核",
                    priority="medium",
                    category="诊断变化",
                    detail=f"评级由“{change.previous_rating}”变为“{change.current_rating}”，复核变化是否由价格、资金或风险项驱动。",
                    source="diagnosis_change",
                    raw_id="change-rating",
                )
            ]
        if change.status == "baseline":
            return [
                self._item(
                    title="保存复盘基线",
                    priority="low",
                    category="诊断变化",
                    detail="当前为首份诊断基线，保存报告后后续可自动识别边际变化。",
                    source="diagnosis_change",
                    raw_id="change-baseline",
                )
            ]
        return []

    def _item(
        self,
        title: str,
        priority: str,
        category: str,
        detail: str,
        source: str,
        raw_id: str,
    ) -> ReviewActionItem:
        safe_id = "".join(char.lower() if char.isalnum() else "-" for char in raw_id).strip("-")
        return ReviewActionItem(
            id=f"{source}-{safe_id}",
            title=title,
            priority=priority,
            category=category,
            detail=detail,
            source=source,
        )

    def _dedupe(self, items: list[ReviewActionItem]) -> list[ReviewActionItem]:
        seen: set[tuple[str, str]] = set()
        deduped: list[ReviewActionItem] = []
        for item in items:
            key = (item.title, item.detail)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)
        return deduped
