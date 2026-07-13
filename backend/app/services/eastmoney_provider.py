from datetime import date, datetime, timedelta, timezone
from time import monotonic
from typing import Any, Callable

import requests

from app.config import settings
from app.schemas.diagnosis import (
    CapitalSnapshot,
    FundamentalSnapshot,
    HistoricalPriceBar,
    MarketOverview,
    RiskSnapshot,
    StockSnapshot,
    StockSummary,
    TechnicalSnapshot,
)
from app.services.local_stock_directory import LocalStockDirectoryProvider
from app.services.market_data import MockMarketDataProvider
from app.services.storage import StateStore
from app.services.tdx_local_provider import TdxLocalHistoryProvider


class EastmoneyMarketDataProvider:
    """Direct EastMoney adapter for live A-share quote and K-line data."""

    _SPOT_URL = "https://82.push2.eastmoney.com/api/qt/clist/get"
    _INDEX_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get"
    _QUOTE_DETAIL_URL = "https://push2.eastmoney.com/api/qt/stock/get"
    _KLINE_URL = "https://push2his.eastmoney.com/api/qt/stock/kline/get"
    _FUND_FLOW_URL = "https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get"
    _SINA_FUND_FLOW_URL = "https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_qsfx_zjlrqs"
    _TENCENT_QUOTE_URL = "https://qt.gtimg.cn/q={symbols}"
    _TENCENT_KLINE_URL = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
    _UT = "bd1d9ddb04089700cf9c27f6f7426281"
    _KLINE_UT = "7eea3edcaed734bea9cbfc24409ed989"
    _A_SHARE_FS = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048"

    def __init__(
        self,
        session: requests.Session | None = None,
        state_store: StateStore | None = None,
        cache_ttl_seconds: int | None = None,
        clock: Callable[[], float] | None = None,
        tdx_provider: TdxLocalHistoryProvider | None = None,
        stock_directory: LocalStockDirectoryProvider | None = None,
    ) -> None:
        self._session = session or requests.Session()
        self._session.trust_env = False
        self._fallback = MockMarketDataProvider(state_store=state_store)
        self._state_store = self._fallback._state_store
        self._default_watchlist = self._fallback._default_watchlist
        self._watchlist_symbols = self._state_store.load_watchlist(self._default_watchlist)
        self._cache_ttl_seconds = cache_ttl_seconds if cache_ttl_seconds is not None else settings.data_cache_ttl_seconds
        self._clock = clock or monotonic
        self._stock_cache: tuple[float, list[StockSummary]] | None = None
        self._direct_quote_cache: dict[str, StockSummary] = {}
        self._snapshot_cache: dict[str, tuple[float, StockSnapshot]] = {}
        self._history_rows_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
        self._quote_detail_cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._fund_flow_cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._cache_stats = {
            "stock_list": {"hit": 0, "miss": 0},
            "snapshots": {"hit": 0, "miss": 0},
            "history": {"hit": 0, "miss": 0},
        }
        self._last_error: str | None = None
        self._partial_notes: set[str] = set()
        self._source_notes: set[str] = set()
        self._tdx = tdx_provider or TdxLocalHistoryProvider()
        self._stock_directory = stock_directory or LocalStockDirectoryProvider()

    def list_stocks(self) -> list[StockSummary]:
        if self._stock_cache is not None and self._is_cache_fresh(self._stock_cache[0]):
            self._record_cache_hit("stock_list")
            return self._with_direct_quotes(self._stock_cache[1])
        self._record_cache_miss("stock_list")
        try:
            stocks = self._load_a_share_list()
        except Exception as exc:
            self._last_error = str(exc)
            return self._with_direct_quotes(self._fallback.list_stocks())
        if not stocks:
            self._last_error = "EastMoney returned an empty stock list"
            return self._with_direct_quotes(self._fallback.list_stocks())
        self._last_error = None
        self._stock_cache = (self._now(), stocks)
        return self._with_direct_quotes(stocks)

    def search_stocks(self, query: str, limit: int = 12) -> list[StockSummary]:
        normalized_query = query.strip().upper()
        lower_query = normalized_query.lower()
        candidates = self.list_stocks()
        matches = [
            stock
            for stock in candidates
            if not lower_query
            or lower_query in stock.symbol.lower()
            or lower_query in stock.name.lower()
            or lower_query in stock.industry.lower()
        ]
        if self._looks_like_a_share_symbol(normalized_query):
            direct = self._quote_summary(normalized_query)
            if direct is not None:
                matches = [direct] + [stock for stock in matches if stock.symbol != direct.symbol]
        elif lower_query:
            seen = {stock.symbol for stock in matches}
            for entry in self._stock_directory.search(query, limit=max(limit * 2, limit)):
                if entry.symbol in seen:
                    continue
                direct = self._quote_summary(entry.symbol)
                if direct is None:
                    continue
                matches.append(direct)
                seen.add(direct.symbol)
                if len(matches) >= limit:
                    break
        return matches[: max(1, limit)]

    def get_market_overview(self) -> MarketOverview:
        try:
            stocks = self.list_stocks()
            try:
                index_rows = self._index_rows()
                index_row = index_rows[0] if index_rows else {}
                index_level = self._first_float(index_row, "f2", default=0)
                index_name = self._first_text(index_row, "f14") or "沪深300"
                index_change_pct = self._first_float(index_row, "f3", default=0)
            except Exception:
                index_summary = self._load_tencent_quotes(["000300"])[0]
                index_level = index_summary.last_price
                index_name = index_summary.name or "沪深300"
                index_change_pct = index_summary.change_pct
                self._source_notes.add("tencent-index")
            if index_level <= 0:
                raise ValueError("EastMoney index endpoint returned no usable row")
            advancing = len([stock for stock in stocks if stock.change_pct >= 0])
            declining = len(stocks) - advancing
            hot_industries = [
                stock.industry
                for stock in sorted(stocks, key=lambda item: item.change_pct, reverse=True)
                if stock.industry
            ][:3]
        except Exception as exc:
            self._last_error = str(exc)
            return self._fallback.get_market_overview()
        self._last_error = None
        return MarketOverview(
            as_of=date.today().isoformat(),
            index_name=index_name,
            index_level=index_level,
            index_change_pct=index_change_pct,
            advancing=advancing,
            declining=declining,
            hot_industries=hot_industries,
            risk_notes=["真实行情已启用；财务和资金流字段仍使用估算或样例字段。"],
        )

    def get_data_sources(self) -> list[dict[str, str]]:
        if self._last_error is not None:
            status = "fallback"
            message = self._last_error
        else:
            status = "online"
            message = "股票列表、指数和历史 K 线可由真实行情接口获取。"
        if self._source_notes and status == "online":
            notes = "、".join(sorted(self._source_notes))
            message = f"{message} {notes} 已启用。"
        if self._partial_notes and status == "online":
            partial = "、".join(sorted(self._partial_notes))
            message = f"{message} {partial} 使用保守估算。"
        return [
            {"name": "东方财富", "status": status, "role": f"A 股行情、指数、历史 K 线；{message}"},
            {"name": "腾讯行情", "status": "online" if "tencent" in " ".join(self._source_notes) else "fallback", "role": "东方财富接口断开时的真实报价和 K 线备用源。"},
            {"name": "新浪资金流", "status": "online" if "sina-capital-flow" in self._source_notes else "fallback", "role": "东方财富资金流接口不可用时的个股资金流备用源。"},
            self._tdx.get_data_source(sorted(set(self._default_watchlist + self._watchlist_symbols))),
            self._stock_directory.get_data_source(),
            {"name": "AKShare", "status": "fallback", "role": "可选聚合适配器；当前由东方财富直连优先。"},
            {"name": "Mock A股样例库", "status": "fallback", "role": "真实数据失败时的稳定回退"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        summaries = {stock.symbol: stock for stock in self.list_stocks()}
        for symbol in self._watchlist_symbols:
            if symbol not in summaries and self._looks_like_a_share_symbol(symbol):
                direct = self._quote_summary(symbol)
                if direct is not None:
                    summaries[symbol] = direct
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
        normalized = symbol.strip().upper()
        cached = self._snapshot_cache.get(normalized)
        if cached is not None and self._is_cache_fresh(cached[0]):
            self._record_cache_hit("snapshots")
            return cached[1]
        self._record_cache_miss("snapshots")
        summary = next((stock for stock in self.list_stocks() if stock.symbol == normalized), None)
        if (summary is None or summary.last_price <= 0) and self._looks_like_a_share_symbol(normalized):
            summary = self._quote_summary(normalized)
        if summary is None or summary.last_price <= 0:
            fallback_snapshot = self._fallback.get_snapshot(normalized)
            if fallback_snapshot is not None:
                return fallback_snapshot
            return None
        snapshot = self._summary_to_snapshot(summary)
        self._snapshot_cache[normalized] = (self._now(), snapshot)
        return snapshot

    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        normalized = symbol.strip().upper()
        rows = self._call_history_rows(normalized)
        bars: list[HistoricalPriceBar] = []
        for row in rows:
            close = self._first_float(row, "close", default=0)
            trade_date = self._first_text(row, "date")
            volume = self._first_float(row, "volume", default=0)
            if close > 0 and trade_date:
                bars.append(HistoricalPriceBar(date=trade_date, close=close, volume=max(0, volume)))
        days = max(2, min(days, 240))
        return bars[-days:]

    def warm_cache(self, scope: str = "all") -> int:
        stocks = self.get_watchlist() if scope == "watchlist" else self.list_stocks()
        warmed = 0
        for stock in stocks:
            if self.get_snapshot(stock.symbol) is not None:
                warmed += 1
        return warmed

    def get_cache_status(self) -> dict:
        return {
            "ttl_seconds": max(0, self._cache_ttl_seconds),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "buckets": [
                self._cache_bucket_status("stock_list", "股票列表", [self._stock_cache] if self._stock_cache else []),
                self._cache_bucket_status("snapshots", "行情快照", list(self._snapshot_cache.values())),
                self._cache_bucket_status("history", "历史行情", list(self._history_rows_cache.values())),
            ],
        }

    def _load_a_share_list(self) -> list[StockSummary]:
        try:
            payload = self._get_json(
                self._SPOT_URL,
                {
                    "pn": 1,
                    "pz": 6000,
                    "po": 1,
                    "np": 1,
                    "ut": self._UT,
                    "fltt": 2,
                    "invt": 2,
                    "fid": "f12",
                    "fs": self._A_SHARE_FS,
                    "fields": "f12,f14,f2,f3,f100",
                },
            )
            rows = payload.get("data", {}).get("diff", [])
            stocks = [stock for row in rows if isinstance(row, dict) and (stock := self._row_to_summary(row)) is not None]
        except Exception as exc:
            self._source_notes.add("tencent-quotes")
            symbols = sorted(set(self._default_watchlist + self._watchlist_symbols))
            stocks = self._load_tencent_quotes(symbols)
        stocks.sort(key=lambda item: item.symbol)
        return stocks

    def _index_rows(self) -> list[dict[str, Any]]:
        payload = self._get_json(
            self._INDEX_URL,
            {
                "fltt": 2,
                "invt": 2,
                "ut": self._UT,
                "secids": "1.000300,0.399300",
                "fields": "f12,f14,f2,f3",
            },
        )
        rows = payload.get("data", {}).get("diff", [])
        return [row for row in rows if isinstance(row, dict)]

    def _call_history_rows(self, symbol: str) -> list[dict[str, Any]]:
        cached = self._history_rows_cache.get(symbol)
        if cached is not None and self._is_cache_fresh(cached[0]):
            self._record_cache_hit("history")
            return cached[1]
        self._record_cache_miss("history")
        end = date.today()
        begin = end - timedelta(days=420)
        try:
            payload = self._get_json(
                self._KLINE_URL,
                {
                    "fields1": "f1,f2,f3,f4,f5,f6",
                    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
                    "ut": self._KLINE_UT,
                    "klt": 101,
                    "fqt": 1,
                    "secid": self._secid(symbol),
                    "beg": begin.strftime("%Y%m%d"),
                    "end": end.strftime("%Y%m%d"),
                },
            )
        except Exception as exc:
            self._source_notes.add("tencent-kline")
            rows = self._call_tencent_history_rows(symbol)
            if rows:
                self._tdx.record_reference_check(symbol, rows)
                self._history_rows_cache[symbol] = (self._now(), rows)
            else:
                rows = self._call_tdx_history_rows(symbol)
                if rows:
                    self._source_notes.add("tdx-kline")
                    self._history_rows_cache[symbol] = (self._now(), rows)
                else:
                    self._last_error = str(exc)
            return rows
        klines = payload.get("data", {}).get("klines", [])
        rows = [row for raw in klines if isinstance(raw, str) and (row := self._parse_kline(raw)) is not None]
        self._tdx.record_reference_check(symbol, rows)
        self._history_rows_cache[symbol] = (self._now(), rows)
        return rows

    def _get_json(self, url: str, params: dict[str, Any]) -> dict[str, Any]:
        response = self._session.get(
            url,
            params=params,
            timeout=settings.data_request_timeout_seconds,
            headers={"User-Agent": "Mozilla/5.0 StockDoctor/0.1"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("EastMoney returned a non-object response")
        return payload

    def _get_text(self, url: str) -> str:
        response = self._session.get(
            url,
            timeout=settings.data_request_timeout_seconds,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://stockapp.finance.qq.com/",
            },
        )
        response.raise_for_status()
        response.encoding = "gbk"
        return response.text

    def _load_tencent_quotes(self, symbols: list[str]) -> list[StockSummary]:
        market_symbols = [self._tencent_symbol(symbol) for symbol in symbols]
        text = self._get_text(self._TENCENT_QUOTE_URL.format(symbols=",".join(market_symbols)))
        summaries = []
        fallback_by_symbol = {item.symbol: item for item in self._fallback.list_stocks()}
        for raw in text.split(";"):
            if "~" not in raw:
                continue
            fields = raw.split("=", 1)[-1].strip().strip('"').split("~")
            if len(fields) < 33:
                continue
            symbol = fields[2].strip()
            fallback = fallback_by_symbol.get(symbol)
            summaries.append(
                StockSummary(
                    symbol=symbol,
                    name=fields[1].strip() or (fallback.name if fallback else symbol),
                    industry=fallback.industry if fallback else "A股",
                    last_price=self._to_float(fields[3]) or (fallback.last_price if fallback else 0),
                    change_pct=self._to_float(fields[32]) or 0,
                )
            )
        return summaries

    def _quote_summary(self, symbol: str) -> StockSummary | None:
        cached = self._direct_quote_cache.get(symbol)
        if cached is not None:
            return cached
        try:
            summaries = self._load_tencent_quotes([symbol])
        except Exception as exc:
            self._last_error = str(exc)
            return None
        if not summaries:
            return None
        summary = self._enrich_summary_from_directory(summaries[0])
        if summary.last_price <= 0:
            return None
        self._source_notes.add("tencent-direct-search")
        self._direct_quote_cache[summary.symbol] = summary
        return summary

    def _with_direct_quotes(self, stocks: list[StockSummary]) -> list[StockSummary]:
        if not self._direct_quote_cache:
            return stocks
        by_symbol = {stock.symbol: stock for stock in stocks}
        by_symbol.update(self._direct_quote_cache)
        return sorted(by_symbol.values(), key=lambda item: item.symbol)

    def _enrich_summary_from_directory(self, summary: StockSummary) -> StockSummary:
        entry = self._stock_directory.lookup(summary.symbol)
        if entry is None:
            return summary
        quote_name = summary.name.strip()
        should_use_directory_name = (
            not quote_name
            or quote_name.startswith(("XD", "XR", "DR"))
            or quote_name.isascii()
            or len(quote_name) < len(entry.name)
        )
        if not should_use_directory_name:
            return summary
        return summary.model_copy(update={"name": entry.name})

    def _call_tencent_history_rows(self, symbol: str) -> list[dict[str, Any]]:
        market_symbol = self._tencent_symbol(symbol)
        payload = self._get_json(
            self._TENCENT_KLINE_URL,
            {"param": f"{market_symbol},day,,,240,qfq"},
        )
        data = payload.get("data", {}).get(market_symbol, {})
        rows = data.get("qfqday") or data.get("day") or []
        normalized = []
        for row in rows:
            if not isinstance(row, list) or len(row) < 6:
                continue
            normalized.append(
                {
                    "date": str(row[0]),
                    "open": self._to_float(row[1]) or 0,
                    "close": self._to_float(row[2]) or 0,
                    "high": self._to_float(row[3]) or 0,
                    "low": self._to_float(row[4]) or 0,
                    "volume": self._to_float(row[5]) or 0,
                    "turnover_rate": 0,
                }
            )
        return normalized

    def _call_tdx_history_rows(self, symbol: str) -> list[dict[str, Any]]:
        bars = self._tdx.get_price_history(symbol, days=240)
        return [
            {
                "date": bar.date,
                "close": bar.close,
                "volume": bar.volume,
                "turnover_rate": 0,
            }
            for bar in bars
        ]

    def _quote_detail(self, symbol: str) -> dict[str, Any]:
        cached = self._quote_detail_cache.get(symbol)
        if cached is not None and self._is_cache_fresh(cached[0]):
            return cached[1]
        try:
            payload = self._get_json(
                self._QUOTE_DETAIL_URL,
                {
                    "secid": self._secid(symbol),
                    "ut": self._UT,
                    "fltt": 2,
                    "invt": 2,
                    "fields": "f43,f57,f58,f116,f117,f162,f167,f168,f170,f173,f183,f184,f185",
                },
            )
        except Exception as exc:
            data = self._tencent_quote_detail(symbol)
            if data:
                self._source_notes.add("tencent-quote-detail")
                self._quote_detail_cache[symbol] = (self._now(), data)
                return data
            self._partial_notes.add("fundamental")
            return {}
        data = payload.get("data", {})
        if not isinstance(data, dict):
            return {}
        self._quote_detail_cache[symbol] = (self._now(), data)
        return data

    def _tencent_quote_detail(self, symbol: str) -> dict[str, Any]:
        try:
            text = self._get_text(self._TENCENT_QUOTE_URL.format(symbols=self._tencent_symbol(symbol)))
        except Exception:
            return {}
        if "~" not in text:
            return {}
        fields = text.split("=", 1)[-1].strip().strip('"').strip(";").split("~")
        if len(fields) < 53:
            return {}
        return {
            "f57": fields[2].strip(),
            "f58": fields[1].strip(),
            "f162": self._to_float(fields[52]) or self._to_float(fields[39]) or 0,
            "f167": self._to_float(fields[46]) or 0,
            "f168": self._to_float(fields[38]) or 0,
        }

    def _fund_flow_row(self, symbol: str) -> dict[str, Any]:
        cached = self._fund_flow_cache.get(symbol)
        if cached is not None and self._is_cache_fresh(cached[0]):
            return cached[1]
        try:
            payload = self._get_json(
                self._FUND_FLOW_URL,
                {
                    "secid": self._secid(symbol),
                    "lmt": 1,
                    "klt": 101,
                    "fields1": "f1,f2,f3,f7",
                    "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63",
                },
            )
        except Exception:
            return self._sina_fund_flow_row(symbol)
        klines = payload.get("data", {}).get("klines", [])
        row = self._parse_fund_flow(klines[-1]) if klines else None
        if row is None:
            return self._sina_fund_flow_row(symbol)
        self._fund_flow_cache[symbol] = (self._now(), row)
        return row

    def _sina_fund_flow_row(self, symbol: str) -> dict[str, Any]:
        try:
            response = self._session.get(
                self._SINA_FUND_FLOW_URL,
                params={"daima": self._sina_symbol(symbol)},
                timeout=settings.data_request_timeout_seconds,
                headers={
                    "User-Agent": "Mozilla/5.0 StockDoctor/0.1",
                    "Referer": "https://finance.sina.com.cn/",
                },
            )
            response.raise_for_status()
            payload = response.json()
        except Exception:
            self._partial_notes.add("capital-flow")
            return {}
        if not isinstance(payload, list) or not payload:
            self._partial_notes.add("capital-flow")
            return {}
        row = self._parse_sina_fund_flow(payload[0])
        if row is None:
            self._partial_notes.add("capital-flow")
            return {}
        self._source_notes.add("sina-capital-flow")
        self._fund_flow_cache[symbol] = (self._now(), row)
        return row

    def _parse_fund_flow(self, raw: str) -> dict[str, Any] | None:
        fields = raw.split(",")
        if len(fields) < 6:
            return None
        return {
            "date": fields[0],
            "main_inflow": self._to_float(fields[1]) or 0,
            "small_inflow": self._to_float(fields[2]) or 0,
            "medium_inflow": self._to_float(fields[3]) or 0,
            "large_inflow": self._to_float(fields[4]) or 0,
            "super_large_inflow": self._to_float(fields[5]) or 0,
        }

    def _parse_sina_fund_flow(self, raw: dict[str, Any]) -> dict[str, Any] | None:
        if not isinstance(raw, dict):
            return None
        main_inflow = self._first_float(raw, "r0_net", "netamount", default=0)
        return {
            "date": self._first_text(raw, "opendate"),
            "main_inflow": main_inflow,
        }

    def _normalize_money_to_million(self, value: float) -> float:
        return round(value / 1_000_000, 1) if abs(value) >= 10_000 else round(value, 1)

    def _valuation_percentile(self, pe_ttm: float) -> float:
        if pe_ttm <= 0:
            return 50
        if pe_ttm <= 10:
            return 30
        if pe_ttm <= 20:
            return 45
        if pe_ttm <= 35:
            return 60
        if pe_ttm <= 50:
            return 75
        return 85

    def _row_to_summary(self, row: dict[str, Any]) -> StockSummary | None:
        symbol = self._first_text(row, "f12")
        name = self._first_text(row, "f14")
        if not symbol or not name or len(symbol) != 6:
            return None
        return StockSummary(
            symbol=symbol,
            name=name,
            industry=self._first_text(row, "f100") or "A股",
            last_price=self._first_float(row, "f2", default=0),
            change_pct=self._first_float(row, "f3", default=0),
        )

    def _fundamental_from_quote_detail(self, symbol: str) -> FundamentalSnapshot | None:
        detail = self._quote_detail(symbol)
        if not detail:
            return None
        pe_ttm = self._first_float(detail, "f162", default=0)
        pb = self._first_float(detail, "f167", default=0)
        revenue_growth = self._first_float(detail, "f184", default=0)
        profit_growth = self._first_float(detail, "f185", default=0)
        if pe_ttm <= 0 and pb <= 0 and revenue_growth == 0 and profit_growth == 0:
            return None
        if "f184" not in detail and "f185" not in detail:
            self._partial_notes.add("growth")
            revenue_growth = 6
            profit_growth = 6
        roe = round(pb / pe_ttm * 100, 1) if pe_ttm > 0 and pb > 0 else 0
        self._source_notes.add("fundamental-quote-detail")
        return FundamentalSnapshot(
            pe_ttm=pe_ttm,
            pb=pb,
            roe=max(-100, min(100, roe)),
            revenue_growth=revenue_growth,
            profit_growth=profit_growth,
            industry_pe_percentile=self._valuation_percentile(pe_ttm),
        )

    def _capital_from_fund_flow(self, symbol: str, turnover_rate: float) -> CapitalSnapshot | None:
        row = self._fund_flow_row(symbol)
        if not row:
            detail = self._quote_detail(symbol)
            detail_turnover = self._first_float(detail, "f168", default=0) if detail else 0
            if turnover_rate <= 0 and detail_turnover <= 0:
                return None
            self._partial_notes.add("capital-flow")
            return CapitalSnapshot(
                main_inflow_million=0,
                northbound_inflow_million=0,
                turnover_rate=turnover_rate or detail_turnover,
            )
        main_inflow = self._normalize_money_to_million(self._first_float(row, "main_inflow", default=0))
        detail = self._quote_detail(symbol)
        detail_turnover = self._first_float(detail, "f168", default=0) if detail else 0
        self._source_notes.add("capital-flow")
        self._partial_notes.add("northbound")
        return CapitalSnapshot(
            main_inflow_million=main_inflow,
            northbound_inflow_million=0,
            turnover_rate=turnover_rate or detail_turnover,
        )

    def _summary_to_snapshot(self, summary: StockSummary) -> StockSnapshot:
        technical = self._technical_from_history(summary.symbol)
        if technical is None:
            self._partial_notes.add("technical")
            technical = self._conservative_technical(summary.last_price)
        fallback_snapshot = self._fallback.get_snapshot(summary.symbol)
        fundamental = self._fundamental_from_quote_detail(summary.symbol)
        capital = self._capital_from_fund_flow(summary.symbol, technical["turnover_rate"])
        if fallback_snapshot is not None:
            if fundamental is None:
                self._partial_notes.add("fundamental-seed")
                fundamental = fallback_snapshot.fundamental
            if capital is None:
                self._partial_notes.add("capital-seed")
                capital = CapitalSnapshot(
                    main_inflow_million=fallback_snapshot.capital.main_inflow_million,
                    northbound_inflow_million=fallback_snapshot.capital.northbound_inflow_million,
                    turnover_rate=technical["turnover_rate"] or fallback_snapshot.capital.turnover_rate,
                )
            risk = fallback_snapshot.risk
        else:
            if fundamental is None:
                self._partial_notes.add("fundamental")
                fundamental = FundamentalSnapshot(
                    pe_ttm=0,
                    pb=0,
                    roe=0,
                    revenue_growth=0,
                    profit_growth=0,
                    industry_pe_percentile=50,
                )
            if capital is None:
                self._partial_notes.add("capital")
                capital = CapitalSnapshot(
                    main_inflow_million=0,
                    northbound_inflow_million=0,
                    turnover_rate=technical["turnover_rate"],
                )
            risk = RiskSnapshot(
                pledge_ratio=0,
                unlock_days=None,
                st_flag=self._is_st_stock(summary.name),
                limit_up_streak=1 if summary.change_pct >= 9.8 else 0,
            )
        return StockSnapshot(
            symbol=summary.symbol,
            name=summary.name,
            industry=summary.industry,
            last_price=technical["last_price"] or summary.last_price,
            change_pct=summary.change_pct,
            as_of=technical["as_of"],
            technical=technical["snapshot"],
            fundamental=fundamental,
            capital=capital,
            risk=risk,
            data_sources=sorted(self._source_notes),
            conservative_fields=sorted(self._partial_notes),
        )

    def _technical_from_history(self, symbol: str) -> dict[str, Any] | None:
        rows = self._call_history_rows(symbol)
        if len(rows) < 20:
            return None
        closes = [self._first_float(row, "close", default=0) for row in rows]
        volumes = [self._first_float(row, "volume", default=0) for row in rows]
        closes = [value for value in closes if value > 0]
        if len(closes) < 20:
            return None
        latest = rows[-1]
        return {
            "last_price": closes[-1],
            "as_of": self._first_text(latest, "date") or date.today().isoformat(),
            "turnover_rate": self._first_float(latest, "turnover_rate", default=0),
            "snapshot": TechnicalSnapshot(
                ma5=self._moving_average(closes, 5),
                ma20=self._moving_average(closes, 20),
                ma60=self._moving_average(closes, min(60, len(closes))),
                rsi14=self._rsi(closes, 14),
                macd=self._macd(closes),
                volume_ratio=self._volume_ratio(volumes, 5),
            ),
        }

    def _parse_kline(self, raw: str) -> dict[str, Any] | None:
        fields = raw.split(",")
        if len(fields) < 11:
            return None
        return {
            "date": fields[0],
            "open": self._to_float(fields[1]),
            "close": self._to_float(fields[2]),
            "high": self._to_float(fields[3]),
            "low": self._to_float(fields[4]),
            "volume": self._to_float(fields[5]),
            "turnover_rate": self._to_float(fields[10]),
        }

    def _secid(self, symbol: str) -> str:
        market = "1" if symbol.startswith(("5", "6", "9")) else "0"
        return f"{market}.{symbol}"

    def _tencent_symbol(self, symbol: str) -> str:
        market = "sh" if symbol.startswith(("5", "6", "9")) or symbol == "000300" else "sz"
        return f"{market}{symbol}"

    def _sina_symbol(self, symbol: str) -> str:
        market = "sh" if symbol.startswith(("5", "6", "9")) else "sz"
        return f"{market}{symbol}"

    def _looks_like_a_share_symbol(self, symbol: str) -> bool:
        return len(symbol) == 6 and symbol.isdigit()

    def _is_st_stock(self, name: str) -> bool:
        normalized = name.strip().upper()
        return normalized.startswith("ST") or normalized.startswith("*ST") or "退" in normalized

    def _conservative_technical(self, price: float) -> dict[str, Any]:
        return {
            "last_price": price,
            "as_of": date.today().isoformat(),
            "turnover_rate": 0,
            "snapshot": TechnicalSnapshot(ma5=price, ma20=price, ma60=price, rsi14=50, macd=0, volume_ratio=1),
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
        return round(self._ema(closes, 12) - self._ema(closes, 26), 2)

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

    def _first_text(self, row: dict[str, Any], *keys: str) -> str:
        for key in keys:
            value = row.get(key)
            if value is not None and str(value).strip() and str(value).strip() != "-":
                return str(value).strip()
        return ""

    def _first_float(self, row: dict[str, Any], *keys: str, default: float) -> float:
        for key in keys:
            value = row.get(key)
            parsed = self._to_float(value)
            if parsed is not None:
                return parsed
        return default

    def _to_float(self, value: Any) -> float | None:
        if value is None or value == "-":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _now(self) -> float:
        return self._clock()

    def _is_cache_fresh(self, created_at: float) -> bool:
        if self._cache_ttl_seconds <= 0:
            return False
        return self._now() - created_at <= self._cache_ttl_seconds

    def _cache_bucket_status(self, key: str, label: str, entries: list[tuple[float, object]]) -> dict[str, Any]:
        stats = self._cache_stats[key]
        total_lookups = stats["hit"] + stats["miss"]
        active_ages = [
            max(0.0, self._cache_ttl_seconds - (self._now() - created_at))
            for created_at, _value in entries
            if self._is_cache_fresh(created_at)
        ]
        active_entries = len(active_ages)
        total_entries = len(entries)
        expired_entries = total_entries - active_entries
        if total_entries == 0:
            status = "empty"
        elif active_entries == total_entries:
            status = "active"
        elif active_entries == 0:
            status = "expired"
        else:
            status = "partial"
        return {
            "key": key,
            "label": label,
            "entries": total_entries,
            "active_entries": active_entries,
            "expired_entries": expired_entries,
            "nearest_expires_in_seconds": int(min(active_ages)) if active_ages else 0,
            "hit_count": stats["hit"],
            "miss_count": stats["miss"],
            "hit_rate_pct": round((stats["hit"] / total_lookups) * 100, 1) if total_lookups else 0,
            "status": status,
        }

    def _record_cache_hit(self, key: str) -> None:
        self._cache_stats[key]["hit"] += 1

    def _record_cache_miss(self, key: str) -> None:
        self._cache_stats[key]["miss"] += 1
