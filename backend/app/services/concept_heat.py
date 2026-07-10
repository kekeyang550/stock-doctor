from collections import defaultdict

from app.schemas.diagnosis import ConceptHeatItem, RankedDiagnosis, StockSnapshot


class ConceptHeatService:
    def build_heatmap(
        self,
        snapshots: list[StockSnapshot],
        ranked: list[RankedDiagnosis],
    ) -> list[ConceptHeatItem]:
        ranked_by_symbol = {item.symbol: item for item in ranked}
        snapshots_by_concept: dict[str, list[StockSnapshot]] = defaultdict(list)

        for snapshot in snapshots:
            for concept in self._concepts_for(snapshot):
                snapshots_by_concept[concept].append(snapshot)

        items = []
        for concept, concept_snapshots in snapshots_by_concept.items():
            scored = [ranked_by_symbol[snapshot.symbol] for snapshot in concept_snapshots if snapshot.symbol in ranked_by_symbol]
            if not scored:
                continue
            top = max(scored, key=lambda item: item.total_score)
            average_score = sum(item.total_score for item in scored) / len(scored)
            average_change = sum(snapshot.change_pct for snapshot in concept_snapshots) / len(concept_snapshots)
            average_inflow = sum(snapshot.capital.main_inflow_million for snapshot in concept_snapshots) / len(concept_snapshots)
            heat_score = self._heat_score(average_score, average_change, average_inflow, len(concept_snapshots))
            items.append(
                ConceptHeatItem(
                    concept=concept,
                    stock_count=len(concept_snapshots),
                    heat_score=heat_score,
                    average_change_pct=round(average_change, 2),
                    average_main_inflow_million=round(average_inflow, 1),
                    top_symbol=top.symbol,
                    top_name=top.name,
                    reason=self._reason(average_change, average_inflow, top.name),
                    heat_level=self._heat_level(heat_score),
                )
            )

        return sorted(items, key=lambda item: (item.heat_score, item.average_change_pct), reverse=True)

    def _concepts_for(self, snapshot: StockSnapshot) -> list[str]:
        text = f"{snapshot.name} {snapshot.industry}"
        concepts = []
        mapping = [
            ("白酒", "消费白马"),
            ("银行", "银行金融"),
            ("汽车", "新能源汽车"),
            ("电池", "动力电池"),
            ("半导体", "半导体"),
            ("软件", "信创软件"),
            ("专用设备", "高端制造"),
            ("设备", "高端制造"),
        ]
        for keyword, concept in mapping:
            if keyword in text and concept not in concepts:
                concepts.append(concept)
        return concepts or [snapshot.industry]

    def _heat_score(
        self,
        average_score: float,
        average_change: float,
        average_inflow: float,
        stock_count: int,
    ) -> int:
        breadth_bonus = min(8, max(0, stock_count - 1) * 2)
        change_bonus = max(-10, min(18, average_change * 5))
        inflow_bonus = max(-8, min(14, average_inflow / 90))
        return max(0, min(100, round(average_score * 0.68 + 20 + breadth_bonus + change_bonus + inflow_bonus)))

    def _heat_level(self, heat_score: int) -> str:
        if heat_score >= 82:
            return "hot"
        if heat_score >= 66:
            return "warm"
        if heat_score >= 52:
            return "neutral"
        return "cool"

    def _reason(self, average_change: float, average_inflow: float, top_name: str) -> str:
        if average_change >= 1 and average_inflow > 0:
            return f"{top_name}领涨，价格与资金同步增强。"
        if average_inflow >= 100:
            return f"{top_name}带动，资金先于价格预热。"
        if average_change < 0 and average_inflow < 0:
            return f"{top_name}承压，题材资金降温。"
        return f"{top_name}为核心观察标的，热度温和。"
