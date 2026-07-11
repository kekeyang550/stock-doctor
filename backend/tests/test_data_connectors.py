from fastapi.testclient import TestClient

from app.main import create_app
from app.config import settings
from app.services.data_connectors import DataConnectorHealthService


client = TestClient(create_app())


def test_data_connector_health_reports_mock_and_planned_sources():
    health = DataConnectorHealthService().build_health()

    assert health.active_provider in {"mock", "akshare"}
    assert health.fallback_provider == "mock"
    names = {connector.name for connector in health.connectors}
    assert {"Mock A股样例库", "AKShare", "Tushare Pro"}.issubset(names)
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


def test_data_connector_health_uses_provider_source_status(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=FallbackAkshareProvider())
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert akshare.status == "fallback"
    assert "network unavailable" in akshare.message
    assert "确认网络" in akshare.next_action


def test_data_connector_health_surfaces_partial_provider_message(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=PartialAkshareProvider())
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert akshare.status == "online"
    assert "fundamental" in akshare.message
    assert "capital" in akshare.message


def test_data_connector_health_endpoint():
    response = client.get("/api/v1/system/data-connectors")

    assert response.status_code == 200
    payload = response.json()
    assert payload["fallback_provider"] == "mock"
    assert any(item["name"] == "AKShare" for item in payload["connectors"])
    assert all("next_action" in item for item in payload["connectors"])
