from typing import Protocol

from app.schemas.diagnosis import MarketOverview, StockSnapshot, StockSummary


class MarketDataProvider(Protocol):
    def list_stocks(self) -> list[StockSummary]:
        ...

    def get_market_overview(self) -> MarketOverview:
        ...

    def get_data_sources(self) -> list[dict[str, str]]:
        ...

    def get_watchlist(self) -> list[StockSummary]:
        ...

    def add_to_watchlist(self, symbol: str) -> bool:
        ...

    def remove_from_watchlist(self, symbol: str) -> None:
        ...

    def replace_watchlist(self, symbols: list[str]) -> list[StockSummary]:
        ...

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        ...

    def warm_cache(self, scope: str = "all") -> int:
        ...
