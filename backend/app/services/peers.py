from app.schemas.diagnosis import PeerComparisonItem, PeerComparisonResponse, StockSnapshot
from app.services.diagnosis import DiagnosisEngine


class PeerComparisonService:
    def __init__(self, diagnosis_engine: DiagnosisEngine | None = None) -> None:
        self._diagnosis_engine = diagnosis_engine or DiagnosisEngine()

    def compare(
        self,
        target: StockSnapshot,
        candidates: list[StockSnapshot],
        horizon: str,
        limit: int = 6,
    ) -> PeerComparisonResponse:
        same_industry = [item for item in candidates if item.industry == target.industry]
        peer_pool = same_industry if len(same_industry) >= 2 else candidates
        items = [self._item(snapshot, target.symbol, horizon) for snapshot in peer_pool]
        items_sorted = sorted(items, key=lambda item: item.total_score, reverse=True)[:limit]
        return PeerComparisonResponse(
            symbol=target.symbol,
            name=target.name,
            industry=target.industry,
            sample_size=len(peer_pool),
            items=items_sorted,
        )

    def _item(self, snapshot: StockSnapshot, target_symbol: str, horizon: str) -> PeerComparisonItem:
        diagnosis = self._diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        return PeerComparisonItem(
            symbol=snapshot.symbol,
            name=snapshot.name,
            industry=snapshot.industry,
            total_score=diagnosis.score.total,
            change_pct=snapshot.change_pct,
            pe_ttm=snapshot.fundamental.pe_ttm,
            roe=snapshot.fundamental.roe,
            main_inflow_million=snapshot.capital.main_inflow_million,
            relative_label="当前标的" if snapshot.symbol == target_symbol else "对比样本",
        )
