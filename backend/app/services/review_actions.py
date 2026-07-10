from datetime import datetime, timezone

from app.schemas.diagnosis import (
    AlertItem,
    DataQualityReport,
    DiagnosisChangeReport,
    DiagnosisResponse,
    DiagnosisThesis,
    ReviewActionItem,
    ReviewActionOverview,
    ReviewActionPlan,
    ReviewActionStockSummary,
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
            pending_count=len([item for item in deduped if item.status == "pending"]),
            watching_count=len([item for item in deduped if item.status == "watching"]),
            done_count=len([item for item in deduped if item.status == "done"]),
            items=deduped,
        )

    def build_overview(self, scope: str, horizon: str, plans: list[ReviewActionPlan]) -> ReviewActionOverview:
        summaries = [self._summary(plan) for plan in plans if plan.items]
        summaries.sort(
            key=lambda item: (
                -item.high_count,
                -item.medium_count,
                -item.low_count,
                item.symbol,
            )
        )
        return ReviewActionOverview(
            scope=scope,
            horizon=horizon,
            stock_count=len(plans),
            high_count=sum(plan.high_count for plan in plans),
            medium_count=sum(plan.medium_count for plan in plans),
            low_count=sum(plan.low_count for plan in plans),
            pending_count=sum(plan.pending_count for plan in plans),
            watching_count=sum(plan.watching_count for plan in plans),
            done_count=sum(plan.done_count for plan in plans),
            summaries=summaries,
        )

    def apply_statuses(self, plan: ReviewActionPlan, statuses: list[dict]) -> ReviewActionPlan:
        status_by_key = {
            str(record.get("key")): str(record.get("status"))
            for record in statuses
            if record.get("status") in {"pending", "watching", "done"}
        }
        for item in plan.items:
            status_value = status_by_key.get(self.status_key(plan.symbol, plan.horizon, item.id))
            if status_value is not None:
                item.status = status_value
        plan.pending_count = len([item for item in plan.items if item.status == "pending"])
        plan.watching_count = len([item for item in plan.items if item.status == "watching"])
        plan.done_count = len([item for item in plan.items if item.status == "done"])
        return plan

    def status_key(self, symbol: str, horizon: str, action_id: str) -> str:
        return f"{symbol.strip().upper()}:{horizon}:{action_id}"

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

    def _summary(self, plan: ReviewActionPlan) -> ReviewActionStockSummary:
        top = plan.items[0]
        return ReviewActionStockSummary(
            symbol=plan.symbol,
            name=plan.name,
            industry="",
            item_count=len(plan.items),
            high_count=plan.high_count,
            medium_count=plan.medium_count,
            low_count=plan.low_count,
            top_priority=top.priority,
            top_action=top.title,
            top_detail=top.detail,
        )
