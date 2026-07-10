from app.schemas.diagnosis import RankedDiagnosis
from app.services.alerts import AlertEngine
from app.services.diagnosis import DiagnosisEngine
from app.services.industry_heat import IndustryHeatService
from app.services.market_data import MockMarketDataProvider


def test_industry_heat_summarizes_scores_and_alerts():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    ranked = []
    alerts = []
    for snapshot in snapshots:
        diagnosis = engine.diagnose(snapshot, horizon="swing")
        ranked.append(
            RankedDiagnosis(
                symbol=diagnosis.symbol,
                name=diagnosis.name,
                industry=diagnosis.industry,
                rating=diagnosis.rating,
                verdict=diagnosis.verdict,
                total_score=diagnosis.score.total,
                technical_score=diagnosis.score.technical,
                capital_score=diagnosis.score.capital,
                risk_score=diagnosis.score.risk,
                change_pct=snapshot.change_pct,
                primary_risk=diagnosis.risks[0],
            )
        )
        alerts.extend(AlertEngine().build_alerts(snapshot, diagnosis))

    heat = IndustryHeatService().build_heatmap(snapshots=snapshots, ranked=ranked, alerts=alerts)

    assert len(heat) >= 3
    assert heat[0].heat_score >= heat[-1].heat_score
    assert all(0 <= item.heat_score <= 100 for item in heat)
    assert all(item.momentum_label for item in heat)
    assert any(item.average_main_inflow_million != 0 for item in heat)
    assert any(item.industry == "汽车整车" and item.high_alert_count >= 1 for item in heat)
