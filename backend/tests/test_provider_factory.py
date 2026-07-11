from datetime import date, timedelta

from app.services.akshare_provider import AkshareMarketDataProvider
from app.services.market_data import MockMarketDataProvider
from app.services.storage import JsonStateStore


def test_akshare_provider_falls_back_without_package():
    provider = AkshareMarketDataProvider()

    stocks = provider.list_stocks()
    sources = provider.get_data_sources()

    assert len(stocks) > 0
    assert any(source["name"] == "AKShare" for source in sources)


class FakeAkshare:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "000001", "名称": "平安银行", "最新价": "10.62", "涨跌幅": "0.19"},
            {"代码": "600519", "名称": "贵州茅台", "最新价": "1518.3", "涨跌幅": "1.18"},
        ]


class FailingAkshare:
    def stock_zh_a_spot_em(self):
        raise RuntimeError("network unavailable")


class FakeAkshareWithMarketOverview:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "000001", "名称": "平安银行", "行业": "银行", "最新价": "10.62", "涨跌幅": "0.19"},
            {"代码": "600519", "名称": "贵州茅台", "行业": "白酒", "最新价": "1518.3", "涨跌幅": "1.18"},
            {"代码": "300750", "名称": "宁德时代", "行业": "电池", "最新价": "214.8", "涨跌幅": "-0.74"},
        ]

    def stock_zh_index_spot_em(self):
        return [
            {"代码": "000300", "名称": "沪深300", "最新价": "4216.38", "涨跌幅": "0.72"},
            {"代码": "000001", "名称": "上证指数", "最新价": "3120.15", "涨跌幅": "0.31"},
        ]


class FailingAkshareMarketOverview(FakeAkshareWithMarketOverview):
    def stock_zh_index_spot_em(self):
        raise RuntimeError("index endpoint unavailable")


class FakeAkshareWithRemoteStock:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688001", "名称": "华兴源创", "行业": "专用设备", "最新价": "32.5", "涨跌幅": "-1.2"},
        ]


class FakeAkshareWithHistory:
    def __init__(self):
        self.history_calls = 0

    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688002", "名称": "睿创微纳", "行业": "半导体", "最新价": "12.3", "涨跌幅": "2.1"},
        ]

    def stock_zh_a_hist(self, symbol: str, period: str, adjust: str):
        self.history_calls += 1
        start = date(2026, 4, 1)
        return [
            {
                "日期": (start + timedelta(days=index)).isoformat(),
                "收盘": round(10 + index * 0.1, 2),
                "成交量": 1000 + index * 10,
            }
            for index in range(60)
        ]


class FakeAkshareWithChangingSpot:
    def __init__(self):
        self.spot_calls = 0

    def stock_zh_a_spot_em(self):
        self.spot_calls += 1
        return [
            {
                "代码": "688006",
                "名称": "缓存测试",
                "行业": "软件服务",
                "最新价": str(10 + self.spot_calls),
                "涨跌幅": "0.5",
            },
        ]


class FakeAkshareWithFundamentals:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688003", "名称": "天准科技", "行业": "专用设备", "最新价": "28.2", "涨跌幅": "0.8"},
        ]

    def stock_a_lg_indicator(self, symbol: str):
        return [
            {
                "市盈率(TTM)": "31.4",
                "市净率": "2.7",
                "净资产收益率": "12.6",
                "营业收入同比增长": "9.8",
                "净利润同比增长": "15.2",
                "行业市盈率分位": "42",
            },
        ]


class FakeAkshareWithCapital:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688004", "名称": "博汇科技", "行业": "软件开发", "最新价": "18.6", "涨跌幅": "-0.5"},
        ]

    def stock_individual_fund_flow(self, symbol: str):
        return [
            {
                "主力净流入-净额": "238000000",
                "北向资金净流入": "-82000000",
                "换手率": "3.4",
            },
        ]


class FakeAkshareWithRiskNames:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688005", "名称": "ST测试", "行业": "风险警示", "最新价": "2.1", "涨跌幅": "9.92"},
        ]


def test_akshare_provider_normalizes_spot_list():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshare())

    stocks = provider.list_stocks()

    assert [stock.symbol for stock in stocks] == ["000001", "600519"]
    assert stocks[0].name == "平安银行"
    assert stocks[0].last_price == 10.62
    assert stocks[0].industry == "A股"


def test_akshare_provider_falls_back_when_remote_fails():
    provider = AkshareMarketDataProvider(ak_module=FailingAkshare())

    stocks = provider.list_stocks()
    sources = provider.get_data_sources()

    assert any(stock.symbol == "600519" for stock in stocks)
    assert sources[0]["status"] == "fallback"


def test_akshare_provider_builds_market_overview_from_remote_rows():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithMarketOverview())

    overview = provider.get_market_overview()

    assert overview.index_name == "沪深300"
    assert overview.index_level == 4216.38
    assert overview.index_change_pct == 0.72
    assert overview.advancing == 2
    assert overview.declining == 1
    assert overview.hot_industries[:2] == ["白酒", "银行"]
    assert "AKShare" in overview.risk_notes[0]


def test_akshare_provider_market_overview_falls_back_when_index_endpoint_fails():
    provider = AkshareMarketDataProvider(ak_module=FailingAkshareMarketOverview())

    overview = provider.get_market_overview()
    sources = provider.get_data_sources()

    assert overview.index_name == "沪深 300"
    assert sources[0]["status"] == "fallback"
    assert "index endpoint unavailable" in sources[0]["role"]


def test_akshare_provider_builds_conservative_snapshot_for_remote_stock():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRemoteStock())

    snapshot = provider.get_snapshot("688001")

    assert snapshot is not None
    assert snapshot.symbol == "688001"
    assert snapshot.name == "华兴源创"
    assert snapshot.industry == "专用设备"
    assert snapshot.last_price == 32.5
    assert snapshot.change_pct == -1.2
    assert snapshot.technical.ma5 == 32.5
    assert snapshot.technical.ma20 == 32.5
    assert snapshot.fundamental.pe_ttm == 0
    assert snapshot.capital.main_inflow_million == 0


def test_akshare_provider_enriches_capital_snapshot_from_fund_flow():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithCapital())

    snapshot = provider.get_snapshot("688004")

    assert snapshot is not None
    assert snapshot.capital.main_inflow_million == 238
    assert snapshot.capital.northbound_inflow_million == -82
    assert snapshot.capital.turnover_rate == 3.4
    assert snapshot.fundamental.pe_ttm == 0


def test_akshare_provider_enriches_technical_snapshot_from_history():
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare)

    snapshot = provider.get_snapshot("688002")

    assert snapshot is not None
    assert snapshot.last_price == 15.9
    assert snapshot.as_of == "2026-05-30"
    assert snapshot.technical.ma5 == 15.7
    assert snapshot.technical.ma20 == 14.95
    assert snapshot.technical.ma60 == 12.95
    assert snapshot.technical.rsi14 == 100
    assert snapshot.technical.macd > 0
    assert snapshot.technical.volume_ratio == 1.02
    assert snapshot.fundamental.pe_ttm == 0
    assert akshare.history_calls == 1


def test_mock_provider_returns_deterministic_price_history():
    provider = MockMarketDataProvider()

    bars = provider.get_price_history("600519", days=30)
    snapshot = provider.get_snapshot("600519")

    assert snapshot is not None
    assert len(bars) == 30
    assert bars[-1].date == snapshot.as_of
    assert bars[-1].close == snapshot.last_price
    assert all(bar.close > 0 for bar in bars)


def test_akshare_provider_exposes_price_history_rows():
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare)

    bars = provider.get_price_history("688002", days=10)

    assert len(bars) == 10
    assert bars[0].date == "2026-05-21"
    assert bars[-1].date == "2026-05-30"
    assert bars[-1].close == 15.9
    assert bars[-1].volume == 1590
    assert akshare.history_calls == 1


def test_akshare_provider_caches_remote_snapshot_enrichment():
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare)

    first = provider.get_snapshot("688002")
    second = provider.get_snapshot("688002")

    assert first is second
    assert akshare.history_calls == 1


def test_akshare_provider_stock_list_cache_expires_after_ttl():
    now = 1000.0
    akshare = FakeAkshareWithChangingSpot()
    provider = AkshareMarketDataProvider(ak_module=akshare, cache_ttl_seconds=10, clock=lambda: now)

    first = provider.list_stocks()
    now = 1005.0
    second = provider.list_stocks()
    now = 1011.0
    third = provider.list_stocks()

    assert first[0].last_price == 11
    assert second[0].last_price == 11
    assert third[0].last_price == 12
    assert akshare.spot_calls == 2


def test_akshare_provider_snapshot_and_history_cache_expire_after_ttl():
    now = 1000.0
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare, cache_ttl_seconds=10, clock=lambda: now)

    first = provider.get_snapshot("688002")
    now = 1005.0
    second = provider.get_snapshot("688002")
    bars = provider.get_price_history("688002", days=10)
    now = 1011.0
    refreshed = provider.get_snapshot("688002")
    now = 1022.0
    refreshed_bars = provider.get_price_history("688002", days=10)

    assert first is second
    assert refreshed is not first
    assert len(bars) == 10
    assert len(refreshed_bars) == 10
    assert akshare.history_calls == 3


def test_akshare_provider_reports_cache_status_buckets():
    now = 1000.0
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare, cache_ttl_seconds=10, clock=lambda: now)

    cold = provider.get_cache_status()
    provider.list_stocks()
    provider.list_stocks()
    provider.get_snapshot("688002")
    provider.get_snapshot("688002")
    provider.get_price_history("688002", days=10)
    warm = provider.get_cache_status()
    now = 1011.0
    expired = provider.get_cache_status()

    assert [bucket["key"] for bucket in cold["buckets"]] == ["stock_list", "snapshots", "history"]
    assert all(bucket["entries"] == 0 for bucket in cold["buckets"])
    assert {bucket["key"]: bucket["active_entries"] for bucket in warm["buckets"]} == {
        "stock_list": 1,
        "snapshots": 1,
        "history": 1,
    }
    assert {bucket["key"]: bucket["hit_count"] for bucket in warm["buckets"]} == {
        "stock_list": 2,
        "snapshots": 1,
        "history": 1,
    }
    assert {bucket["key"]: bucket["miss_count"] for bucket in warm["buckets"]} == {
        "stock_list": 1,
        "snapshots": 1,
        "history": 1,
    }
    assert {bucket["key"]: bucket["hit_rate_pct"] for bucket in warm["buckets"]} == {
        "stock_list": 66.7,
        "snapshots": 50,
        "history": 50,
    }
    assert all(bucket["nearest_expires_in_seconds"] == 10 for bucket in warm["buckets"])
    assert all(bucket["status"] == "expired" for bucket in expired["buckets"])


def test_akshare_provider_warms_watchlist_snapshot_cache(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare, state_store=store)
    provider.add_to_watchlist("688002")

    warmed = provider.warm_cache(scope="watchlist")
    first = provider.get_snapshot("688002")
    second = provider.get_snapshot("688002")

    assert warmed == 1
    assert first is second
    assert akshare.history_calls == 1


def test_akshare_provider_warms_all_listed_stocks():
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare)

    warmed = provider.warm_cache(scope="all")

    assert warmed == 1
    assert akshare.history_calls == 1


def test_akshare_provider_marks_basic_risk_flags_from_summary():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRiskNames())

    snapshot = provider.get_snapshot("688005")

    assert snapshot is not None
    assert snapshot.risk.st_flag is True
    assert snapshot.risk.limit_up_streak == 1


def test_akshare_provider_enriches_fundamental_snapshot_from_remote_indicator():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithFundamentals())

    snapshot = provider.get_snapshot("688003")

    assert snapshot is not None
    assert snapshot.fundamental.pe_ttm == 31.4
    assert snapshot.fundamental.pb == 2.7
    assert snapshot.fundamental.roe == 12.6
    assert snapshot.fundamental.revenue_growth == 9.8
    assert snapshot.fundamental.profit_growth == 15.2
    assert snapshot.fundamental.industry_pe_percentile == 42
    assert snapshot.capital.main_inflow_million == 0


def test_akshare_provider_reports_partial_snapshot_sources():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRemoteStock())

    snapshot = provider.get_snapshot("688001")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert sources[0]["status"] == "online"
    assert "保守估算" in sources[0]["role"]
    assert "fundamental" in sources[0]["role"]
    assert "capital" in sources[0]["role"]


def test_akshare_provider_reports_error_after_snapshot_enrichment_failure():
    class FailingHistoryAkshare(FakeAkshareWithRemoteStock):
        def stock_zh_a_hist(self, symbol: str, period: str, adjust: str):
            raise RuntimeError("history unavailable")

    provider = AkshareMarketDataProvider(ak_module=FailingHistoryAkshare())

    snapshot = provider.get_snapshot("688001")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert sources[0]["status"] == "fallback"
    assert "history unavailable" in sources[0]["role"]


def test_akshare_provider_can_watch_remote_snapshot_stock(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRemoteStock(), state_store=store)

    added = provider.add_to_watchlist("688001")
    watchlist = provider.get_watchlist()

    assert added is True
    assert [stock.symbol for stock in watchlist] == ["688001"]
    assert "688001" in store.load_watchlist([])
