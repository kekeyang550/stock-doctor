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
        "source_coverage",
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


def test_data_quality_report_warns_for_conservative_real_data_fields():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "as_of": date.today().isoformat(),
            "data_sources": ["fundamental-quote-detail", "sina-capital-flow", "tdx-kline"],
            "conservative_fields": ["growth", "northbound"],
        }
    )

    report = DataQualityService().build_report(snapshot)
    source_check = next(check for check in report.checks if check.key == "source_coverage")

    assert report.status == "warn"
    assert report.score == 90
    assert source_check.status == "warn"
    assert "东方财富估值详情" in source_check.detail
    assert "新浪资金流兜底" in source_check.detail
    assert "通达信本地 K 线" in source_check.detail
    assert "成长字段" in source_check.detail
    assert "北向资金" in source_check.detail


def test_data_quality_report_labels_tushare_financial_sources():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "as_of": date.today().isoformat(),
            "data_sources": ["tushare-daily-basic", "tushare-fina-indicator"],
            "conservative_fields": [],
        }
    )

    report = DataQualityService().build_report(snapshot)
    source_check = next(check for check in report.checks if check.key == "source_coverage")

    assert source_check.status == "pass"
    assert "Tushare 日行情基础指标" in source_check.detail
    assert "Tushare 财务指标" in source_check.detail
