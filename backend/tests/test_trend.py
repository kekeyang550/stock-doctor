from app.services.market_data import MockMarketDataProvider
from app.services.trend import TrendService


def test_trend_series_contains_ordered_points_and_last_close():
    provider = MockMarketDataProvider()
    snapshot = provider.get_snapshot("600519")
    assert snapshot is not None

    series = TrendService().build_series(snapshot, days=30)

    assert len(series.points) == 30
    assert series.points[-1].close == snapshot.last_price
    assert series.points[0].date < series.points[-1].date
    assert series.high >= series.low
