from app.schemas.diagnosis import DiagnosisResponse, HotspotCandidate, MomentumSignalItem, StockSnapshot
from app.services.concept_heat import ConceptHeatService


class HotspotCandidateService:
    def __init__(self) -> None:
        self._concept_service = ConceptHeatService()

    def build_candidates(
        self,
        snapshots: list[StockSnapshot],
        diagnoses: list[DiagnosisResponse],
        signals: list[MomentumSignalItem],
        mode: str = "balanced",
        limit: int = 10,
    ) -> list[HotspotCandidate]:
        diagnosis_by_symbol = {item.symbol: item for item in diagnoses}
        signal_by_symbol = {item.symbol: item for item in signals}
        candidates = []
        for snapshot in snapshots:
            diagnosis = diagnosis_by_symbol[snapshot.symbol]
            signal = signal_by_symbol.get(snapshot.symbol)
            concept = self._concept_service._concepts_for(snapshot)[0]
            heat_score = self._score(snapshot, diagnosis, signal, mode)
            if heat_score < 52:
                continue
            candidates.append(
                HotspotCandidate(
                    symbol=snapshot.symbol,
                    name=snapshot.name,
                    industry=snapshot.industry,
                    concept=concept,
                    heat_score=heat_score,
                    diagnosis_score=diagnosis.score.total,
                    signal_score=signal.signal_score if signal else 0,
                    change_pct=snapshot.change_pct,
                    main_inflow_million=snapshot.capital.main_inflow_million,
                    reason=self._reason(snapshot, diagnosis, signal, concept),
                    risk_note=diagnosis.risks[0],
                    next_action=self._next_action(snapshot, diagnosis, signal),
                )
            )
        return sorted(candidates, key=lambda item: self._sort_key(item, mode), reverse=True)[:limit]

    def _score(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        signal: MomentumSignalItem | None,
        mode: str,
    ) -> int:
        signal_score = signal.signal_score if signal else 35
        if mode == "capital":
            score = diagnosis.score.total * 0.32 + signal_score * 0.24
            score += max(-10, min(24, snapshot.capital.main_inflow_million / 70))
            score += max(-6, min(10, snapshot.change_pct * 2))
        elif mode == "momentum":
            score = diagnosis.score.total * 0.28 + signal_score * 0.48
            score += max(-10, min(20, snapshot.change_pct * 4))
            score += max(-5, min(8, snapshot.capital.main_inflow_million / 160))
        else:
            score = diagnosis.score.total * 0.45 + signal_score * 0.35
            score += max(-8, min(12, snapshot.change_pct * 3))
            score += max(-6, min(10, snapshot.capital.main_inflow_million / 120))
        if snapshot.risk.st_flag:
            score -= 18
        return max(0, min(100, round(score)))

    def _sort_key(self, item: HotspotCandidate, mode: str) -> tuple:
        if mode == "capital":
            return (item.heat_score, item.main_inflow_million, item.signal_score)
        if mode == "momentum":
            return (item.heat_score, item.signal_score, item.change_pct)
        return (item.heat_score, item.signal_score, item.change_pct)

    def _reason(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        signal: MomentumSignalItem | None,
        concept: str,
    ) -> str:
        parts = [f"{concept}题材", f"诊断分 {diagnosis.score.total}"]
        if signal is not None:
            parts.append(f"{signal.title}，{signal.reason}")
        if snapshot.capital.main_inflow_million > 0:
            parts.append(f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万")
        return "；".join(parts) + "。"

    def _next_action(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        signal: MomentumSignalItem | None,
    ) -> str:
        if snapshot.risk.st_flag:
            return "风险警示标的，先观察流动性和公告，不纳入常规热点池。"
        if "解禁" in diagnosis.risks[0]:
            return "短线热度存在，但需同步跟踪解禁窗口和成交承接。"
        if signal is not None and signal.signal_level in {"limit-watch", "surging"}:
            return "优先确认量能能否延续，并观察分时回踩承接。"
        if snapshot.capital.main_inflow_million > 200 and snapshot.change_pct < 1:
            return "资金先行预热，观察价格能否放量突破近端压力。"
        if diagnosis.score.total >= 78:
            return "趋势和诊断分较强，回踩关键均线不破时继续跟踪。"
        return "保持观察，等待题材热度、资金流和技术结构进一步共振。"
