import struct
from datetime import date, timedelta

from app.services.akshare_provider import AkshareMarketDataProvider
from app.services.eastmoney_provider import EastmoneyMarketDataProvider
from app.services.local_stock_directory import LocalStockDirectoryProvider
from app.services.market_data import MockMarketDataProvider
from app.services.provider_factory import create_market_data_provider
from app.services.storage import JsonStateStore
from app.services.tdx_local_provider import TdxLocalHistoryProvider
import app.services.tushare_provider as tushare_provider
from app.services.tushare_provider import TushareMarketDataProvider
from app.config import settings


class FakeTushareModule:
    def __init__(self):
        self.client = FakeTushareClient()
        self.pro_bar_calls = []
        self.tokens = []

    def pro_api(self, token: str):
        self.client.token = token
        return self.client

    def set_token(self, token: str):
        self.tokens.append(token)

    def pro_bar(self, ts_code: str, adj: str, freq: str):
        self.pro_bar_calls.append({"ts_code": ts_code, "adj": adj, "freq": freq})
        return [
            {"trade_date": "20260712", "close": "19.8", "vol": "1000"},
            {"trade_date": "20260710", "close": "18.5", "vol": "900"},
            {"trade_date": "20260711", "close": "19.1", "vol": "950"},
        ]


class FakeTushareClient:
    def __init__(self):
        self.token = ""
        self.stock_basic_calls = []

    def daily_basic(self, ts_code: str, fields: str):
        return [
            {
                "ts_code": ts_code,
                "trade_date": "20260710",
                "pe_ttm": "18.4",
                "pb": "2.3",
                "turnover_rate": "0.8",
            }
        ]

    def daily(self, ts_code: str):
        return [
            {"trade_date": "20260712", "close": "19.2", "vol": "1000"},
            {"trade_date": "20260710", "close": "18.1", "vol": "900"},
            {"trade_date": "20260711", "close": "18.8", "vol": "950"},
        ]

    def fina_indicator(self, ts_code: str, fields: str):
        return [
            {
                "ts_code": ts_code,
                "end_date": "20260331",
                "roe_dt": "16.2",
                "revenue_yoy": "11.5",
                "netprofit_yoy": "13.7",
                "eps": "2.18",
                "grossprofit_margin": "38.4",
                "debt_to_assets": "41.6",
                "ocfps": "3.21",
                "ocf_to_profit": "92.5",
                "current_ratio": "1.86",
                "quick_ratio": "1.22",
                "netprofit_margin": "18.6",
                "assets_turn": "0.72",
                "saleexp_to_gr": "7.5",
                "adminexp_of_gr": "6.8",
                "finaexp_of_gr": "2.1",
                "assets_to_eqt": "1.8",
            }
        ]

    def stock_basic(self, ts_code: str, fields: str):
        self.stock_basic_calls.append({"ts_code": ts_code, "fields": fields})
        return [
            {
                "ts_code": ts_code,
                "name": "茅台测试",
                "industry": "食品饮料",
            }
        ]


class FailingTushareModule:
    def __init__(self):
        self.client = FailingTushareClient()

    def pro_api(self, token: str):
        self.client.token = token
        return self.client

    def pro_bar(self, ts_code: str, adj: str, freq: str):
        raise RuntimeError("pro_bar unavailable")


class FailingTushareClient:
    def __init__(self):
        self.token = ""

    def daily_basic(self, ts_code: str, fields: str):
        raise RuntimeError("daily_basic unavailable")

    def fina_indicator(self, ts_code: str, fields: str):
        raise RuntimeError("fina_indicator unavailable")

    def stock_basic(self, ts_code: str, fields: str):
        raise RuntimeError("stock_basic unavailable")


class QfqFailingTushareModule(FakeTushareModule):
    def pro_bar(self, ts_code: str, adj: str, freq: str):
        raise OSError("ERROR.")


def test_akshare_provider_falls_back_without_package():
    provider = AkshareMarketDataProvider()

    stocks = provider.list_stocks()
    sources = provider.get_data_sources()

    assert len(stocks) > 0
    assert any(source["name"] == "AKShare" for source in sources)


def test_tushare_provider_safely_falls_back_without_token(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "")
    provider = TushareMarketDataProvider(ts_module=object())

    stocks = provider.list_stocks()
    sources = provider.get_data_sources()

    assert len(stocks) > 0
    tushare = next(source for source in sources if source["name"] == "Tushare Pro")
    assert tushare["status"] == "fallback"
    assert "等待 STOCK_DOCTOR_TUSHARE_TOKEN" in tushare["role"]


def test_provider_factory_can_create_tushare_fallback_provider(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "tushare")

    provider = create_market_data_provider()

    assert isinstance(provider, TushareMarketDataProvider)
    assert provider.get_snapshot("600519") is not None


def test_tushare_provider_enriches_fundamental_snapshot(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    module = FakeTushareModule()
    provider = TushareMarketDataProvider(ts_module=module)

    snapshot = provider.get_snapshot("600519")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert module.client.token == "test-token"
    assert snapshot.fundamental.pe_ttm == 18.4
    assert snapshot.fundamental.pb == 2.3
    assert snapshot.fundamental.roe == 16.2
    assert snapshot.fundamental.revenue_growth == 11.5
    assert snapshot.fundamental.profit_growth == 13.7
    assert snapshot.fundamental.eps == 2.18
    assert snapshot.fundamental.gross_margin == 38.4
    assert snapshot.fundamental.debt_to_assets == 41.6
    assert snapshot.fundamental.operating_cashflow_per_share == 3.21
    assert snapshot.fundamental.cashflow_to_profit == 92.5
    assert snapshot.fundamental.current_ratio == 1.86
    assert snapshot.fundamental.quick_ratio == 1.22
    assert snapshot.fundamental.net_margin == 18.6
    assert snapshot.fundamental.asset_turnover == 0.72
    assert snapshot.fundamental.selling_expense_ratio == 7.5
    assert snapshot.fundamental.admin_expense_ratio == 6.8
    assert snapshot.fundamental.financial_expense_ratio == 2.1
    assert snapshot.fundamental.equity_multiplier == 1.8
    assert snapshot.name == "茅台测试"
    assert snapshot.industry == "食品饮料"
    assert "tushare-daily-basic" in snapshot.data_sources
    assert "tushare-fina-indicator" in snapshot.data_sources
    assert "tushare-stock-basic" in snapshot.data_sources
    assert module.client.stock_basic_calls[0]["ts_code"] == "600519.SH"
    tushare = next(source for source in sources if source["name"] == "Tushare Pro")
    assert tushare["status"] == "online"
    assert "财务基础指标" in tushare["role"]
    assert "基础资料" in tushare["role"]


def test_tushare_provider_returns_adjusted_price_history(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    module = FakeTushareModule()
    provider = TushareMarketDataProvider(ts_module=module)

    bars = provider.get_price_history("600519", days=2)
    sources = provider.get_data_sources()

    assert module.pro_bar_calls == [{"ts_code": "600519.SH", "adj": "qfq", "freq": "D"}]
    assert [bar.date for bar in bars] == ["2026-07-11", "2026-07-12"]
    assert [bar.close for bar in bars] == [19.1, 19.8]
    assert [bar.volume for bar in bars] == [950, 1000]
    assert module.tokens == ["test-token"]
    tushare = next(source for source in sources if source["name"] == "Tushare Pro")
    assert tushare["status"] == "online"
    assert "前复权日线" in tushare["role"]


def test_tushare_provider_probe_reports_ready_steps(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    module = FakeTushareModule()
    provider = TushareMarketDataProvider(ts_module=module)

    result = provider.probe_connectivity("600519")

    assert result.status == "pass"
    assert result.package_installed is True
    assert result.token_configured is True
    assert result.duration_ms is not None
    assert result.duration_ms >= 0
    assert {step.key for step in result.steps} == {
        "package",
        "token",
        "client",
        "stock_basic",
        "daily_basic",
        "fina_indicator",
        "pro_bar",
    }
    assert all(step.status == "pass" for step in result.steps)
    assert all(step.duration_ms is not None and step.duration_ms >= 0 for step in result.steps)
    assert {step.key: step.row_count for step in result.steps}["stock_basic"] == 1
    assert {step.key: step.row_count for step in result.steps}["daily_basic"] == 1
    assert {step.key: step.row_count for step in result.steps}["fina_indicator"] == 1
    assert {step.key: step.row_count for step in result.steps}["pro_bar"] == 3
    assert module.client.token == "test-token"
    assert module.tokens == ["test-token", "test-token"]


def test_tushare_provider_probe_uses_daily_history_when_qfq_is_limited(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    provider = TushareMarketDataProvider(ts_module=QfqFailingTushareModule())

    result = provider.probe_connectivity("600519")

    pro_bar_step = next(step for step in result.steps if step.key == "pro_bar")
    assert result.status == "warn"
    assert pro_bar_step.status == "warn"
    assert pro_bar_step.row_count == 3
    assert "未复权 daily 日线验证通过" in pro_bar_step.detail


def test_tushare_provider_uses_daily_history_when_qfq_history_fails(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    module = QfqFailingTushareModule()
    provider = TushareMarketDataProvider(ts_module=module)

    bars = provider.get_price_history("600519", days=2)
    sources = provider.get_data_sources()

    assert [bar.date for bar in bars] == ["2026-07-11", "2026-07-12"]
    assert [bar.close for bar in bars] == [18.8, 19.2]
    tushare = next(source for source in sources if source["name"] == "Tushare Pro")
    assert tushare["status"] == "online"
    assert "日线" in tushare["role"]


def test_tushare_provider_probe_reports_failures_without_token_leak(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "secret-token")
    provider = TushareMarketDataProvider(ts_module=FailingTushareModule())

    result = provider.probe_connectivity("600519")

    assert result.status == "fail"
    assert result.token_configured is True
    assert "secret-token" not in result.model_dump_json()
    assert any(step.key == "stock_basic" and step.status == "fail" for step in result.steps)
    assert any(step.key == "pro_bar" and step.status == "fail" for step in result.steps)
    assert all(step.duration_ms is not None for step in result.steps)


def test_tushare_provider_probe_points_to_real_data_extra_when_package_missing(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "")
    monkeypatch.setattr(tushare_provider, "find_spec", lambda package: None)
    provider = TushareMarketDataProvider()

    result = provider.probe_connectivity("600519")

    assert result.status == "fail"
    assert result.package_installed is False
    assert result.duration_ms is not None
    assert 'pip install -e ".[real-data]"' in result.next_action


def test_tushare_provider_reports_api_failures_without_breaking_fallback(monkeypatch):
    monkeypatch.setattr(settings, "tushare_token", "test-token")
    provider = TushareMarketDataProvider(ts_module=FailingTushareModule())

    snapshot = provider.get_snapshot("600519")
    sources = provider.get_data_sources()
    bars = provider.get_price_history("600519", days=2)
    sources_after_history = provider.get_data_sources()

    assert snapshot is not None
    assert snapshot.name != ""
    tushare = next(source for source in sources if source["name"] == "Tushare Pro")
    assert tushare["status"] == "fallback"
    assert "stock_basic 调用失败" in tushare["role"]
    assert len(bars) == 2
    tushare_after_history = next(source for source in sources_after_history if source["name"] == "Tushare Pro")
    assert tushare_after_history["status"] == "fallback"
    assert "pro_bar 前复权日线调用失败" in tushare_after_history["role"]


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


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeTextResponse:
    def __init__(self, text):
        self.text = text
        self.encoding = "utf-8"

    def raise_for_status(self):
        return None


class FakeEastmoneySession:
    def __init__(self):
        self.trust_env = True
        self.urls = []

    def get(self, url, params=None, timeout=None, headers=None):
        self.urls.append(url)
        if "qt.gtimg.cn" in url:
            requested_symbol = "600519" if "600519" in url else "600036"
            fields = ["0"] * 90
            fields[1] = "贵州茅台" if requested_symbol == "600519" else "CMB Bank"
            fields[2] = requested_symbol
            fields[3] = "1288.8" if requested_symbol == "600519" else "42.18"
            fields[32] = "1.2" if requested_symbol == "600519" else "0.85"
            fields[38] = "0.38"
            fields[46] = "0.84"
            fields[52] = "6.14"
            return FakeTextResponse(f'v_sh{requested_symbol}="{"~".join(fields)}";')
        if "stock/fflow/daykline/get" in url:
            return FakeResponse(
                {
                    "data": {
                        "klines": [
                            "2026-05-30,-114420576.0,114798976.0,-378400.0,-199498704.0,85078128.0"
                        ]
                    }
                }
            )
        if "MoneyFlow.ssl_qsfx_zjlrqs" in url:
            return FakeResponse(
                [
                    {
                        "opendate": "2026-07-10",
                        "trade": "42.18",
                        "turnover": "2110925671.0000",
                        "netamount": "57699684.6000",
                        "r0_net": "3722838.2700",
                        "r0_ratio": "0.18",
                    }
                ]
            )
        if "stock/get" in url:
            symbol = str(params.get("secid", "")).split(".")[-1] if params else "600036"
            return FakeResponse(
                {
                    "data": {
                        "f57": symbol,
                        "f58": "CMB Bank" if symbol == "600036" else symbol,
                        "f162": 6.14,
                        "f167": 0.84,
                        "f168": 0.38,
                        "f184": 3.81,
                        "f185": 1.52,
                    }
                }
            )
        if "clist/get" in url:
            return FakeResponse(
                {
                    "data": {
                        "diff": [
                            {"f12": "600519", "f14": "贵州茅台", "f2": 1288.8, "f3": 1.2, "f100": "白酒"},
                            {"f12": "300750", "f14": "宁德时代", "f2": 214.5, "f3": -0.8, "f100": "电池"},
                        ]
                    }
                }
            )
        if "ulist.np/get" in url:
            return FakeResponse({"data": {"diff": [{"f12": "000300", "f14": "沪深300", "f2": 4216.38, "f3": 0.72}]}})
        if "kline/get" in url:
            start = date(2026, 4, 1)
            return FakeResponse(
                {
                    "data": {
                        "klines": [
                            f"{(start + timedelta(days=index)).isoformat()},{10 + index * 0.08:.2f},"
                            f"{10 + index * 0.1:.2f},{10 + index * 0.11:.2f},{10 + index * 0.07:.2f},"
                            f"{1000 + index * 10},1200000,1.1,0.2,0.02,1.5"
                            for index in range(60)
                        ]
                    }
                }
            )
        return FakeResponse({})


class FailingEastmoneyDetailSession(FakeEastmoneySession):
    def get(self, url, params=None, timeout=None, headers=None):
        if "stock/get" in url:
            raise RuntimeError("quote detail unavailable")
        return super().get(url, params=params, timeout=timeout, headers=headers)


class FailingEastmoneyFundFlowSession(FakeEastmoneySession):
    def get(self, url, params=None, timeout=None, headers=None):
        if "stock/fflow/daykline/get" in url:
            raise RuntimeError("eastmoney fund flow unavailable")
        return super().get(url, params=params, timeout=timeout, headers=headers)


class EmptyEastmoneyFundFlowSession(FakeEastmoneySession):
    def get(self, url, params=None, timeout=None, headers=None):
        if "stock/fflow/daykline/get" in url:
            return FakeResponse({"data": None})
        return super().get(url, params=params, timeout=timeout, headers=headers)


class EmptyEastmoneyKlineSession(FakeEastmoneySession):
    def get(self, url, params=None, timeout=None, headers=None):
        if url == EastmoneyMarketDataProvider._KLINE_URL:
            return FakeResponse({"data": None})
        return super().get(url, params=params, timeout=timeout, headers=headers)


def write_tdx_day_file(vipdoc_path, symbol: str, rows: list[tuple[int, float, float, float, float, float, int]]):
    market = "sh" if symbol.startswith(("5", "6", "9")) else "sz"
    folder = vipdoc_path / market / "lday"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{market}{symbol}.day"
    payload = b"".join(
        struct.pack(
            "<IIIIIfII",
            trade_date,
            round(open_price * 100),
            round(high * 100),
            round(low * 100),
            round(close * 100),
            amount,
            volume,
            0,
        )
        for trade_date, open_price, high, low, close, amount, volume in rows
    )
    path.write_bytes(payload)
    return path


def write_ths_stockname_file(path):
    path.write_text(
        "\n".join(
            [
                "[name_16_16]",
                "ConfigVer=20260712_test",
                "600036=招商银行|招商银行@f",
                "600519=贵州茅台|贵州茅台@f",
                "751074=招商银行|招商银行@f",
            ]
        ),
        encoding="gbk",
    )
    return path


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


def test_mock_provider_accepts_common_market_code_formats():
    provider = MockMarketDataProvider()

    snapshot = provider.get_snapshot("600519.SH")
    watchlist = provider.replace_watchlist(["SH600519", "sz000001"])

    assert snapshot is not None
    assert snapshot.symbol == "600519"
    assert [stock.symbol for stock in watchlist] == ["600519", "000001"]


def test_mock_provider_reports_cache_status_for_default_data():
    provider = MockMarketDataProvider()

    cold = provider.get_cache_status()
    provider.list_stocks()
    provider.get_snapshot("600519")
    provider.get_snapshot("NOPE")
    provider.get_price_history("600519", days=10)
    warm = provider.get_cache_status()

    assert [bucket["key"] for bucket in cold["buckets"]] == ["stock_list", "snapshots", "history"]
    assert {bucket["key"]: bucket["entries"] for bucket in warm["buckets"]} == {
        "stock_list": 1,
        "snapshots": 4,
        "history": 1,
    }
    assert {bucket["key"]: bucket["hit_count"] for bucket in warm["buckets"]} == {
        "stock_list": 1,
        "snapshots": 2,
        "history": 1,
    }
    assert {bucket["key"]: bucket["miss_count"] for bucket in warm["buckets"]} == {
        "stock_list": 0,
        "snapshots": 1,
        "history": 0,
    }
    assert {bucket["key"]: bucket["hit_rate_pct"] for bucket in warm["buckets"]} == {
        "stock_list": 100,
        "snapshots": 66.7,
        "history": 100,
    }


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


def test_eastmoney_provider_normalizes_live_stock_list():
    session = FakeEastmoneySession()
    provider = EastmoneyMarketDataProvider(session=session)

    stocks = provider.list_stocks()

    assert session.trust_env is False
    assert [stock.symbol for stock in stocks] == ["300750", "600519"]
    assert stocks[1].name == "贵州茅台"
    assert stocks[1].last_price == 1288.8
    assert stocks[1].industry == "白酒"


def test_eastmoney_provider_builds_snapshot_from_history():
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession())

    snapshot = provider.get_snapshot("600519")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert snapshot.symbol == "600519"
    assert snapshot.as_of == "2026-05-30"
    assert snapshot.last_price == 15.9
    assert snapshot.technical.ma5 == 15.7
    assert snapshot.technical.ma20 == 14.95
    assert snapshot.capital.turnover_rate == 1.5
    assert sources[0]["name"] == "东方财富"
    assert sources[0]["status"] == "online"
    assert "fundamental" in sources[0]["role"]


def test_eastmoney_provider_exposes_real_price_history_rows():
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession())

    bars = provider.get_price_history("600519", days=10)

    assert len(bars) == 10
    assert bars[0].date == "2026-05-21"
    assert bars[-1].date == "2026-05-30"
    assert bars[-1].close == 15.9
    assert bars[-1].volume == 1590


def test_eastmoney_provider_accepts_common_market_code_formats():
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession())

    snapshot = provider.get_snapshot("SH600519")
    bars = provider.get_price_history("600519.SH", days=2)
    results = provider.search_stocks("sh600519")

    assert snapshot is not None
    assert snapshot.symbol == "600519"
    assert len(bars) == 2
    assert bars[-1].close == 15.9
    assert results[0].symbol == "600519"


def test_eastmoney_provider_builds_market_overview():
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession())

    overview = provider.get_market_overview()

    assert overview.index_name == "沪深300"
    assert overview.index_level == 4216.38
    assert overview.index_change_pct == 0.72
    assert overview.advancing == 1
    assert overview.declining == 1
    assert overview.hot_industries[0] == "白酒"


def test_eastmoney_provider_searches_direct_a_share_code_from_tencent():
    provider = EastmoneyMarketDataProvider(
        session=FakeEastmoneySession(),
        stock_directory=LocalStockDirectoryProvider(stockname_paths=[]),
    )

    results = provider.search_stocks("600036")

    assert results
    assert results[0].symbol == "600036"
    assert results[0].name == "CMB Bank"
    assert results[0].last_price == 42.18
    assert results[0].change_pct == 0.85


def test_local_stock_directory_reads_ths_stockname_file(tmp_path):
    path = write_ths_stockname_file(tmp_path / "stockname_16_0.txt")
    directory = LocalStockDirectoryProvider(stockname_paths=[path])

    results = directory.search("招商", limit=5)
    source = directory.get_data_source()

    assert [entry.symbol for entry in results] == ["600036"]
    assert results[0].name == "招商银行"
    assert source["status"] == "online"
    assert "已加载" in source["role"]


def test_eastmoney_provider_searches_local_stock_directory_by_name(tmp_path):
    path = write_ths_stockname_file(tmp_path / "stockname_16_0.txt")
    directory = LocalStockDirectoryProvider(stockname_paths=[path])
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession(), stock_directory=directory)

    results = provider.search_stocks("招商")
    sources = provider.get_data_sources()

    assert results
    assert results[0].symbol == "600036"
    assert results[0].name == "招商银行"
    assert any(source["name"] == "同花顺本地股票名表" and source["status"] == "online" for source in sources)


def test_eastmoney_provider_can_watch_direct_search_stock(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = EastmoneyMarketDataProvider(
        session=FakeEastmoneySession(),
        state_store=store,
        stock_directory=LocalStockDirectoryProvider(stockname_paths=[]),
    )

    added = provider.add_to_watchlist("600036")
    snapshot = provider.get_snapshot("600036")
    watchlist = provider.get_watchlist()

    assert added is True
    assert snapshot is not None
    assert snapshot.symbol == "600036"
    assert snapshot.name == "CMB Bank"
    assert snapshot.as_of == "2026-05-30"
    assert snapshot.fundamental.pe_ttm == 6.14
    assert snapshot.fundamental.pb == 0.84
    assert snapshot.fundamental.roe == 13.7
    assert snapshot.fundamental.revenue_growth == 3.81
    assert snapshot.fundamental.profit_growth == 1.52
    assert snapshot.capital.main_inflow_million == -114.4
    assert snapshot.capital.turnover_rate == 1.5
    assert any(stock.symbol == "600036" for stock in watchlist)
    assert "600036" in store.load_watchlist([])


def test_eastmoney_provider_uses_sina_fund_flow_fallback(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = EastmoneyMarketDataProvider(
        session=FailingEastmoneyFundFlowSession(),
        state_store=store,
        stock_directory=LocalStockDirectoryProvider(stockname_paths=[]),
    )

    snapshot = provider.get_snapshot("600036")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert snapshot.capital.main_inflow_million == 3.7
    assert snapshot.capital.turnover_rate == 1.5
    assert "sina-capital-flow" in sources[0]["role"]
    assert "capital-flow" in sources[0]["role"]


def test_eastmoney_provider_handles_null_fund_flow_payload(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = EastmoneyMarketDataProvider(
        session=EmptyEastmoneyFundFlowSession(),
        state_store=store,
        stock_directory=LocalStockDirectoryProvider(stockname_paths=[]),
    )

    snapshot = provider.get_snapshot("600036")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert snapshot.capital.main_inflow_million == 3.7
    assert "sina-capital-flow" in sources[0]["role"]


def test_eastmoney_provider_uses_tencent_quote_detail_fallback(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = EastmoneyMarketDataProvider(
        session=FailingEastmoneyDetailSession(),
        state_store=store,
        stock_directory=LocalStockDirectoryProvider(stockname_paths=[]),
    )

    snapshot = provider.get_snapshot("600036")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert snapshot.fundamental.pe_ttm == 6.14
    assert snapshot.fundamental.pb == 0.84
    assert snapshot.fundamental.roe == 13.7
    assert snapshot.fundamental.revenue_growth == 6
    assert snapshot.fundamental.profit_growth == 6
    assert snapshot.capital.turnover_rate == 1.5
    assert "tencent-quote-detail" in sources[0]["role"]
    assert "growth" in sources[0]["role"]


def test_eastmoney_provider_reports_cache_status_buckets():
    now = 1000.0
    provider = EastmoneyMarketDataProvider(session=FakeEastmoneySession(), cache_ttl_seconds=10, clock=lambda: now)

    cold = provider.get_cache_status()
    provider.list_stocks()
    provider.list_stocks()
    provider.get_snapshot("600519")
    provider.get_snapshot("600519")
    provider.get_price_history("600519", days=10)
    warm = provider.get_cache_status()

    assert [bucket["key"] for bucket in cold["buckets"]] == ["stock_list", "snapshots", "history"]
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


def test_tdx_local_history_provider_reads_day_file(tmp_path):
    write_tdx_day_file(
        tmp_path,
        "600519",
        [
            (20260708, 1188.77, 1200.98, 1177.00, 1199.30, 3_071_933_440.0, 2_577_602),
            (20260709, 1191.00, 1191.99, 1178.00, 1182.19, 4_035_216_896.0, 3_409_634),
            (20260710, 1182.20, 1204.98, 1170.28, 1204.98, 6_223_343_616.0, 5_221_255),
        ],
    )
    provider = TdxLocalHistoryProvider(vipdoc_path=tmp_path)

    bars = provider.get_price_history("600519", days=2)
    source = provider.get_data_source(["600519"])

    assert [bar.date for bar in bars] == ["2026-07-09", "2026-07-10"]
    assert bars[-1].close == 1204.98
    assert bars[-1].volume == 5_221_255
    assert source["name"] == "通达信本地日线"
    assert source["status"] == "online"
    assert "2026-07-10" in source["role"]


def test_tdx_local_history_provider_auto_discovers_vipdoc_when_configured_path_is_missing(tmp_path, monkeypatch):
    discovered = tmp_path / "股票" / "新建文件夹" / "vipdoc"
    write_tdx_day_file(
        discovered,
        "600519",
        [
            (20260708, 1188.77, 1200.98, 1177.00, 1199.30, 3_071_933_440.0, 2_577_602),
            (20260709, 1191.00, 1191.99, 1178.00, 1182.19, 4_035_216_896.0, 3_409_634),
            (20260710, 1182.20, 1204.98, 1170.28, 1204.98, 6_223_343_616.0, 5_221_255),
        ],
    )
    monkeypatch.setattr(TdxLocalHistoryProvider, "_COMMON_ROOTS", (tmp_path / "股票",))
    monkeypatch.setattr(TdxLocalHistoryProvider, "_DISCOVERY_CACHE", None)
    monkeypatch.setattr(TdxLocalHistoryProvider, "_DISCOVERY_DONE", False)

    provider = TdxLocalHistoryProvider(vipdoc_path=tmp_path / "missing" / "vipdoc")
    bars = provider.get_price_history("600519", days=1)
    status = provider.describe(["600519"])
    source = provider.get_data_source(["600519"])

    assert bars[-1].date == "2026-07-10"
    assert status["auto_discovered"] is True
    assert status["path"] == str(discovered)
    assert "已自动使用" in source["role"]


def test_tdx_local_history_provider_accepts_install_directory_with_vipdoc_child(tmp_path):
    install_dir = tmp_path / "new_tdx"
    vipdoc = install_dir / "vipdoc"
    write_tdx_day_file(
        vipdoc,
        "600519",
        [
            (20260709, 1191.00, 1191.99, 1178.00, 1182.19, 4_035_216_896.0, 3_409_634),
            (20260710, 1182.20, 1204.98, 1170.28, 1204.98, 6_223_343_616.0, 5_221_255),
        ],
    )

    provider = TdxLocalHistoryProvider(vipdoc_path=install_dir)
    bars = provider.get_price_history("600519", days=1)
    status = provider.describe(["600519"])

    assert bars[-1].date == "2026-07-10"
    assert status["configured_path"] == str(install_dir)
    assert status["path"] == str(vipdoc)
    assert status["auto_discovered"] is True
    assert provider.probe_vipdoc().resolved_path == str(vipdoc)


def test_tdx_local_history_provider_reads_uppercase_day_filename(tmp_path):
    path = write_tdx_day_file(
        tmp_path,
        "600519",
        [(20260710, 1182.20, 1204.98, 1170.28, 1204.98, 6_223_343_616.0, 5_221_255)],
    )
    uppercase_path = path.with_name(path.name.upper())
    path.rename(uppercase_path)

    provider = TdxLocalHistoryProvider(vipdoc_path=tmp_path)

    assert provider.get_price_history("600519", days=1)[-1].close == 1204.98


def test_tdx_local_history_provider_does_not_use_stale_history(tmp_path):
    write_tdx_day_file(
        tmp_path,
        "600519",
        [(20130321, 15.60, 15.80, 15.50, 15.80, 1000.0, 1580)],
    )
    provider = TdxLocalHistoryProvider(vipdoc_path=tmp_path)

    bars = provider.get_price_history("600519", days=1)
    status = provider.describe(["600519"])
    source = provider.get_data_source(["600519"])

    assert bars == []
    assert status["usable_count"] == 0
    assert status["stale_count"] == 1
    assert source["status"] == "fallback"
    assert "已过期" in source["role"]


def test_tdx_local_history_provider_probe_lists_candidates(tmp_path, monkeypatch):
    discovered = tmp_path / "stocks" / "vipdoc"
    write_tdx_day_file(
        discovered,
        "600519",
        [(20260710, 15.60, 15.80, 15.50, 15.80, 1000.0, 1580)],
    )
    monkeypatch.setattr(TdxLocalHistoryProvider, "_COMMON_ROOTS", (tmp_path / "stocks",))
    monkeypatch.setattr(TdxLocalHistoryProvider, "_DISCOVERY_CACHE", None)
    monkeypatch.setattr(TdxLocalHistoryProvider, "_DISCOVERY_DONE", False)
    provider = TdxLocalHistoryProvider(vipdoc_path=tmp_path / "missing")

    probe = provider.probe_vipdoc()

    assert probe.status == "pass"
    assert probe.resolved_path == str(discovered)
    selected = next(candidate for candidate in probe.candidates if candidate.selected)
    assert selected.path == str(discovered)
    assert selected.sample_count == 1
    assert selected.stale is False


def test_eastmoney_provider_reports_tdx_reference_source(tmp_path):
    write_tdx_day_file(
        tmp_path,
        "600519",
        [
            (20260709, 15.60, 15.80, 15.50, 15.80, 1000.0, 1580),
            (20260710, 15.80, 16.00, 15.70, 15.90, 1000.0, 1590),
        ],
    )
    provider = EastmoneyMarketDataProvider(
        session=FakeEastmoneySession(),
        tdx_provider=TdxLocalHistoryProvider(vipdoc_path=tmp_path),
    )

    bars = provider.get_price_history("600519", days=10)
    sources = provider.get_data_sources()

    assert bars[-1].date == "2026-05-30"
    tdx = next(source for source in sources if source["name"] == "通达信本地日线")
    assert tdx["status"] == "online"
    assert "最近校验" in tdx["role"]


def test_eastmoney_provider_falls_back_to_tdx_when_kline_payload_is_empty(tmp_path):
    write_tdx_day_file(
        tmp_path,
        "600519",
        [
            (
                int((date(2026, 6, 1) + timedelta(days=index)).strftime("%Y%m%d")),
                20 + index * 0.1,
                20.4 + index * 0.1,
                19.8 + index * 0.1,
                20.2 + index * 0.1,
                1_000_000.0 + index,
                1000 + index,
            )
            for index in range(30)
        ],
    )
    provider = EastmoneyMarketDataProvider(
        session=EmptyEastmoneyKlineSession(),
        tdx_provider=TdxLocalHistoryProvider(vipdoc_path=tmp_path),
    )

    snapshot = provider.get_snapshot("600519")
    bars = provider.get_price_history("600519", days=2)
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert bars[-1].date == "2026-06-30"
    assert bars[-1].close == 23.1
    assert "tdx-kline" in sources[0]["role"]
