from app.schemas.diagnosis import (
    CapitalSnapshot,
    FundamentalSnapshot,
    RiskSnapshot,
    StockSnapshot,
    TechnicalSnapshot,
)
from app.services.diagnosis import DiagnosisEngine


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


def test_strong_stock_receives_high_rating():
    result = DiagnosisEngine().diagnose(make_snapshot(), horizon="swing")

    assert result.score.total >= 78
    assert result.rating == "强势关注"
    assert result.key_levels["support"] == 17.0
    assert any(item.title == "观察关键价位" for item in result.checklist)
    assert any(item.title == "跟踪强势延续" for item in result.checklist)
    assert "不构成任何投资建议" in result.disclaimer


def test_optional_financial_fields_surface_in_evidence():
    snapshot = make_snapshot(
        fundamental=FundamentalSnapshot(
            pe_ttm=18,
            pb=2.1,
            roe=21,
            revenue_growth=13,
            profit_growth=16,
            industry_pe_percentile=31,
            eps=2.5,
            gross_margin=42,
            debt_to_assets=28,
            operating_cashflow_per_share=3.1,
            cashflow_to_profit=95,
            current_ratio=1.8,
            quick_ratio=1.1,
            net_margin=18.5,
            asset_turnover=0.72,
        )
    )

    result = DiagnosisEngine().diagnose(snapshot, horizon="swing")

    assert any(item.label == "毛利率" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "资产负债率" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "每股经营现金流" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "现金流利润比" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "流动比率" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "净利率" and item.polarity == "positive" for item in result.evidence)
    assert any(item.label == "总资产周转率" and item.polarity == "positive" for item in result.evidence)


def test_risk_events_reduce_score_and_surface_warning():
    risky = make_snapshot(
        risk=RiskSnapshot(pledge_ratio=22.0, unlock_days=12, st_flag=False, limit_up_streak=0),
        capital=CapitalSnapshot(main_inflow_million=-180, northbound_inflow_million=-100, turnover_rate=4.2),
    )

    result = DiagnosisEngine().diagnose(risky, horizon="swing")

    assert result.score.risk < 60
    assert result.score.total < 78
    assert any("质押比例较高" in item for item in result.risks)
    assert any(item.title == "复核资金流向" for item in result.checklist)
    assert any(item.title == "跟踪解禁窗口" for item in result.checklist)
