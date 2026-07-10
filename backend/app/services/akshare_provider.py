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
        return self._payload_to_rows(payload)

    def _call_history_rows(self, symbol: str) -> list[dict]:
        if self._ak is None:
            return []
        method = getattr(self._ak, "stock_zh_a_hist", None)
        if method is None:
            return []
        try:
            payload = method(symbol=symbol, period="daily", adjust="qfq")
        except TypeError:
            payload = method(symbol)
        except Exception:
            return []
        return self._payload_to_rows(payload)

    def _payload_to_rows(self, payload) -> list[dict]:
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
        technical = self._technical_from_history(summary.symbol) or self._conservative_technical(summary.last_price)
        price = technical["last_price"] or summary.last_price
        return StockSnapshot(
            symbol=summary.symbol,
            name=summary.name,
            industry=summary.industry,
            last_price=price,
            change_pct=summary.change_pct,
            as_of=technical["as_of"],
            technical=technical["snapshot"],
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

    def _conservative_technical(self, price: float) -> dict:
        return {
            "last_price": price,
            "as_of": date.today().isoformat(),
            "snapshot": TechnicalSnapshot(
                ma5=price,
                ma20=price,
                ma60=price,
                rsi14=50,
                macd=0,
                volume_ratio=1,
            ),
        }

    def _technical_from_history(self, symbol: str) -> dict | None:
        rows = self._call_history_rows(symbol)
        points = []
        for row in rows:
            close = self._first_float(row, "收盘", "close", "Close", default=0)
            volume = self._first_float(row, "成交量", "volume", "Volume", default=0)
            trade_date = self._first_text(row, "日期", "date", "trade_date")
            if close > 0:
                points.append({"close": close, "volume": max(0, volume), "date": trade_date})
        if len(points) < 20:
            return None

        closes = [point["close"] for point in points]
        volumes = [point["volume"] for point in points]
        latest = points[-1]
        return {
            "last_price": closes[-1],
            "as_of": latest["date"] or date.today().isoformat(),
            "snapshot": TechnicalSnapshot(
                ma5=self._moving_average(closes, 5),
                ma20=self._moving_average(closes, 20),
                ma60=self._moving_average(closes, min(60, len(closes))),
                rsi14=self._rsi(closes, 14),
                macd=self._macd(closes),
                volume_ratio=self._volume_ratio(volumes, 5),
            ),
        }

    def _moving_average(self, values: list[float], window: int) -> float:
        sample = values[-window:] if len(values) >= window else values
        return round(sum(sample) / len(sample), 2) if sample else 0

    def _rsi(self, closes: list[float], period: int) -> float:
        if len(closes) <= period:
            return 50
        changes = [closes[index] - closes[index - 1] for index in range(1, len(closes))]
        recent = changes[-period:]
        gains = sum(change for change in recent if change > 0) / period
        losses = abs(sum(change for change in recent if change < 0) / period)
        if losses == 0:
            return 100
        rs = gains / losses
        return round(100 - (100 / (1 + rs)), 1)

    def _macd(self, closes: list[float]) -> float:
        if len(closes) < 26:
            return 0
        ema12 = self._ema(closes, 12)
        ema26 = self._ema(closes, 26)
        return round(ema12 - ema26, 2)

    def _ema(self, values: list[float], period: int) -> float:
        multiplier = 2 / (period + 1)
        ema = values[0]
        for value in values[1:]:
            ema = value * multiplier + ema * (1 - multiplier)
        return ema

    def _volume_ratio(self, volumes: list[float], window: int) -> float:
        latest = volumes[-1] if volumes else 0
        history = volumes[-window - 1:-1] if len(volumes) > window else volumes[:-1]
        if not history:
            return 1
        average = sum(history) / len(history)
        return round(latest / average, 2) if average > 0 else 1
