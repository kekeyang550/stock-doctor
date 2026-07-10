from datetime import datetime, timezone

from app.schemas.diagnosis import HotspotCandidate, HotspotReviewAction, HotspotReviewPlan


class HotspotReviewActionService:
    def build_plan(
        self,
        candidates: list[HotspotCandidate],
        horizon: str,
        mode: str,
        limit: int = 8,
    ) -> HotspotReviewPlan:
        actions = [self._action(candidate) for candidate in candidates[:limit]]
        priority_rank = {"high": 0, "medium": 1, "low": 2}
        actions.sort(key=lambda item: (priority_rank[item.priority], item.symbol))
        return HotspotReviewPlan(
            horizon=horizon,
            mode=mode,
            generated_at=datetime.now(timezone.utc).isoformat(),
            candidate_count=len(candidates),
            high_count=len([item for item in actions if item.priority == "high"]),
            medium_count=len([item for item in actions if item.priority == "medium"]),
            low_count=len([item for item in actions if item.priority == "low"]),
            pending_count=len([item for item in actions if item.status == "pending"]),
            watching_count=len([item for item in actions if item.status == "watching"]),
            done_count=len([item for item in actions if item.status == "done"]),
            actions=actions,
        )

    def apply_statuses(self, plan: HotspotReviewPlan, statuses: list[dict]) -> HotspotReviewPlan:
        status_by_key = {
            str(record.get("key")): str(record.get("status"))
            for record in statuses
            if record.get("status") in {"pending", "watching", "done"}
        }
        for item in plan.actions:
            status_value = status_by_key.get(self.status_key(plan.horizon, plan.mode, item.id))
            if status_value is not None:
                item.status = status_value
        plan.pending_count = len([item for item in plan.actions if item.status == "pending"])
        plan.watching_count = len([item for item in plan.actions if item.status == "watching"])
        plan.done_count = len([item for item in plan.actions if item.status == "done"])
        return plan

    def status_key(self, horizon: str, mode: str, action_id: str) -> str:
        return f"HOTSPOT:{horizon}:{mode}:{action_id}"

    def _action(self, candidate: HotspotCandidate) -> HotspotReviewAction:
        priority = self._priority(candidate)
        return HotspotReviewAction(
            id=f"hotspot-{candidate.symbol}-{candidate.concept}",
            symbol=candidate.symbol,
            name=candidate.name,
            concept=candidate.concept,
            priority=priority,
            title=self._title(candidate, priority),
            detail=candidate.next_action,
            trigger=self._trigger(candidate),
            check_window=self._check_window(candidate, priority),
        )

    def _priority(self, candidate: HotspotCandidate) -> str:
        if "风险警示" in candidate.next_action or "解禁" in candidate.risk_note:
            return "high"
        if candidate.heat_score >= 75 or candidate.signal_score >= 70 or candidate.main_inflow_million >= 300:
            return "high"
        if candidate.heat_score >= 62 or candidate.diagnosis_score >= 76:
            return "medium"
        return "low"

    def _title(self, candidate: HotspotCandidate, priority: str) -> str:
        if priority == "high":
            return f"盘中复核 {candidate.name} 热点承接"
        if candidate.main_inflow_million > 200:
            return f"跟踪 {candidate.name} 资金预热"
        return f"观察 {candidate.name} 题材共振"

    def _trigger(self, candidate: HotspotCandidate) -> str:
        if "解禁" in candidate.risk_note:
            return "解禁窗口叠加热点，若放量滞涨需降低优先级。"
        if candidate.signal_score >= 70:
            return "异动分较高，确认量比和涨幅是否继续扩散。"
        if candidate.main_inflow_million >= 300:
            return "主力净流入居前，确认价格是否跟随资金突破。"
        return f"{candidate.concept} 热度进入候选池，等待资金、涨幅和诊断分继续共振。"

    def _check_window(self, candidate: HotspotCandidate, priority: str) -> str:
        if "解禁" in candidate.risk_note:
            return "今日盘中 + 解禁日前后"
        if priority == "high":
            return "今日盘中"
        if candidate.main_inflow_million > 200:
            return "1-2 个交易日"
        return "3 个交易日内"
