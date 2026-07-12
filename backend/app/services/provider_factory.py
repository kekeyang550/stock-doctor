from app.config import settings
from app.services.akshare_provider import AkshareMarketDataProvider
from app.services.eastmoney_provider import EastmoneyMarketDataProvider
from app.services.market_data import MockMarketDataProvider
from app.services.providers import MarketDataProvider


def create_market_data_provider() -> MarketDataProvider:
    if settings.data_provider == "eastmoney":
        return EastmoneyMarketDataProvider()
    if settings.data_provider == "akshare":
        return AkshareMarketDataProvider()
    return MockMarketDataProvider()
