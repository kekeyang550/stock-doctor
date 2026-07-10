from datetime import date

from app.schemas.diagnosis import (
    CapitalSnapshot,
    FundamentalSnapshot,
    MarketOverview,
    RiskSnapshot,
    StockSnapshot,
    StockSummary,
    TechnicalSnapshot,
)
from app.services.market_data import MockMarketDataProvider
from app.services.storage import StateStore


class AkshareMarketDataProvider:
    """Optional adapter boundary for AKShare-backed A-share data.

    The MVP keeps mock data as the fallback because public data endpoints can change
    and should be normalized behind this adapter before reaching the diagnosis engine.
    """

    def __init__(self, ak_module=None, state_store: StateStore | None = None) -> None:
        if ak_module is not None:
            self._ak = ak_module
        else:
            try:
                import akshare as ak  # type: ignore
            except ImportError:
                self._ak = None
            else:
                self._ak = ak
        self._fallback = MockMarketDataProvider(state_store=state_store)
        self._state_store = self._fallback._state_store
        self._default_watchlist = self._fallback._default_watchlist
        self._watchlist_symbols = self._state_store.load_watchlist(self._default_watchlist)
        self._stock_cache: list[StockSummary] | None = None
        self._last_error: str | None = None

    def list_stocks(self) -> list[StockSummary]:
        if self._ak is None:
            return self._fallback.list_stocks()
        if self._stock_cache is not None:
            return self._stock_cache
        try:
            stocks = self._load_a_share_list()
        except Exception as exc:
            self._last_error = str(exc)
            return self._fallback.list_stocks()
        if not stocks:
            self._last_error = "AKShare returned an empty stock list"
            return self._fallback.list_stocks()
        self._last_error = None
        self._stock_cache = stocks
        return stocks

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        status = "online" if self._ak is not None and self._last_error is None else "missing-package" if self._ak is None else "fallback"
        message = "行情列表可由 AKShare 获取。" if status == "online" else self._last_error or "当前环境未安装 akshare。"
        return [
            {"name": "AKShare", "status": status, "role": f"行情、指数、板块、资金流；{message}"},
            {"name": "Mock A股样例库", "status": "fallback", "role": "适配器未完成时的稳定回退"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        summaries = {stock.symbol: stock for stock in self.list_stocks()}
        return [summaries[symbol] for symbol in self._watchlist_symbols if symbol in summaries]

    def add_to_watchlist(self, symbol: str) -> bool:
        normalized = symbol.strip().upper()
        if self.get_snapshot(normalized) is None:
            return False
        if normalized not in self._watchlist_symbols:
            self._watchlist_symbols.append(normalized)
            self._state_store.save_watchlist(self._watchlist_symbols)
        return True

    def remove_from_watchlist(self, symbol: str) -> None:
        normalized = symbol.strip().upper()
        self._watchlist_symbols = [item for item in self._watchlist_symbols if item != normalized]
        self._state_store.save_watchlist(self._watchlist_symbols)

    def replace_watchlist(self, symbols: list[str]) -> list[StockSummary]:
        next_symbols = []
        for symbol in symbols:
            normalized = symbol.strip().upper()
            if normalized not in next_symbols and self.get_snapshot(normalized) is not None:
                next_symbols.append(normalized)
        self._watchlist_symbols = next_symbols
        self._state_store.save_watchlist(self._watchlist_symbols)
        return self.get_watchlist()

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        fallback_snapshot = self._fallback.get_snapshot(symbol)
        if fallback_snapshot is not None:
            return fallback_snapshot
        summary = next((stock for stock in self.list_stocks() if stock.symbol == symbol.strip().upper()), None)
        if summary is None or summary.last_price <= 0:
            return None
        return self._summary_to_conservative_snapshot(summary)

    def _load_a_share_list(self) -> list[StockSummary]:
        rows = self._call_stock_rows("stock_zh_a_spot_em")
        if not rows:
            rows = self._call_stock_rows("stock_info_a_code_name")
        stocks = [stock for row in rows if (stock := self._row_to_summary(row)) is not None]
        stocks.sort(key=lambda item: item.symbol)
        return stocks

    def _call_stock_rows(self, method_name: str) -> list[dict]:
        method = getattr(self._ak, method_name, None)
        if method is None:
            return []
        payload = method()
        if isinstance(payload, list):
            return [row for row in payload if isinstance(row, dict)]
        if hasattr(payload, "to_dict"):
            records = payload.to_dict("records")
            return [row for row in records if isinstance(row, dict)]
        return []

    def _row_to_summary(self, row: dict) -> StockSummary | None:
        symbol = self._first_text(row, "代码", "code", "symbol")
        name = self._first_text(row, "名称", "name")
        if not symbol or not name:
            return None
        return StockSummary(
            symbol=symbol,
            name=name,
            industry=self._first_text(row, "行业", "industry") or "A股",
            last_price=self._first_float(row, "最新价", "last_price", default=0),
            change_pct=self._first_float(row, "涨跌幅", "change_pct", default=0),
        )

    def _first_text(self, row: dict, *keys: str) -> str:
        for key in keys:
            value = row.get(key)
            if value is not None and str(value).strip():
                return str(value).strip().upper() if key in {"代码", "code", "symbol"} else str(value).strip()
        return ""

    def _first_float(self, row: dict, *keys: str, default: float) -> float:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
        return default

    def _summary_to_conservative_snapshot(self, summary: StockSummary) -> StockSnapshot:
        price = summary.last_price
        return StockSnapshot(
            symbol=summary.symbol,
            name=summary.name,
            industry=summary.industry,
            last_price=price,
            change_pct=summary.change_pct,
            as_of=date.today().isoformat(),
            technical=TechnicalSnapshot(
                ma5=price,
                ma20=price,
                ma60=price,
                rsi14=50,
                macd=0,
                volume_ratio=1,
            ),
            fundamental=FundamentalSnapshot(
                pe_ttm=0,
                pb=0,
                roe=0,
                revenue_growth=0,
                profit_growth=0,
                industry_pe_percentile=50,
            ),
            capital=CapitalSnapshot(
                main_inflow_million=0,
                northbound_inflow_million=0,
                turnover_rate=0,
            ),
            risk=RiskSnapshot(
                pledge_ratio=0,
                unlock_days=None,
                st_flag=False,
                limit_up_streak=0,
            ),
        )
