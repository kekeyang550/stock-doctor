import pytest

from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.strategy_backtest import StrategyBacktestService
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
    assert report.return_median_pct >= report.worst_return_pct
    assert report.return_median_pct <= report.best_return_pct
    assert report.return_p25_pct <= report.return_p75_pct
    assert report.max_drawdown_pct <= 0
    assert report.return_drawdown_ratio == round(report.average_return_pct / abs(report.max_drawdown_pct), 2)
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
