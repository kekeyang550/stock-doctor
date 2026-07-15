from app.schemas.diagnosis import (
    CapitalSnapshot,
    DataQualityReport,
    DataQualityCheck,
    DiagnosisResponse,
    FundamentalSnapshot,
    RiskSnapshot,
    ScoreBreakdown,
    StockSnapshot,
    TechnicalSnapshot,
)
from app.services.diagnosis import DiagnosisEngine
from app.services.reports import ReportService
from app.services.storage import JsonStateStore


def make_diagnosis() -> DiagnosisResponse:
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


def test_report_service_saves_lists_and_deletes_reports(tmp_path):
    service = ReportService(JsonStateStore(tmp_path / "state.json"))
    quality = DataQualityReport(
        symbol="600519",
        name="贵州茅台",
        as_of="2026-07-10",
        status="pass",
        score=100,
        coverage_pct=100,
        issue_count=0,
        summary="数据质量可用。",
        checks=[
            DataQualityCheck(
                key="market",
                label="行情",
                status="pass",
                detail="行情字段完整。",
                impact="影响诊断。",
            )
        ],
    )
    record = service.save_report(make_diagnosis(), data_quality=quality)

    reports = service.list_reports()

    assert reports[0].id == record.id
    assert reports[0].diagnosis.symbol == "600519"
    assert reports[0].data_quality is not None
    assert reports[0].data_quality.score == 100
    assert service.delete_report(record.id) is True
    assert service.list_reports() == []


def test_report_limit_is_applied(tmp_path):
    service = ReportService(JsonStateStore(tmp_path / "state.json"))
    service.save_report(make_diagnosis())
    service.save_report(make_diagnosis())

    assert len(service.list_reports(limit=1)) == 1


def test_report_service_migrates_reports_without_checklist(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    diagnosis = make_diagnosis().model_dump(mode="json")
    diagnosis["symbol"] = "SH600519"
    diagnosis.pop("checklist")
    store.save_reports([
        {
            "id": "legacy",
            "generated_at": "2026-07-10T03:00:00Z",
            "diagnosis": diagnosis,
        }
    ])
    service = ReportService(store)

    report = service.list_reports()[0]
    stored_report = store.load_reports()[0]

    assert report.id == "legacy"
    assert report.diagnosis.symbol == "600519"
    assert report.diagnosis.checklist[0].title == "观察关键价位"
    assert stored_report["diagnosis"]["symbol"] == "600519"
