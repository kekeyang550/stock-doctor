from app.config import settings
from app.services.akshare_provider import AkshareMarketDataProvider
from app.services.market_data import MockMarketDataProvider
from app.services.providers import MarketDataProvider


def create_market_data_provider() -> MarketDataProvider:
    if settings.data_provider == "akshare":
        return AkshareMarketDataProvider()
    return MockMarketDataProvider()
