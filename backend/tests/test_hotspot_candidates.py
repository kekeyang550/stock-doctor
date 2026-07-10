from app.services.diagnosis import DiagnosisEngine
from app.services.hotspot_candidates import HotspotCandidateService
from app.services.market_data import MockMarketDataProvider
from app.services.momentum_signals import MomentumSignalService


def test_hotspot_candidates_rank_actionable_hot_stocks():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [engine.diagnose(snapshot=snapshot, horizon="swing") for snapshot in snapshots]
    signals = MomentumSignalService().build_signals(snapshots=snapshots, limit=50)

    candidates = HotspotCandidateService().build_candidates(
        snapshots=snapshots,
        diagnoses=diagnoses,
        signals=signals,
    )

    assert candidates
    assert candidates[0].heat_score >= candidates[-1].heat_score
    assert any(item.symbol == "002594" and item.concept == "新能源汽车" for item in candidates)
    assert all(item.reason for item in candidates)
    assert all(item.next_action for item in candidates)


def test_hotspot_candidates_support_capital_and_momentum_modes():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [engine.diagnose(snapshot=snapshot, horizon="swing") for snapshot in snapshots]
    signals = MomentumSignalService().build_signals(snapshots=snapshots, limit=50)
    service = HotspotCandidateService()

    capital = service.build_candidates(snapshots=snapshots, diagnoses=diagnoses, signals=signals, mode="capital")
    momentum = service.build_candidates(snapshots=snapshots, diagnoses=diagnoses, signals=signals, mode="momentum")

    assert capital
    assert momentum
    assert capital[0].heat_score >= capital[-1].heat_score
    assert momentum[0].heat_score >= momentum[-1].heat_score
