from app.schemas.diagnosis import RankedDiagnosis
from app.services.concept_heat import ConceptHeatService
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider


def test_concept_heat_groups_stocks_into_theme_labels():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    ranked = []
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

    heat = ConceptHeatService().build_heatmap(snapshots=snapshots, ranked=ranked)

    assert heat
    assert heat[0].heat_score >= heat[-1].heat_score
    assert any(item.concept == "新能源汽车" for item in heat)
    assert any(item.concept == "动力电池" for item in heat)
    assert all(item.reason for item in heat)
