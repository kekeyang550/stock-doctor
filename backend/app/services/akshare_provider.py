from app.schemas.diagnosis import MarketOverview, StockSnapshot, StockSummary
from app.services.market_data import MockMarketDataProvider


class AkshareMarketDataProvider:
    """Optional adapter boundary for AKShare-backed A-share data.

    The MVP keeps mock data as the fallback because public data endpoints can change
    and should be normalized behind this adapter before reaching the diagnosis engine.
    """

    def __init__(self) -> None:
        try:
            import akshare as ak  # type: ignore
        except ImportError:
            self._ak = None
        else:
            self._ak = ak
        self._fallback = MockMarketDataProvider()

    def list_stocks(self) -> list[StockSummary]:
        if self._ak is None:
            return self._fallback.list_stocks()
        return self._fallback.list_stocks()

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        status = "online" if self._ak is not None else "missing-package"
        return [
            {"name": "AKShare", "status": status, "role": "行情、指数、板块、资金流"},
            {"name": "Mock A股样例库", "status": "fallback", "role": "适配器未完成时的稳定回退"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        return self._fallback.get_watchlist()

    def add_to_watchlist(self, symbol: str) -> bool:
        return self._fallback.add_to_watchlist(symbol)

    def remove_from_watchlist(self, symbol: str) -> None:
        self._fallback.remove_from_watchlist(symbol)

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        return self._fallback.get_snapshot(symbol)
