from app.services.akshare_provider import AkshareMarketDataProvider
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


class FakeAkshareWithRemoteStock:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "688001", "名称": "华兴源创", "行业": "专用设备", "最新价": "32.5", "涨跌幅": "-1.2"},
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


def test_akshare_provider_can_watch_remote_snapshot_stock(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRemoteStock(), state_store=store)

    added = provider.add_to_watchlist("688001")
    watchlist = provider.get_watchlist()

    assert added is True
    assert [stock.symbol for stock in watchlist] == ["688001"]
    assert "688001" in store.load_watchlist([])
