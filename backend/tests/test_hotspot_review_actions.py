from app.services.diagnosis import DiagnosisEngine
from app.services.hotspot_candidates import HotspotCandidateService
from app.services.hotspot_review_actions import HotspotReviewActionService
from app.services.market_data import MockMarketDataProvider
from app.services.momentum_signals import MomentumSignalService


def test_hotspot_review_actions_convert_candidates_to_prioritized_tasks():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [engine.diagnose(snapshot=snapshot, horizon="swing") for snapshot in snapshots]
    signals = MomentumSignalService().build_signals(snapshots=snapshots, limit=50)
    candidates = HotspotCandidateService().build_candidates(snapshots=snapshots, diagnoses=diagnoses, signals=signals)

    plan = HotspotReviewActionService().build_plan(candidates=candidates, horizon="swing", mode="balanced")

    assert plan.actions
    assert plan.candidate_count == len(candidates)
    assert plan.high_count + plan.medium_count + plan.low_count == len(plan.actions)
    assert plan.actions[0].priority in {"high", "medium", "low"}
    assert all(item.trigger for item in plan.actions)
    assert any(item.symbol == "002594" and "承接" in item.detail for item in plan.actions)


def test_hotspot_review_actions_apply_saved_statuses():
    provider = MockMarketDataProvider()
    engine = DiagnosisEngine()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [engine.diagnose(snapshot=snapshot, horizon="swing") for snapshot in snapshots]
    signals = MomentumSignalService().build_signals(snapshots=snapshots, limit=50)
    candidates = HotspotCandidateService().build_candidates(snapshots=snapshots, diagnoses=diagnoses, signals=signals)
    service = HotspotReviewActionService()
    plan = service.build_plan(candidates=candidates, horizon="swing", mode="balanced")
    action_id = plan.actions[0].id

    updated = service.apply_statuses(
        plan,
        [{"key": service.status_key("swing", "balanced", action_id), "status": "watching"}],
    )

    assert updated.actions[0].status == "watching"
    assert updated.watching_count == 1
