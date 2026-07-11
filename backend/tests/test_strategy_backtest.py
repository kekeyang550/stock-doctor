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
    assert report.trades[0].entry_price == 125
    assert report.trades[0].exit_price == 130
    assert report.trades[0].return_pct == 4


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
