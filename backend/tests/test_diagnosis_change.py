from datetime import datetime, timezone

from app.schemas.diagnosis import CapitalSnapshot, FundamentalSnapshot, RiskSnapshot, StockSnapshot, TechnicalSnapshot
from app.schemas.diagnosis import ReportRecord
from app.services.diagnosis import DiagnosisEngine
from app.services.diagnosis_change import DiagnosisChangeService


def make_diagnosis():
    snapshot = StockSnapshot(
        symbol="600519",
        name="贵州茅台",
        industry="白酒",
        last_price=1518.3,
        change_pct=1.18,
        as_of="2026-07-10",
        technical=TechnicalSnapshot(ma5=1502.6, ma20=1478.4, ma60=1439.7, rsi14=62.5, macd=8.4, volume_ratio=1.16),
        fundamental=FundamentalSnapshot(pe_ttm=24.8, pb=8.3, roe=31.4, revenue_growth=14.2, profit_growth=15.7, industry_pe_percentile=54),
        capital=CapitalSnapshot(main_inflow_million=412.5, northbound_inflow_million=188.2, turnover_rate=0.42),
        risk=RiskSnapshot(pledge_ratio=0.8),
    )
    return DiagnosisEngine().diagnose(snapshot, horizon="swing")


def test_change_report_returns_baseline_without_previous_report():
    current = make_diagnosis()

    report = DiagnosisChangeService().build_change(current=current, previous=None)

    assert report.status == "baseline"
    assert report.previous_generated_at is None
    assert report.score_delta == 0
    assert report.changes[0].key == "baseline"


def test_change_report_compares_against_previous_report():
    current = make_diagnosis()
    previous_diagnosis = current.model_copy(
        update={
            "rating": "稳健观察",
            "score": current.score.model_copy(update={"total": current.score.total - 8, "risk": current.score.risk - 2}),
        }
    )
    previous = ReportRecord(
        id="previous",
        generated_at=datetime.now(timezone.utc).isoformat(),
        diagnosis=previous_diagnosis,
    )

    report = DiagnosisChangeService().build_change(current=current, previous=previous)

    assert report.status == "improved"
    assert report.score_delta == 8
    assert report.rating_changed is True
    assert report.previous_rating == "稳健观察"
    assert any(item.key == "rating" for item in report.changes)
