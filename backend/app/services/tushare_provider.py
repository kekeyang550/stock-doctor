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
        self._last_basic_enriched = False
        self._last_finance_enriched = False
        self._last_history_enriched = False
        self._last_error: str | None = None

    def list_stocks(self) -> list[StockSummary]:
        return self._fallback.list_stocks()

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        enriched = self._last_basic_enriched or self._last_finance_enriched or self._last_history_enriched
        status = (
            "online"
            if enriched
            else "fallback"
            if self._last_error
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
        basic_info = self._basic_info_from_tushare(symbol)
        if fundamental is None and basic_info is None:
            return snapshot
        update = {}
        sources = set(snapshot.data_sources)
        conservative_fields = list(snapshot.conservative_fields)
        if fundamental is not None:
            self._last_finance_enriched = True
            sources.update({"tushare-daily-basic", "tushare-fina-indicator"})
            conservative_fields = [
                item
                for item in conservative_fields
                if item not in {"fundamental", "fundamental-seed", "growth"}
            ]
            update["fundamental"] = fundamental
        if basic_info is not None:
            self._last_basic_enriched = True
            sources.add("tushare-stock-basic")
            update.update(basic_info)
        update["data_sources"] = sorted(sources)
        update["conservative_fields"] = conservative_fields
        return snapshot.model_copy(update=update)

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
        enriched_parts = []
        if self._last_basic_enriched:
            enriched_parts.append("基础资料")
        if self._last_finance_enriched:
            enriched_parts.append("财务基础指标")
        if self._last_history_enriched:
            enriched_parts.append("前复权日线")
        if enriched_parts:
            return f"{'、'.join(enriched_parts)}已从 Tushare Pro 增强。"
        if self._last_error:
            return f"Tushare 连通性校验失败：{self._last_error}；继续使用 Mock 回退。"
        if package_available and token_configured:
            return "包和 Token 已就绪；基础资料、财务基础指标和前复权日线可尝试增强。"
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
                self._last_error = "tushare 包导入失败"
                return None
        pro_api = getattr(module, "pro_api", None)
        if pro_api is None:
            self._last_error = "tushare.pro_api 不可用"
            return None
        try:
            return pro_api(settings.tushare_token.strip())
        except Exception:
            self._last_error = "pro_api 初始化失败"
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
            self._last_error = "daily_basic 调用失败"
        try:
            fina_rows = self._rows(
                client.fina_indicator(
                    ts_code=ts_code,
                    fields=(
                        "ts_code,end_date,roe_dt,roe,q_roe,revenue_yoy,netprofit_yoy,"
                        "eps,basic_eps,grossprofit_margin,gross_margin,debt_to_assets,"
                        "ocfps,ocf_to_profit,cashflow_ratio,current_ratio,quick_ratio,"
                        "netprofit_margin,assets_turn"
                    ),
                )
            )
        except Exception:
            fina_rows = []
            self._last_error = "fina_indicator 调用失败"
        daily = daily_rows[0] if daily_rows else {}
        fina = fina_rows[0] if fina_rows else {}
        pe_ttm = self._first_float(daily, "pe_ttm", "pe", default=0)
        pb = self._first_float(daily, "pb", default=0)
        roe = self._first_float(fina, "roe_dt", "roe", "q_roe", default=0)
        revenue_growth = self._first_float(fina, "revenue_yoy", "or_yoy", default=0)
        profit_growth = self._first_float(fina, "netprofit_yoy", "profit_yoy", default=0)
        eps = self._first_optional_float(fina, "eps", "basic_eps")
        gross_margin = self._first_optional_float(fina, "grossprofit_margin", "gross_margin")
        debt_to_assets = self._first_optional_float(fina, "debt_to_assets")
        operating_cashflow_per_share = self._first_optional_float(fina, "ocfps")
        cashflow_to_profit = self._first_optional_float(fina, "ocf_to_profit", "cashflow_ratio")
        current_ratio = self._first_optional_float(fina, "current_ratio")
        quick_ratio = self._first_optional_float(fina, "quick_ratio")
        net_margin = self._first_optional_float(fina, "netprofit_margin", "net_profit_margin")
        asset_turnover = self._first_optional_float(fina, "assets_turn", "asset_turnover", "total_assets_turnover")
        if pe_ttm <= 0 and pb <= 0 and roe == 0 and revenue_growth == 0 and profit_growth == 0:
            self._last_error = self._last_error or "财务指标返回空数据"
            return None
        self._last_error = None
        return FundamentalSnapshot(
            pe_ttm=pe_ttm,
            pb=pb,
            roe=max(-100, min(100, roe)),
            revenue_growth=revenue_growth,
            profit_growth=profit_growth,
            industry_pe_percentile=self._valuation_percentile(pe_ttm),
            eps=eps,
            gross_margin=gross_margin,
            debt_to_assets=debt_to_assets,
            operating_cashflow_per_share=operating_cashflow_per_share,
            cashflow_to_profit=cashflow_to_profit,
            current_ratio=current_ratio,
            quick_ratio=quick_ratio,
            net_margin=net_margin,
            asset_turnover=asset_turnover,
        )

    def _basic_info_from_tushare(self, symbol: str) -> dict[str, str] | None:
        client = self._client()
        stock_basic = getattr(client, "stock_basic", None) if client is not None else None
        if stock_basic is None:
            return None
        try:
            rows = self._rows(
                stock_basic(
                    ts_code=self._ts_code(symbol),
                    fields="ts_code,name,industry,area,market,list_date",
                )
            )
        except Exception:
            self._last_error = "stock_basic 调用失败"
            return None
        if not rows:
            self._last_error = self._last_error or "基础资料返回空数据"
            return None
        row = rows[0]
        update = {}
        name = self._first_text(row, "name", "stock_name")
        industry = self._first_text(row, "industry", "sw_industry")
        if name:
            update["name"] = name
        if industry:
            update["industry"] = industry
        return update or None

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
            self._last_error = "pro_bar 前复权日线调用失败"
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
        if not bars:
            self._last_error = self._last_error or "前复权日线返回空数据"
            return []
        self._last_error = None
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

    def _first_optional_float(self, row: dict, *keys: str) -> float | None:
        for key in keys:
            value = row.get(key)
            if value is None or value == "":
                continue
            try:
                return round(float(value), 2)
            except (TypeError, ValueError):
                continue
        return None

    def _first_text(self, row: dict, *keys: str) -> str | None:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None

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
