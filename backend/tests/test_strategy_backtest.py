from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.strategy_backtest import StrategyBacktestService


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
    assert report.max_drawdown_pct <= 0
    assert report.trades[0].holding_days == 5
    assert report.trades[0].rule_tags


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
    assert all(period.trade_count >= 0 for period in comparison.periods)
