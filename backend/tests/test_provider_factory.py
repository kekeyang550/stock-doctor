from app.services.akshare_provider import AkshareMarketDataProvider


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
