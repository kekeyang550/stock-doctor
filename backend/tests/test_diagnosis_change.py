from datetime import datetime, timezone

from app.schemas.diagnosis import CapitalSnapshot, DataQualityReport, FundamentalSnapshot, RiskSnapshot, StockSnapshot, TechnicalSnapshot
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


def make_quality(score: int = 90, status: str = "warn") -> DataQualityReport:
    return DataQualityReport(
        symbol="600519",
        name="贵州茅台",
        as_of="2026-07-10",
        status=status,
        score=score,
        coverage_pct=88,
        issue_count=1,
        summary="数据质量需核验。",
        checks=[],
    )


def test_change_report_returns_baseline_without_previous_report():
    current = make_diagnosis()
    quality = make_quality(score=91, status="warn")

    report = DiagnosisChangeService().build_change(current=current, previous=None, current_quality=quality)

    assert report.status == "baseline"
    assert report.previous_generated_at is None
    assert report.score_delta == 0
    assert report.changes[0].key == "baseline"
    assert len(report.score_trend) == 1
    assert report.score_trend[0].label == "本次"
    assert report.score_trend[0].quality_score == 91
    assert report.score_trend[0].quality_status == "warn"
    assert report.rating_transition.previous is None
    assert report.rating_transition.current == current.rating
    assert report.rating_transition.changed is False
    assert report.risk_shift.direction == "baseline"
    assert report.key_drivers[0].metric == "baseline"


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
        data_quality=make_quality(score=84, status="warn"),
    )

    report = DiagnosisChangeService().build_change(
        current=current,
        previous=previous,
        current_quality=make_quality(score=95, status="pass"),
    )

    assert report.status == "improved"
    assert report.score_delta == 8
    assert report.rating_changed is True
    assert report.previous_rating == "稳健观察"
    assert any(item.key == "rating" for item in report.changes)
    assert [point.label for point in report.score_trend] == ["上次", "本次"]
    assert report.score_trend[0].total == previous_diagnosis.score.total
    assert report.score_trend[0].quality_score == 84
    assert report.score_trend[0].quality_status == "warn"
    assert report.score_trend[1].total == current.score.total
    assert report.score_trend[1].quality_score == 95
    assert report.score_trend[1].quality_status == "pass"
    assert report.rating_transition.previous == "稳健观察"
    assert report.rating_transition.current == current.rating
    assert report.rating_transition.changed is True
    assert report.risk_shift.direction == "improved"
    assert report.risk_shift.delta == 2
    assert report.key_drivers[0].metric == "total"
    assert report.key_drivers[0].delta == 8


def test_change_report_builds_multi_point_trend_insight():
    current = make_diagnosis()
    older_diagnosis = current.model_copy(
        update={
            "rating": "谨慎观望",
            "score": current.score.model_copy(update={"total": current.score.total - 14, "risk": current.score.risk - 9}),
        }
    )
    previous_diagnosis = current.model_copy(
        update={
            "rating": "稳健观察",
            "score": current.score.model_copy(update={"total": current.score.total - 7, "risk": current.score.risk - 4}),
        }
    )
    older = ReportRecord(
        id="older",
        generated_at="2026-07-08T06:00:00+00:00",
        diagnosis=older_diagnosis,
    )
    previous = ReportRecord(
        id="previous",
        generated_at="2026-07-09T06:00:00+00:00",
        diagnosis=previous_diagnosis,
    )

    report = DiagnosisChangeService().build_change(
        current=current,
        previous=previous,
        recent_reports=[previous, older],
    )

    assert [point.label for point in report.score_trend] == ["历史1", "上次", "本次"]
    assert report.trend_insight.sample_count == 3
    assert report.trend_insight.score_direction == "up"
    assert report.trend_insight.risk_direction == "improved"
    assert report.trend_insight.rating_change_count == 2
    assert report.trend_insight.total_low == current.score.total - 14
    assert report.trend_insight.total_high == current.score.total
    assert "最近 3 次诊断综合分持续走强" in report.trend_insight.summary


def test_change_report_matches_common_market_code_formats():
    current = make_diagnosis()
    previous = ReportRecord(
        id="previous",
        generated_at="2026-07-09T06:00:00+00:00",
        diagnosis=current.model_copy(update={"symbol": "SH600519"}),
    )
    service = DiagnosisChangeService()

    assert service.latest_for_symbol([previous], "600519") == previous
    assert service.recent_for_symbol([previous], "600519.SH") == [previous]

    report = service.build_change(current=current, previous=previous, recent_reports=[previous])

    assert [point.label for point in report.score_trend] == ["上次", "本次"]
