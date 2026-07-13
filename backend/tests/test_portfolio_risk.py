from app.services.alerts import AlertEngine
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.portfolio_risk import PortfolioRiskService
from app.services.risk_exposure import RiskExposureService


def test_portfolio_risk_report_summarizes_watchlist():
    provider = MockMarketDataProvider()
    provider.replace_watchlist(["600519", "300750", "002594"])
    diagnosis_engine = DiagnosisEngine()
    alert_engine = AlertEngine()
    exposure_service = RiskExposureService()

    snapshots = []
    diagnoses = []
    alerts = []
    for stock in provider.get_watchlist():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = diagnosis_engine.diagnose(snapshot, horizon="swing")
        snapshots.append(snapshot)
        diagnoses.append(diagnosis)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    exposures = exposure_service.summarize(alerts)
    report = PortfolioRiskService().build(
        scope="watchlist",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        alerts=alerts,
        exposures=exposures,
    )

    assert report.scope == "watchlist"
    assert report.horizon == "swing"
    assert report.stock_count == 3
    assert report.average_total_score > 0
    assert report.average_risk_score > 0
    assert report.portfolio_risk_score >= 0
    assert report.risk_level in {"low", "medium", "high"}
    assert report.concentration.top_industry
    assert report.concentration.top_industry_ratio > 0
    assert report.industry_exposures
    assert report.industry_exposures[0].weight_pct > 0
    assert report.distribution.high_count + report.distribution.medium_count + report.distribution.low_count == 3
    assert report.top_drivers
    assert report.risk_contributions
    assert report.risk_contributions[0].contribution_score >= report.risk_contributions[-1].contribution_score
    assert report.suggestions
    assert report.exposures == exposures
    assert not any("现金缓冲" in suggestion for suggestion in report.suggestions)


def test_portfolio_risk_report_supports_custom_position_weights():
    provider = MockMarketDataProvider()
    provider.replace_watchlist(["600519", "300750", "002594"])
    diagnosis_engine = DiagnosisEngine()
    alert_engine = AlertEngine()
    exposure_service = RiskExposureService()

    snapshots = []
    diagnoses = []
    alerts = []
    for stock in provider.get_watchlist():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = diagnosis_engine.diagnose(snapshot, horizon="swing")
        snapshots.append(snapshot)
        diagnoses.append(diagnosis)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    exposures = exposure_service.summarize(alerts)
    report = PortfolioRiskService().build(
        scope="watchlist",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        alerts=alerts,
        exposures=exposures,
        position_weights={"600519": 80, "300750": 20},
    )

    assert report.weight_mode == "custom"
    assert report.total_position_weight == 100
    assert [item.symbol for item in report.positions] == ["600519", "300750", "002594"]
    assert report.positions[0].weight_pct == 80
    assert report.positions[1].weight_pct == 20
    assert report.positions[2].weight_pct == 0
    assert report.concentration.top_industry == "白酒"
    assert report.concentration.top_industry_ratio == 0.8
    assert report.industry_exposures[0].industry == "白酒"
    assert report.industry_exposures[0].weight_pct == 80
    assert report.industry_exposures[0].concentration_level == "high"
    assert report.industry_exposures[0].concentration_label == "过度集中"
    assert report.industry_exposures[0].suggested_max_weight_pct == 40
    assert report.industry_exposures[0].excess_weight_pct == 40
    assert report.top_drivers[0].position_weight_pct >= 0
    maotai_contribution = next(item for item in report.risk_contributions if item.symbol == "600519")
    assert maotai_contribution.weight_pct == 80
    assert maotai_contribution.contribution_score > 0
    assert report.rebalance_actions
    maotai_action = next(item for item in report.rebalance_actions if item.symbol == "600519")
    assert maotai_action.action in {"reduce", "hold"}
    assert maotai_action.current_weight_pct == 80
    assert maotai_action.suggested_weight_pct <= 80
    assert maotai_action.reason
    assert not any("现金缓冲" in suggestion for suggestion in report.suggestions)


def test_portfolio_risk_report_mentions_cash_buffer_for_partial_weights():
    provider = MockMarketDataProvider()
    provider.replace_watchlist(["600519", "300750", "002594"])
    diagnosis_engine = DiagnosisEngine()
    alert_engine = AlertEngine()
    exposure_service = RiskExposureService()

    snapshots = []
    diagnoses = []
    alerts = []
    for stock in provider.get_watchlist():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = diagnosis_engine.diagnose(snapshot, horizon="swing")
        snapshots.append(snapshot)
        diagnoses.append(diagnosis)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    exposures = exposure_service.summarize(alerts)
    report = PortfolioRiskService().build(
        scope="watchlist",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        alerts=alerts,
        exposures=exposures,
        position_weights={"600519": 80},
        portfolio_value=100000,
    )

    assert report.total_position_weight == 80
    assert report.total_market_value == 100000
    assert report.cash_amount == 20000
    assert report.positions[0].market_value == 80000
    assert report.industry_exposures[0].excess_market_value == 40000
    assert any("现金缓冲" in suggestion for suggestion in report.suggestions)
    assert any("20000.00 元" in suggestion for suggestion in report.suggestions)
    assert any("集中度上限" in suggestion for suggestion in report.suggestions)


def test_portfolio_risk_report_uses_real_lot_costs_when_available():
    provider = MockMarketDataProvider()
    provider.replace_watchlist(["600519", "300750", "002594"])
    diagnosis_engine = DiagnosisEngine()
    alert_engine = AlertEngine()
    exposure_service = RiskExposureService()

    snapshots = []
    diagnoses = []
    alerts = []
    for stock in provider.get_watchlist():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = diagnosis_engine.diagnose(snapshot, horizon="swing")
        snapshots.append(snapshot)
        diagnoses.append(diagnosis)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    exposures = exposure_service.summarize(alerts)
    report = PortfolioRiskService().build(
        scope="watchlist",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        alerts=alerts,
        exposures=exposures,
        position_weights={"600519": 10},
        position_lots={"600519": {"shares": 10, "cost_price": 1200}},
        portfolio_value=20000,
    )

    maotai = next(item for item in report.positions if item.symbol == "600519")
    assert report.weight_mode == "custom"
    assert report.total_market_value == 20000
    assert report.cash_amount == 4817
    assert maotai.shares == 10
    assert maotai.cost_price == 1200
    assert maotai.market_value == 15183
    assert maotai.cost_amount == 12000
    assert maotai.unrealized_pnl == 3183
    assert maotai.unrealized_pnl_pct == 26.52
    assert maotai.weight_pct > 75
