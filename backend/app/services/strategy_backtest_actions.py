from datetime import datetime, timezone

from app.schemas.diagnosis import (
    StrategyBacktestAction,
    StrategyBacktestActionPlan,
    StrategyBacktestComparison,
    StrategyBacktestHistoryComparison,
    StrategyBacktestPresetComparison,
    StrategyBacktestReport,
)


class StrategyBacktestActionService:
    def build_plan(
        self,
        report: StrategyBacktestReport,
        period_comparison: StrategyBacktestComparison,
        preset_comparison: StrategyBacktestPresetComparison,
        history: StrategyBacktestHistoryComparison,
    ) -> StrategyBacktestActionPlan:
        actions: list[StrategyBacktestAction] = []
        actions.extend(self._quality_actions(report))
        actions.extend(self._performance_actions(report))
        actions.extend(self._comparison_actions(report, period_comparison, preset_comparison))
        actions.extend(self._history_actions(history))

        deduped = self._dedupe(actions)
        priority_rank = {"high": 0, "medium": 1, "low": 2}
        deduped.sort(key=lambda item: (priority_rank[item.priority], item.category, item.title))
        return StrategyBacktestActionPlan(
            preset=report.preset,
            horizon=report.horizon,
            generated_at=datetime.now(timezone.utc).isoformat(),
            action_count=len(deduped),
            high_count=len([item for item in deduped if item.priority == "high"]),
            medium_count=len([item for item in deduped if item.priority == "medium"]),
            low_count=len([item for item in deduped if item.priority == "low"]),
            pending_count=len([item for item in deduped if item.status == "pending"]),
            watching_count=len([item for item in deduped if item.status == "watching"]),
            done_count=len([item for item in deduped if item.status == "done"]),
            actions=deduped,
        )

    def apply_statuses(
        self,
        plan: StrategyBacktestActionPlan,
        statuses: list[dict],
        holding_days: int,
        limit: int,
        fee_bps: float,
        slippage_bps: float,
        take_profit_pct: float,
        stop_loss_pct: float,
        exit_on_ma20_break: bool,
        exit_volume_ratio: float,
    ) -> StrategyBacktestActionPlan:
        status_by_key = {
            str(record.get("key")): str(record.get("status"))
            for record in statuses
            if record.get("status") in {"pending", "watching", "done"}
        }
        for action in plan.actions:
            status_value = status_by_key.get(
                self.status_key(
                    preset=plan.preset,
                    horizon=plan.horizon,
                    holding_days=holding_days,
                    limit=limit,
                    fee_bps=fee_bps,
                    slippage_bps=slippage_bps,
                    take_profit_pct=take_profit_pct,
                    stop_loss_pct=stop_loss_pct,
                    exit_on_ma20_break=exit_on_ma20_break,
                    exit_volume_ratio=exit_volume_ratio,
                    action_id=action.id,
                )
            )
            if status_value is not None:
                action.status = status_value
        plan.pending_count = len([item for item in plan.actions if item.status == "pending"])
        plan.watching_count = len([item for item in plan.actions if item.status == "watching"])
        plan.done_count = len([item for item in plan.actions if item.status == "done"])
        return plan

    def status_key(
        self,
        preset: str,
        horizon: str,
        holding_days: int,
        limit: int,
        fee_bps: float,
        slippage_bps: float,
        take_profit_pct: float,
        stop_loss_pct: float,
        exit_on_ma20_break: bool,
        exit_volume_ratio: float,
        action_id: str,
    ) -> str:
        return (
            f"BACKTEST:{preset}:{horizon}:hold={holding_days}:limit={limit}:"
            f"fee={fee_bps:g}:slippage={slippage_bps:g}:take={take_profit_pct:g}:"
            f"stop={stop_loss_pct:g}:ma20={int(exit_on_ma20_break)}:vol={exit_volume_ratio:g}:{action_id}"
        )

    def _quality_actions(self, report: StrategyBacktestReport) -> list[StrategyBacktestAction]:
        actions: list[StrategyBacktestAction] = []
        if report.sample_confidence_score < 60:
            actions.append(
                self._action(
                    raw_id="low-confidence",
                    priority="high",
                    category="样本可信度",
                    title="先补足回测样本可信度",
                    detail="当前回测样本可信度偏低，策略结论不宜直接用于仓位决策。",
                    trigger="；".join(report.sample_confidence_notes[:2]) or "样本数量或价格来源不足。",
                    metric=f"可信度 {report.sample_confidence_score}",
                )
            )
        elif report.sample_confidence_score < 80:
            actions.append(
                self._action(
                    raw_id="medium-confidence",
                    priority="medium",
                    category="样本可信度",
                    title="复核样本口径",
                    detail="样本可信度处于中档，继续扩大历史行情覆盖后再比较策略。",
                    trigger="；".join(report.sample_confidence_notes[:2]) or "样本可信度仍有提升空间。",
                    metric=f"可信度 {report.sample_confidence_score}",
                )
            )
        return actions

    def _performance_actions(self, report: StrategyBacktestReport) -> list[StrategyBacktestAction]:
        actions: list[StrategyBacktestAction] = []
        if report.trade_count < 3:
            actions.append(
                self._action(
                    raw_id="thin-trades",
                    priority="high",
                    category="样本数量",
                    title="扩大策略样本数量",
                    detail="交易样本过少，当前胜率和平均收益容易被单笔交易放大。",
                    trigger=f"当前仅 {report.trade_count} 笔交易。",
                    metric=f"交易 {report.trade_count}",
                )
            )
        if report.return_drawdown_ratio < 0.5:
            actions.append(
                self._action(
                    raw_id="weak-return-drawdown",
                    priority="high",
                    category="收益回撤",
                    title="复核收益回撤比",
                    detail="收益相对回撤不够充分，优先检查止损和持有周期。",
                    trigger=f"收益回撤比 {report.return_drawdown_ratio:.2f}。",
                    metric=f"收益回撤比 {report.return_drawdown_ratio:.2f}",
                )
            )
        if report.stability_score < 65:
            actions.append(
                self._action(
                    raw_id="stability-watch",
                    priority="medium",
                    category="稳定性",
                    title="检查回测路径稳定性",
                    detail="策略路径稳定性一般，建议观察连续亏损和权益曲线回撤。",
                    trigger="；".join(report.stability_notes[:2]) or "稳定评分处于观察区间。",
                    metric=f"稳定 {report.stability_score}",
                )
            )
        if report.average_return_pct > 0 and report.return_drawdown_ratio >= 1:
            actions.append(
                self._action(
                    raw_id="positive-followup",
                    priority="low",
                    category="策略确认",
                    title="沉淀正向策略样本",
                    detail="当前收益和回撤结构相对健康，可以保存报告作为后续对比基线。",
                    trigger=f"平均收益 {report.average_return_pct:.2f}%，收益回撤比 {report.return_drawdown_ratio:.2f}。",
                    metric=f"平均收益 {report.average_return_pct:.2f}%",
                )
            )
        return actions

    def _comparison_actions(
        self,
        report: StrategyBacktestReport,
        period_comparison: StrategyBacktestComparison,
        preset_comparison: StrategyBacktestPresetComparison,
    ) -> list[StrategyBacktestAction]:
        actions: list[StrategyBacktestAction] = []
        if period_comparison.recommended_holding_days and period_comparison.recommended_holding_days != report.holding_days:
            actions.append(
                self._action(
                    raw_id="period-mismatch",
                    priority="medium",
                    category="周期选择",
                    title="切换推荐持有周期复测",
                    detail="周期横向对比给出不同持有天数，建议切换后重新查看交易样本。",
                    trigger=period_comparison.recommendation_reason or period_comparison.summary,
                    metric=f"当前 {report.holding_days} 日 / 推荐 {period_comparison.recommended_holding_days} 日",
                )
            )
        if preset_comparison.recommended_preset and preset_comparison.recommended_preset != report.preset:
            actions.append(
                self._action(
                    raw_id="preset-mismatch",
                    priority="medium",
                    category="策略选择",
                    title="对比推荐策略预设",
                    detail="策略横向对比推荐了不同预设，需确认是否切换当前股票池逻辑。",
                    trigger=preset_comparison.recommendation_reason or preset_comparison.summary,
                    metric=f"当前 {report.preset} / 推荐 {preset_comparison.recommended_preset}",
                )
            )
        return actions

    def _history_actions(self, history: StrategyBacktestHistoryComparison) -> list[StrategyBacktestAction]:
        actions: list[StrategyBacktestAction] = []
        if history.latest is None or history.previous is None:
            actions.append(
                self._action(
                    raw_id="history-baseline",
                    priority="low",
                    category="历史对比",
                    title="保存回测历史基线",
                    detail="当前历史记录不足，连续记录后才能判断策略稳定性是否改善。",
                    trigger=history.summary,
                    metric=f"历史 {len(history.items)} 条",
                )
            )
        elif history.stability_score_delta < -8 or history.sample_confidence_delta < -8:
            actions.append(
                self._action(
                    raw_id="history-weakened",
                    priority="medium",
                    category="历史对比",
                    title="复核回测质量走弱",
                    detail="最近回测质量较上一轮下降，需确认数据源、样本数量或参数变化。",
                    trigger=history.summary,
                    metric=f"稳定 {history.stability_score_delta:+d} / 可信 {history.sample_confidence_delta:+d}",
                )
            )
        return actions

    def _action(
        self,
        raw_id: str,
        priority: str,
        category: str,
        title: str,
        detail: str,
        trigger: str,
        metric: str,
    ) -> StrategyBacktestAction:
        return StrategyBacktestAction(
            id=f"backtest-{raw_id}",
            priority=priority,
            category=category,
            title=title,
            detail=detail,
            trigger=trigger,
            metric=metric,
        )

    def _dedupe(self, actions: list[StrategyBacktestAction]) -> list[StrategyBacktestAction]:
        seen: set[str] = set()
        deduped: list[StrategyBacktestAction] = []
        for action in actions:
            if action.id in seen:
                continue
            seen.add(action.id)
            deduped.append(action)
        return deduped
