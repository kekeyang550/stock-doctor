from datetime import date

from app.schemas.diagnosis import CapitalSnapshot, RiskSnapshot, StockSnapshot, TechnicalSnapshot
from app.services.data_quality import DataQualityService
from app.services.market_data import MockMarketDataProvider


def test_data_quality_report_passes_for_complete_mock_snapshot():
    snapshot = MockMarketDataProvider().get_snapshot("600519").model_copy(update={"as_of": date.today().isoformat()})

    report = DataQualityService().build_report(snapshot)

    assert report.status == "pass"
    assert report.score == 100
    assert report.coverage_pct == 100
    assert {check.key for check in report.checks} == {
        "market",
        "technical",
        "fundamental",
        "capital",
        "risk",
        "as_of",
    }


def test_data_quality_report_flags_invalid_fields():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "last_price": -1,
            "technical": TechnicalSnapshot.model_construct(
                ma5=0,
                ma20=1478.4,
                ma60=1439.7,
                rsi14=120,
                macd=8.4,
                volume_ratio=-0.2,
            ),
            "capital": CapitalSnapshot(main_inflow_million=0, northbound_inflow_million=0, turnover_rate=0.42),
            "risk": RiskSnapshot.model_construct(
                pledge_ratio=120,
                unlock_days=-1,
                st_flag=False,
                limit_up_streak=-1,
            ),
        }
    )

    report = DataQualityService().build_report(snapshot)

    assert report.status == "fail"
    assert report.score < 70
    failing_keys = {check.key for check in report.checks if check.status == "fail"}
    assert {"market", "technical", "risk"}.issubset(failing_keys)
    assert any(check.key == "capital" and check.status == "warn" for check in report.checks)
