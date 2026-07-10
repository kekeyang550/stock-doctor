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
        limit: int = 10,
    ) -> list[HotspotCandidate]:
        diagnosis_by_symbol = {item.symbol: item for item in diagnoses}
        signal_by_symbol = {item.symbol: item for item in signals}
        candidates = []
        for snapshot in snapshots:
            diagnosis = diagnosis_by_symbol[snapshot.symbol]
            signal = signal_by_symbol.get(snapshot.symbol)
            concept = self._concept_service._concepts_for(snapshot)[0]
            heat_score = self._score(snapshot, diagnosis, signal)
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
                )
            )
        return sorted(candidates, key=lambda item: (item.heat_score, item.signal_score, item.change_pct), reverse=True)[:limit]

    def _score(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        signal: MomentumSignalItem | None,
    ) -> int:
        signal_score = signal.signal_score if signal else 35
        score = diagnosis.score.total * 0.45 + signal_score * 0.35
        score += max(-8, min(12, snapshot.change_pct * 3))
        score += max(-6, min(10, snapshot.capital.main_inflow_million / 120))
        if snapshot.risk.st_flag:
            score -= 18
        return max(0, min(100, round(score)))

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
