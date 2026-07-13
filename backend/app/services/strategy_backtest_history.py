from datetime import datetime, timezone

from app.schemas.diagnosis import (
    StrategyBacktestHistoryComparison,
    StrategyBacktestHistoryItem,
    StrategyBacktestReport,
)
from app.services.storage import StateStore


class StrategyBacktestHistoryService:
    MAX_RECORDS = 100

    def record(
        self,
        report: StrategyBacktestReport,
        preset: str,
        horizon: str,
        holding_days: int,
        limit: int,
        fee_bps: float,
        slippage_bps: float,
        state_store: StateStore,
        take_profit_pct: float = 0,
        stop_loss_pct: float = 0,
        exit_on_ma20_break: bool = False,
        exit_volume_ratio: float = 0,
        now: datetime | None = None,
    ) -> StrategyBacktestHistoryItem:
        created_at = (now or datetime.now(timezone.utc)).isoformat()
        item = StrategyBacktestHistoryItem(
            id=self._record_id(preset, horizon, holding_days, created_at),
            created_at=created_at,
            preset=preset,
            horizon=horizon,
            holding_days=holding_days,
            limit=limit,
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
            take_profit_pct=take_profit_pct,
            stop_loss_pct=stop_loss_pct,
            exit_on_ma20_break=exit_on_ma20_break,
            exit_volume_ratio=exit_volume_ratio,
            price_source=report.price_source,
            sample_confidence_score=report.sample_confidence_score,
            sample_confidence_label=report.sample_confidence_label,
            stability_score=report.stability_score,
            stability_label=report.stability_label,
            trade_count=report.trade_count,
            win_rate=report.win_rate,
            average_return_pct=report.average_return_pct,
            max_drawdown_pct=report.max_drawdown_pct,
            return_drawdown_ratio=report.return_drawdown_ratio,
        )
        records = [item.model_dump()]
        records.extend(record for record in state_store.load_strategy_backtests() if record.get("id") != item.id)
        state_store.save_strategy_backtests(records[: self.MAX_RECORDS])
        return item

    def compare(
        self,
        preset: str,
        horizon: str,
        state_store: StateStore,
        limit: int = 8,
    ) -> StrategyBacktestHistoryComparison:
        items = [
            item
            for item in self._items(state_store)
            if item.preset == preset and item.horizon == horizon
        ][: max(1, min(limit, 50))]
        latest = items[0] if items else None
        previous = items[1] if len(items) > 1 else None
        average_return_delta = self._float_delta(latest.average_return_pct, previous.average_return_pct) if latest and previous else 0
        max_drawdown_delta = self._float_delta(latest.max_drawdown_pct, previous.max_drawdown_pct) if latest and previous else 0
        stability_score_delta = latest.stability_score - previous.stability_score if latest and previous else 0
        sample_confidence_delta = (
            latest.sample_confidence_score - previous.sample_confidence_score if latest and previous else 0
        )
        return StrategyBacktestHistoryComparison(
            preset=preset,
            horizon=horizon,
            items=items,
            latest=latest,
            previous=previous,
            average_return_delta=average_return_delta,
            max_drawdown_delta=max_drawdown_delta,
            stability_score_delta=stability_score_delta,
            sample_confidence_delta=sample_confidence_delta,
            summary=self._summary(preset, items, average_return_delta, stability_score_delta),
        )

    def _items(self, state_store: StateStore) -> list[StrategyBacktestHistoryItem]:
        items: list[StrategyBacktestHistoryItem] = []
        for record in state_store.load_strategy_backtests():
            if not isinstance(record, dict):
                continue
            try:
                items.append(StrategyBacktestHistoryItem.model_validate(record))
            except ValueError:
                continue
        return sorted(items, key=lambda item: item.created_at, reverse=True)

    def _summary(
        self,
        preset: str,
        items: list[StrategyBacktestHistoryItem],
        average_return_delta: float,
        stability_score_delta: int,
    ) -> str:
        if not items:
            return f"{preset} 暂无回测历史，当前结果会作为后续对比基线。"
        if len(items) == 1:
            return f"{preset} 已记录 1 次回测，下一次运行后可对比变化。"
        direction = "提升" if average_return_delta >= 0 else "下降"
        stability_direction = "提升" if stability_score_delta >= 0 else "下降"
        return (
            f"{preset} 最近 {len(items)} 次回测可比，"
            f"平均收益较上次{direction} {abs(average_return_delta):.2f}%，"
            f"稳定评分{stability_direction} {abs(stability_score_delta)} 分。"
        )

    def _record_id(self, preset: str, horizon: str, holding_days: int, created_at: str) -> str:
        safe_created_at = created_at.replace(":", "").replace(".", "").replace("+", "z")
        return f"bt-{preset}-{horizon}-{holding_days}-{safe_created_at}"

    def _float_delta(self, latest: float, previous: float) -> float:
        return round(latest - previous, 2)
