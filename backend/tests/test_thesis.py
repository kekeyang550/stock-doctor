from app.schemas.diagnosis import (
    CapitalSnapshot,
    FundamentalSnapshot,
    RiskSnapshot,
    StockSnapshot,
    TechnicalSnapshot,
)
from app.services.diagnosis import DiagnosisEngine
from app.services.thesis import ThesisService


def make_snapshot(**overrides):
    data = {
        "symbol": "TEST",
        "name": "测试股份",
        "industry": "测试行业",
        "last_price": 20.0,
        "change_pct": 2.0,
        "as_of": "2026-07-10",
        "technical": TechnicalSnapshot(ma5=19.0, ma20=18.0, ma60=17.0, rsi14=61, macd=0.8, volume_ratio=1.5),
        "fundamental": FundamentalSnapshot(pe_ttm=18, pb=2.1, roe=21, revenue_growth=13, profit_growth=16, industry_pe_percentile=31),
        "capital": CapitalSnapshot(main_inflow_million=300, northbound_inflow_million=120, turnover_rate=1.2),
        "risk": RiskSnapshot(pledge_ratio=1.0, unlock_days=None, st_flag=False, limit_up_streak=0),
    }
    data.update(overrides)
    return StockSnapshot(**data)


def test_thesis_builds_bullish_case_for_strong_stock():
    snapshot = make_snapshot()
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")

    thesis = ThesisService().build_thesis(snapshot=snapshot, diagnosis=diagnosis)

    assert thesis.stance == "bullish"
    assert thesis.confidence >= 70
    assert thesis.bull_case
    assert thesis.trigger
    assert any(item.side == "bull" for item in thesis.evidence)
    assert len(thesis.next_checks) >= 3


def test_thesis_turns_defensive_when_risk_is_high():
    snapshot = make_snapshot(
        risk=RiskSnapshot(pledge_ratio=25.0, unlock_days=8, st_flag=False, limit_up_streak=0),
        capital=CapitalSnapshot(main_inflow_million=-220, northbound_inflow_million=-120, turnover_rate=4.4),
    )
    diagnosis = DiagnosisEngine().diagnose(snapshot, horizon="swing")

    thesis = ThesisService().build_thesis(snapshot=snapshot, diagnosis=diagnosis)

    assert thesis.stance == "defensive"
    assert "风控线" in thesis.invalidation
    assert any(item.side == "bear" for item in thesis.evidence)
    assert thesis.next_checks[0] == "优先复核风险项是否已经缓解。"
