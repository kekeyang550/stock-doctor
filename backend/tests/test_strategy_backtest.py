import pytest

from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.strategy_backtest import StrategyBacktestService
from app.services.strategy_backtest_actions import StrategyBacktestActionService
from app.services.strategy_backtest_history import StrategyBacktestHistoryService
from app.services.storage import JsonStateStore
from app.schemas.diagnosis import HistoricalPriceBar


class FakeHistoricalProvider:
    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        return [
            HistoricalPriceBar(date=f"2026-06-{day:02d}", close=100 + day, volume=1000 + day)
            for day in range(1, 31)
        ][-days:]


class FailingHistoricalProvider:
    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        raise RuntimeError("provider timeout")


class FallingHistoricalProvider:
    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        prices = [130, 128, 126, 124, 121, 119, 118, 117, 116, 115]
        return [
            HistoricalPriceBar(date=f"2026-06-{day:02d}", close=price, volume=1000 + day)
            for day, price in enumerate(prices, start=21)
        ][-days:]


class FadingVolumeHistoricalProvider:
    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        prices = [120, 121, 122, 123, 124, 126, 127, 128, 129, 130]
        volumes = [1000, 1000, 1000, 1000, 1000, 300, 300, 300, 300, 300]
        return [
            HistoricalPriceBar(date=f"2026-06-{day:02d}", close=price, volume=volume)
            for day, price, volume in zip(range(21, 31), prices, volumes, strict=True)
        ][-days:]


def test_strategy_backtest_reports_returns_and_drawdown():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService().run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
    )

    assert report.preset == "breakout-volume"
    assert report.horizon == "swing"
    assert report.holding_days == 5
    assert report.sample_size == len(snapshots)
    assert report.match_count >= 1
    assert report.trade_count >= 1
    assert 0 <= report.win_rate <= 100
    assert report.best_return_pct >= report.worst_return_pct
    assert report.positive_trade_count + report.negative_trade_count + report.flat_trade_count == report.trade_count
    assert sum(report.exit_reason_counts.values()) == report.trade_count
    assert report.exit_reason_counts["holding-period"] >= 0
    assert report.return_median_pct >= report.worst_return_pct
    assert report.return_median_pct <= report.best_return_pct
    assert report.return_p25_pct <= report.return_p75_pct
    assert report.max_drawdown_pct <= 0
    assert report.return_drawdown_ratio == round(report.average_return_pct / abs(report.max_drawdown_pct), 2)
    assert report.return_volatility_pct >= 0
    assert isinstance(report.max_consecutive_loss_count, int)
    assert report.max_consecutive_loss_count >= 0
    assert report.best_path_gain_pct >= report.best_return_pct or report.best_return_pct <= 0
    assert report.worst_path_loss_pct <= report.worst_return_pct or report.worst_return_pct >= 0
    assert 0 <= report.stability_score <= 100
    assert report.stability_label in {"稳定", "需观察", "波动偏高"}
    assert report.stability_notes
    assert any("收益" in note or "亏损" in note or "波动" in note for note in report.stability_notes)
    assert 0 <= report.sample_confidence_score <= 100
    assert report.sample_confidence_label in {"高", "中", "低"}
    assert report.sample_confidence_notes
    assert any("样本" in note or "行情" in note or "fallback" in note for note in report.sample_confidence_notes)
    assert report.equity_curve
    assert report.equity_curve[0].step == 0
    assert report.equity_curve[0].label == "起点"
    assert report.equity_curve[0].equity_pct == 0
    assert report.equity_curve[0].drawdown_pct == 0
    assert report.equity_curve[-1].equity_pct == round(sum(trade.return_pct for trade in report.trades), 2)
    assert all(point.drawdown_pct <= 0 for point in report.equity_curve)
    assert any(point.symbol and point.name for point in report.equity_curve[1:])
    assert report.trades[0].holding_days == 5
    assert report.trades[0].rule_tags


def test_strategy_backtest_prefers_provider_price_history():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FakeHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
    )

    assert report.price_source == "historical-kline"
    assert report.fee_bps == 5
    assert report.slippage_bps == 10
    assert report.round_trip_cost_pct == 0.3
    assert report.history_bar_count == 30
    assert report.history_last_date == "2026-06-30"
    assert report.fallback_reason is None
    assert report.trades[0].entry_price == 125
    assert report.trades[0].exit_price == 130
    assert report.trades[0].gross_return_pct == 4
    assert report.trades[0].cost_pct == 0.3
    assert report.trades[0].return_pct == pytest.approx(3.7)
    assert report.trades[0].price_source == "historical-kline"
    assert report.trades[0].history_bar_count == 30
    assert report.trades[0].history_last_date == "2026-06-30"
    assert report.trades[0].fallback_reason is None


def test_strategy_backtest_accepts_custom_cost_assumptions():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FakeHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        fee_bps=8,
        slippage_bps=12,
    )

    assert report.fee_bps == 8
    assert report.slippage_bps == 12
    assert report.round_trip_cost_pct == 0.4
    assert report.trades[0].gross_return_pct == 4
    assert report.trades[0].cost_pct == 0.4
    assert report.trades[0].return_pct == pytest.approx(3.6)


def test_strategy_backtest_exits_early_on_take_profit():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FakeHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        take_profit_pct=2,
        stop_loss_pct=0,
    )

    assert report.take_profit_pct == 2
    assert report.stop_loss_pct == 0
    assert report.trades[0].exit_reason == "take-profit"
    assert report.trades[0].holding_days == 3
    assert report.trades[0].exit_price == 128


def test_strategy_backtest_exits_early_on_stop_loss():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FallingHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        take_profit_pct=0,
        stop_loss_pct=2,
    )

    assert report.take_profit_pct == 0
    assert report.stop_loss_pct == 2
    assert report.trades[0].exit_reason == "stop-loss"
    assert report.trades[0].holding_days == 2
    assert report.trades[0].exit_price == 118


def test_strategy_backtest_exits_early_on_ma20_break():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FallingHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        exit_on_ma20_break=True,
    )

    assert report.exit_on_ma20_break is True
    assert report.trades[0].exit_reason == "ma20-break"
    assert report.trades[0].holding_days == 1
    assert report.trades[0].exit_price == 119


def test_strategy_backtest_exits_early_on_volume_fade():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FadingVolumeHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        exit_volume_ratio=0.5,
    )

    assert report.exit_volume_ratio == 0.5
    assert report.trades[0].exit_reason == "volume-fade"
    assert report.trades[0].holding_days == 1
    assert report.trades[0].exit_price == 126


def test_strategy_backtest_exits_early_on_diagnosis_score_weakening():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FallingHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
        diagnosis_exit_score=65,
    )

    assert report.diagnosis_exit_score == 65
    assert report.trades[0].exit_reason == "score-weak"
    assert report.exit_reason_counts["score-weak"] >= 1
    assert report.trades[0].holding_days == 1
    assert report.trades[0].exit_price == 119


def test_strategy_backtest_reports_fallback_reason_when_history_provider_fails():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService(market_data_provider=FailingHistoricalProvider()).run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
    )

    assert report.price_source == "synthetic-trend"
    assert report.history_bar_count == 0
    assert report.history_last_date is None
    assert report.fallback_reason == "历史行情读取失败，已回退样例趋势"
    assert report.trades[0].price_source == "synthetic-trend"
    assert report.trades[0].history_bar_count == 0
    assert report.trades[0].history_last_date is None
    assert report.trades[0].fallback_reason == "历史行情读取失败，已回退样例趋势"
    assert report.trade_count >= 1


def test_strategy_backtest_compares_multiple_holding_periods():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    comparison = StrategyBacktestService().compare_periods(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        periods=[3, 5, 10, 20],
        limit=8,
    )

    assert comparison.preset == "breakout-volume"
    assert comparison.horizon == "swing"
    assert [period.holding_days for period in comparison.periods] == [3, 5, 10, 20]
    assert comparison.recommended_holding_days in {3, 5, 10, 20}
    assert comparison.sample_size == len(snapshots)
    assert comparison.match_count >= 1
    assert comparison.summary
    assert comparison.recommendation_reason
    assert "收益回撤比" in comparison.recommendation_reason
    assert all(period.trade_count >= 0 for period in comparison.periods)
    assert all(period.history_bar_count >= 0 for period in comparison.periods)
    assert all(hasattr(period, "return_drawdown_ratio") for period in comparison.periods)


def test_strategy_backtest_compares_multiple_presets():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    comparison = StrategyBacktestService().compare_presets(
        presets=["strong", "value", "capital-risk"],
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=6,
        fee_bps=8,
        slippage_bps=12,
    )

    assert comparison.horizon == "swing"
    assert comparison.holding_days == 5
    assert comparison.sample_size == len(snapshots)
    assert [item.preset for item in comparison.presets] == ["strong", "value", "capital-risk"]
    assert comparison.recommended_preset in {"strong", "value", "capital-risk"}
    assert comparison.summary
    assert comparison.recommendation_reason
    assert "收益回撤比" in comparison.recommendation_reason
    assert all(item.label for item in comparison.presets)
    assert all(item.trade_count >= 0 for item in comparison.presets)
    assert all(item.match_count >= 0 for item in comparison.presets)
    assert all(0 <= item.win_rate <= 100 for item in comparison.presets)
    assert all(item.holding_days == 5 for item in comparison.presets)
    assert all(hasattr(item, "return_drawdown_ratio") for item in comparison.presets)


def test_strategy_backtest_history_service_records_and_compares(tmp_path):
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    backtest_service = StrategyBacktestService()
    history_service = StrategyBacktestHistoryService()
    store = JsonStateStore(tmp_path / "state.json")

    first = backtest_service.run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
    )
    second = backtest_service.run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=10,
        limit=8,
    )

    history_service.record(first, "breakout-volume", "swing", 5, 8, 5, 10, store)
    history_service.record(second, "breakout-volume", "swing", 10, 8, 5, 10, store)
    comparison = history_service.compare("breakout-volume", "swing", store)

    assert len(comparison.items) == 2
    assert comparison.latest is not None
    assert comparison.previous is not None
    assert comparison.latest.holding_days == 10
    assert comparison.previous.holding_days == 5
    assert comparison.latest.stability_score >= 0
    assert comparison.latest.sample_confidence_score >= 0
    assert comparison.average_return_delta == round(
        comparison.latest.average_return_pct - comparison.previous.average_return_pct,
        2,
    )
    assert "最近" in comparison.summary


def test_strategy_backtest_actions_turn_metrics_into_followups(tmp_path):
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    backtest_service = StrategyBacktestService()
    report = backtest_service.run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=1,
    )
    period_comparison = backtest_service.compare_periods(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        periods=[3, 5, 10],
        limit=1,
    )
    preset_comparison = backtest_service.compare_presets(
        presets=["strong", "value", "capital-risk"],
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=1,
    )
    history = StrategyBacktestHistoryService().compare(
        preset="breakout-volume",
        horizon="swing",
        state_store=JsonStateStore(tmp_path / "state.json"),
    )

    plan = StrategyBacktestActionService().build_plan(
        report=report,
        period_comparison=period_comparison,
        preset_comparison=preset_comparison,
        history=history,
    )

    assert plan.actions
    assert plan.action_count == len(plan.actions)
    assert plan.high_count + plan.medium_count + plan.low_count == len(plan.actions)
    assert any(action.category in {"样本数量", "样本可信度", "历史对比"} for action in plan.actions)


def test_strategy_backtest_actions_include_score_weak_exit_followup(tmp_path):
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    backtest_service = StrategyBacktestService(market_data_provider=FallingHistoricalProvider())
    report = backtest_service.run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=1,
        diagnosis_exit_score=65,
    )
    period_comparison = backtest_service.compare_periods(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        periods=[3, 5, 10],
        limit=1,
        diagnosis_exit_score=65,
    )
    preset_comparison = backtest_service.compare_presets(
        presets=["strong", "value", "capital-risk"],
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=1,
        diagnosis_exit_score=65,
    )
    history = StrategyBacktestHistoryService().compare(
        preset="breakout-volume",
        horizon="swing",
        state_store=JsonStateStore(tmp_path / "state.json"),
    )

    plan = StrategyBacktestActionService().build_plan(
        report=report,
        period_comparison=period_comparison,
        preset_comparison=preset_comparison,
        history=history,
    )

    assert any(action.id == "backtest-score-weak-exit" for action in plan.actions)
    assert any(action.category == "诊断转弱" and "触发 1 笔" in action.metric for action in plan.actions)
