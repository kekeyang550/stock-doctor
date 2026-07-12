from fastapi.testclient import TestClient

from app.main import create_app
from app.config import settings
from app.services.data_connectors import DataConnectorHealthService


client = TestClient(create_app())


def test_data_connector_health_reports_mock_and_planned_sources():
    health = DataConnectorHealthService().build_health()

    assert health.active_provider in {"mock", "akshare", "eastmoney"}
    assert health.fallback_provider == "mock"
    assert health.cache_status is None
    assert health.runtime_config.request_timeout_seconds == settings.data_request_timeout_seconds
    assert health.runtime_config.cache_ttl_seconds == settings.data_cache_ttl_seconds
    assert health.runtime_config.freshness_stale_after_minutes == settings.data_freshness_stale_after_minutes
    names = {connector.name for connector in health.connectors}
    assert {"Mock A股样例库", "东方财富", "腾讯行情", "新浪资金流", "通达信本地日线", "AKShare", "Tushare Pro"}.issubset(names)
    assert all(connector.last_checked_at for connector in health.connectors)


class FallbackAkshareProvider:
    def get_data_sources(self):
        return [
            {
                "name": "AKShare",
                "status": "fallback",
                "role": "行情、指数、板块、资金流；network unavailable",
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "稳定回退"},
        ]


class PartialAkshareProvider:
    def get_data_sources(self):
        return [
            {
                "name": "AKShare",
                "status": "online",
                "role": "行情可用；fundamental、capital 使用保守估算。",
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "稳定回退"},
        ]


class CacheReportingProvider:
    def get_data_sources(self):
        return [
            {
                "name": "AKShare",
                "status": "online",
                "role": "行情列表和历史行情缓存可用。",
            },
        ]

    def get_cache_status(self):
        return {
            "ttl_seconds": 300,
            "generated_at": "2026-07-10T06:00:00Z",
            "buckets": [
                {
                    "key": "stock_list",
                    "label": "股票列表",
                    "entries": 1,
                    "active_entries": 1,
                    "expired_entries": 0,
                    "nearest_expires_in_seconds": 240,
                    "status": "active",
                },
                {
                    "key": "snapshots",
                    "label": "行情快照",
                    "entries": 3,
                    "active_entries": 2,
                    "expired_entries": 1,
                    "nearest_expires_in_seconds": 80,
                    "status": "partial",
                },
            ],
        }


class EastmoneyProvider:
    def get_data_sources(self):
        return [
            {
                "name": "东方财富",
                "status": "online",
                "role": "A 股行情、指数、历史 K 线；直连可用。",
            },
            {
                "name": "通达信本地日线",
                "status": "online",
                "role": "本地历史 K 线参考/兜底；最新交易日 2026-07-10。",
            },
            {
                "name": "新浪资金流",
                "status": "online",
                "role": "东方财富资金流接口不可用时的个股资金流备用源。",
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "稳定回退"},
        ]


def test_data_connector_health_uses_provider_source_status(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=FallbackAkshareProvider())
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert akshare.status == "fallback"
    assert "network unavailable" in akshare.message
    assert "确认网络" in akshare.next_action


def test_data_connector_health_surfaces_eastmoney_provider(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "eastmoney")

    health = DataConnectorHealthService().build_health(provider=EastmoneyProvider())
    eastmoney = next(connector for connector in health.connectors if connector.name == "东方财富")
    sina = next(connector for connector in health.connectors if connector.name == "新浪资金流")
    tdx = next(connector for connector in health.connectors if connector.name == "通达信本地日线")
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert eastmoney.active is True
    assert eastmoney.status == "online"
    assert "直连可用" in eastmoney.message
    assert sina.active is True
    assert sina.status == "online"
    assert "资金流" in sina.message
    assert tdx.active is True
    assert tdx.status == "online"
    assert "2026-07-10" in tdx.message
    assert akshare.active is False
    assert akshare.status == "fallback"


def test_data_connector_health_surfaces_partial_provider_message(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=PartialAkshareProvider())
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert akshare.status == "online"
    assert "fundamental" in akshare.message
    assert "capital" in akshare.message


def test_data_connector_health_surfaces_provider_cache_status(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=CacheReportingProvider())

    assert health.cache_status is not None
    assert health.cache_status.ttl_seconds == 300
    assert [bucket.label for bucket in health.cache_status.buckets] == ["股票列表", "行情快照"]
    assert health.cache_status.buckets[1].status == "partial"


def test_data_connector_health_endpoint():
    response = client.get("/api/v1/system/data-connectors")

    assert response.status_code == 200
    payload = response.json()
    assert payload["fallback_provider"] == "mock"
    assert payload["runtime_config"]["request_timeout_seconds"] == settings.data_request_timeout_seconds
    assert payload["runtime_config"]["cache_ttl_seconds"] == settings.data_cache_ttl_seconds
    assert payload["runtime_config"]["freshness_stale_after_minutes"] == settings.data_freshness_stale_after_minutes
    assert payload["cache_status"]["ttl_seconds"] == settings.data_cache_ttl_seconds
    assert [bucket["label"] for bucket in payload["cache_status"]["buckets"]] == ["股票列表", "行情快照", "历史行情"]
    assert any(item["name"] == "东方财富" for item in payload["connectors"])
    assert any(item["name"] == "通达信本地日线" for item in payload["connectors"])
    assert any(item["name"] == "AKShare" for item in payload["connectors"])
    assert all("next_action" in item for item in payload["connectors"])
