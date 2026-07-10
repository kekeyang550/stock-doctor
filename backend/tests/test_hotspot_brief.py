from app.schemas.diagnosis import RankedDiagnosis
from app.services.alerts import AlertEngine
from app.services.concept_heat import ConceptHeatService
from app.services.diagnosis import DiagnosisEngine
from app.services.hotspot_brief import HotspotBriefService
from app.services.industry_heat import IndustryHeatService
from app.services.market_data import MockMarketDataProvider
from app.services.momentum_signals import MomentumSignalService


def test_hotspot_brief_combines_industry_concept_and_signal():
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

    industries = IndustryHeatService().build_heatmap(snapshots=snapshots, ranked=ranked, alerts=alerts)
    concepts = ConceptHeatService().build_heatmap(snapshots=snapshots, ranked=ranked)
    signals = MomentumSignalService().build_signals(snapshots=snapshots)
    brief = HotspotBriefService().build_brief(industries=industries, concepts=concepts, signals=signals)

    assert brief.status in {"hot", "warm", "neutral", "cool"}
    assert brief.summary
    assert brief.top_industry is not None
    assert brief.top_concept is not None
    assert brief.top_signal is not None
    assert brief.focus_symbols
