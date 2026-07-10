from app.schemas.diagnosis import CapitalSnapshot, FundamentalSnapshot, RiskSnapshot, StockSnapshot, TechnicalSnapshot
from app.services.alerts import AlertEngine
from app.services.data_quality import DataQualityService
from app.services.diagnosis import DiagnosisEngine
from app.services.diagnosis_change import DiagnosisChangeService
from app.services.review_actions import ReviewActionService
from app.services.thesis import ThesisService


def make_snapshot(**overrides):
    data = {
        "symbol": "TEST",
        "name": "测试股份",
        "industry": "测试行业",
        "last_price": 20.0,
        "change_pct": 2.0,
        "as_of": "2026-07-10",
        "technical": TechnicalSnapshot(ma5=19.0, ma20=18.0, ma60=17.0, rsi14=74, macd=0.8, volume_ratio=1.5),
        "fundamental": FundamentalSnapshot(pe_ttm=18, pb=2.1, roe=21, revenue_growth=13, profit_growth=16, industry_pe_percentile=31),
        "capital": CapitalSnapshot(main_inflow_million=-180, northbound_inflow_million=120, turnover_rate=1.2),
        "risk": RiskSnapshot(pledge_ratio=1.0, unlock_days=None, st_flag=False, limit_up_streak=0),
    }
    data.update(overrides)
    return StockSnapshot(**data)


def test_review_action_plan_merges_diagnosis_context():
    snapshot = make_snapshot()
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")
    thesis = ThesisService().build_thesis(snapshot=snapshot, diagnosis=diagnosis)
    quality = DataQualityService().build_report(snapshot)
    change = DiagnosisChangeService().build_change(current=diagnosis, previous=None)
    alerts = AlertEngine().build_alerts(snapshot, diagnosis)

    plan = ReviewActionService().build_plan(
        diagnosis=diagnosis,
        thesis=thesis,
        quality=quality,
        change=change,
        alerts=alerts,
    )

    assert plan.symbol == "TEST"
    assert plan.items
    assert plan.high_count >= 1
    assert any(item.source == "diagnosis" for item in plan.items)
    assert any(item.source == "thesis" for item in plan.items)
    assert any(item.source == "alerts" for item in plan.items)
    assert any(item.title == "保存复盘基线" for item in plan.items)
    assert [item.priority for item in plan.items] == sorted(
        [item.priority for item in plan.items],
        key={"high": 0, "medium": 1, "low": 2}.get,
    )


def test_review_action_overview_summarizes_multiple_plans():
    snapshot = make_snapshot()
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")
    thesis = ThesisService().build_thesis(snapshot=snapshot, diagnosis=diagnosis)
    quality = DataQualityService().build_report(snapshot)
    change = DiagnosisChangeService().build_change(current=diagnosis, previous=None)
    alerts = AlertEngine().build_alerts(snapshot, diagnosis)
    service = ReviewActionService()
    plan = service.build_plan(diagnosis=diagnosis, thesis=thesis, quality=quality, change=change, alerts=alerts)

    overview = service.build_overview(scope="watchlist", horizon="swing", plans=[plan])

    assert overview.stock_count == 1
    assert overview.high_count == plan.high_count
    assert overview.summaries[0].symbol == "TEST"
    assert overview.summaries[0].top_action == plan.items[0].title
