from importlib.util import find_spec

from app.config import settings
from app.schemas.diagnosis import HistoricalPriceBar, MarketOverview, StockSnapshot, StockSummary
from app.services.market_data import MockMarketDataProvider
from app.services.storage import StateStore


class TushareMarketDataProvider:
    """Safe first-stage Tushare adapter.

    Tushare will be used for financial/basic-info enrichment later. Until those
    fields are normalized, this provider keeps the app usable by delegating
    market data to the deterministic fallback provider.
    """

    def __init__(self, ts_module: object | None = None, state_store: StateStore | None = None) -> None:
        self._ts_module = ts_module
        self._fallback = MockMarketDataProvider(state_store=state_store)

    def list_stocks(self) -> list[StockSummary]:
        return self._fallback.list_stocks()

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        status = "planned" if self._is_ready() else "fallback"
        return [
            {
                "name": "Tushare Pro",
                "status": status,
                "role": self._source_role(),
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "Tushare 未完成字段归一化前的稳定回退"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        return self._fallback.get_watchlist()

    def add_to_watchlist(self, symbol: str) -> bool:
        return self._fallback.add_to_watchlist(symbol)

    def remove_from_watchlist(self, symbol: str) -> None:
        self._fallback.remove_from_watchlist(symbol)

    def replace_watchlist(self, symbols: list[str]) -> list[StockSummary]:
        return self._fallback.replace_watchlist(symbols)

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        return self._fallback.get_snapshot(symbol)

    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        return self._fallback.get_price_history(symbol, days=days)

    def warm_cache(self, scope: str = "all") -> int:
        return self._fallback.warm_cache(scope)

    def get_cache_status(self) -> dict:
        return self._fallback.get_cache_status()

    def _is_ready(self) -> bool:
        return self._package_available() and bool(settings.tushare_token.strip())

    def _package_available(self) -> bool:
        return self._ts_module is not None or find_spec("tushare") is not None

    def _source_role(self) -> str:
        package_available = self._package_available()
        token_configured = bool(settings.tushare_token.strip())
        if package_available and token_configured:
            return "包和 Token 已就绪；财务、基础资料和复权日线字段待归一化接入。"
        if token_configured:
            return "Token 已配置，但当前环境未安装 tushare 包；继续使用 Mock 回退。"
        if package_available:
            return "tushare 包已安装，等待 STOCK_DOCTOR_TUSHARE_TOKEN；继续使用 Mock 回退。"
        return "tushare 包和 Token 均未配置；继续使用 Mock 回退。"
