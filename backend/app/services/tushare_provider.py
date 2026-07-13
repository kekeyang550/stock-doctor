from importlib.util import find_spec

from app.config import settings
from app.schemas.diagnosis import FundamentalSnapshot, HistoricalPriceBar, MarketOverview, StockSnapshot, StockSummary
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
        self._last_finance_enriched = False
        self._last_history_enriched = False

    def list_stocks(self) -> list[StockSummary]:
        return self._fallback.list_stocks()

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        status = (
            "online"
            if self._last_finance_enriched or self._last_history_enriched
            else "planned"
            if self._is_ready()
            else "fallback"
        )
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
        snapshot = self._fallback.get_snapshot(symbol)
        if snapshot is None or not self._is_ready():
            return snapshot
        fundamental = self._fundamental_from_tushare(symbol)
        if fundamental is None:
            return snapshot
        self._last_finance_enriched = True
        sources = sorted(set(snapshot.data_sources) | {"tushare-daily-basic", "tushare-fina-indicator"})
        conservative_fields = [
            item
            for item in snapshot.conservative_fields
            if item not in {"fundamental", "fundamental-seed", "growth"}
        ]
        return snapshot.model_copy(
            update={
                "fundamental": fundamental,
                "data_sources": sources,
                "conservative_fields": conservative_fields,
            }
        )

    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        if not self._is_ready():
            return self._fallback.get_price_history(symbol, days=days)
        bars = self._history_from_tushare(symbol, days=days)
        if not bars:
            return self._fallback.get_price_history(symbol, days=days)
        self._last_history_enriched = True
        return bars

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
        if self._last_finance_enriched and self._last_history_enriched:
            return "财务基础指标和前复权日线已从 Tushare Pro 增强。"
        if self._last_finance_enriched:
            return "财务基础指标已从 Tushare Pro 增强；前复权日线可在回测中尝试读取。"
        if self._last_history_enriched:
            return "前复权日线已从 Tushare Pro 增强；财务基础指标会在诊断中尝试读取。"
        if package_available and token_configured:
            return "包和 Token 已就绪；财务基础指标和前复权日线可尝试增强。"
        if token_configured:
            return "Token 已配置，但当前环境未安装 tushare 包；继续使用 Mock 回退。"
        if package_available:
            return "tushare 包已安装，等待 STOCK_DOCTOR_TUSHARE_TOKEN；继续使用 Mock 回退。"
        return "tushare 包和 Token 均未配置；继续使用 Mock 回退。"

    def _client(self):
        module = self._ts_module
        if module is None:
            try:
                import tushare as module  # type: ignore
            except Exception:
                return None
        pro_api = getattr(module, "pro_api", None)
        if pro_api is None:
            return None
        try:
            return pro_api(settings.tushare_token.strip())
        except Exception:
            return None

    def _fundamental_from_tushare(self, symbol: str) -> FundamentalSnapshot | None:
        client = self._client()
        if client is None:
            return None
        ts_code = self._ts_code(symbol)
        try:
            daily_rows = self._rows(
                client.daily_basic(
                    ts_code=ts_code,
                    fields="ts_code,trade_date,pe_ttm,pb,turnover_rate",
                )
            )
        except Exception:
            daily_rows = []
        try:
            fina_rows = self._rows(
                client.fina_indicator(
                    ts_code=ts_code,
                    fields="ts_code,end_date,roe_dt,roe,q_roe,revenue_yoy,netprofit_yoy",
                )
            )
        except Exception:
            fina_rows = []
        daily = daily_rows[0] if daily_rows else {}
        fina = fina_rows[0] if fina_rows else {}
        pe_ttm = self._first_float(daily, "pe_ttm", "pe", default=0)
        pb = self._first_float(daily, "pb", default=0)
        roe = self._first_float(fina, "roe_dt", "roe", "q_roe", default=0)
        revenue_growth = self._first_float(fina, "revenue_yoy", "or_yoy", default=0)
        profit_growth = self._first_float(fina, "netprofit_yoy", "profit_yoy", default=0)
        if pe_ttm <= 0 and pb <= 0 and roe == 0 and revenue_growth == 0 and profit_growth == 0:
            return None
        return FundamentalSnapshot(
            pe_ttm=pe_ttm,
            pb=pb,
            roe=max(-100, min(100, roe)),
            revenue_growth=revenue_growth,
            profit_growth=profit_growth,
            industry_pe_percentile=self._valuation_percentile(pe_ttm),
        )

    def _history_from_tushare(self, symbol: str, days: int) -> list[HistoricalPriceBar]:
        module = self._ts_module
        if module is None:
            try:
                import tushare as module  # type: ignore
            except Exception:
                return []
        pro_bar = getattr(module, "pro_bar", None)
        if pro_bar is None:
            return []
        try:
            rows = self._rows(
                pro_bar(
                    ts_code=self._ts_code(symbol),
                    adj="qfq",
                    freq="D",
                )
            )
        except Exception:
            return []
        bars: list[HistoricalPriceBar] = []
        for row in rows:
            close = self._first_float(row, "close", default=0)
            date_value = str(row.get("trade_date") or row.get("date") or "").strip()
            if close <= 0 or not date_value:
                continue
            bars.append(
                HistoricalPriceBar(
                    date=self._format_trade_date(date_value),
                    close=close,
                    volume=self._first_float(row, "vol", "volume", default=0),
                )
            )
        return sorted(bars, key=lambda bar: bar.date)[-max(1, days):]

    def _rows(self, payload: object) -> list[dict]:
        if payload is None:
            return []
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        to_dict = getattr(payload, "to_dict", None)
        if to_dict is not None:
            try:
                records = to_dict("records")
                if isinstance(records, list):
                    return [item for item in records if isinstance(item, dict)]
            except Exception:
                return []
        return []

    def _first_float(self, row: dict, *keys: str, default: float = 0) -> float:
        for key in keys:
            value = row.get(key)
            if value is None or value == "":
                continue
            try:
                return round(float(value), 2)
            except (TypeError, ValueError):
                continue
        return default

    def _valuation_percentile(self, pe_ttm: float) -> float:
        if pe_ttm <= 0:
            return 50
        if pe_ttm <= 10:
            return 25
        if pe_ttm <= 20:
            return 40
        if pe_ttm <= 35:
            return 58
        if pe_ttm <= 50:
            return 76
        return 88

    def _format_trade_date(self, value: str) -> str:
        if len(value) == 8 and value.isdigit():
            return f"{value[:4]}-{value[4:6]}-{value[6:]}"
        return value

    def _ts_code(self, symbol: str) -> str:
        normalized = symbol.strip().upper()
        suffix = "SH" if normalized.startswith("6") else "SZ"
        return f"{normalized}.{suffix}"
