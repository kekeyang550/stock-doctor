from app.services.market_data import MockMarketDataProvider
from app.services.momentum_signals import MomentumSignalService


def test_momentum_signals_rank_short_term_activity():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]

    signals = MomentumSignalService().build_signals(snapshots=snapshots)

    assert signals
    assert signals[0].signal_score >= signals[-1].signal_score
    assert any(signal.symbol == "002594" and signal.signal_level in {"limit-watch", "surging"} for signal in signals)
    assert all(signal.reason for signal in signals)
