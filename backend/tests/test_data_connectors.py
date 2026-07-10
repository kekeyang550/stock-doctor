from fastapi.testclient import TestClient

from app.main import create_app
from app.services.data_connectors import DataConnectorHealthService


client = TestClient(create_app())


def test_data_connector_health_reports_mock_and_planned_sources():
    health = DataConnectorHealthService().build_health()

    assert health.active_provider in {"mock", "akshare"}
    assert health.fallback_provider == "mock"
    names = {connector.name for connector in health.connectors}
    assert {"Mock A股样例库", "AKShare", "Tushare Pro"}.issubset(names)
    assert all(connector.last_checked_at for connector in health.connectors)


def test_data_connector_health_endpoint():
    response = client.get("/api/v1/system/data-connectors")

    assert response.status_code == 200
    payload = response.json()
    assert payload["fallback_provider"] == "mock"
    assert any(item["name"] == "AKShare" for item in payload["connectors"])
    assert all("next_action" in item for item in payload["connectors"])
