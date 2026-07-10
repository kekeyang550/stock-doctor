from collections import defaultdict

from app.schemas.diagnosis import AlertItem, IndustryHeatItem, RankedDiagnosis, StockSnapshot


class IndustryHeatService:
    def build_heatmap(
        self,
        snapshots: list[StockSnapshot],
        ranked: list[RankedDiagnosis],
        alerts: list[AlertItem],
    ) -> list[IndustryHeatItem]:
        snapshots_by_industry: dict[str, list[StockSnapshot]] = defaultdict(list)
        ranked_by_symbol = {item.symbol: item for item in ranked}
        high_alerts: dict[str, int] = defaultdict(int)

        for snapshot in snapshots:
            snapshots_by_industry[snapshot.industry].append(snapshot)

        for alert in alerts:
            if alert.severity == "high":
                high_alerts[alert.industry] += 1

        items: list[IndustryHeatItem] = []
        for industry, industry_snapshots in snapshots_by_industry.items():
            scored = [ranked_by_symbol[snapshot.symbol] for snapshot in industry_snapshots if snapshot.symbol in ranked_by_symbol]
            if not scored:
                continue
            top = max(scored, key=lambda item: item.total_score)
            average_score = sum(item.total_score for item in scored) / len(scored)
            average_change = sum(snapshot.change_pct for snapshot in industry_snapshots) / len(industry_snapshots)
            alert_count = high_alerts[industry]
            items.append(
                IndustryHeatItem(
                    industry=industry,
                    stock_count=len(industry_snapshots),
                    average_score=round(average_score, 1),
                    average_change_pct=round(average_change, 2),
                    high_alert_count=alert_count,
                    top_symbol=top.symbol,
                    top_name=top.name,
                    top_score=top.total_score,
                    heat_level=self._heat_level(average_score, average_change, alert_count),
                )
            )

        return sorted(items, key=lambda item: (item.average_score, item.average_change_pct), reverse=True)

    def _heat_level(self, average_score: float, average_change: float, high_alert_count: int) -> str:
        if high_alert_count >= 2 or average_score < 55:
            return "cool"
        if average_score >= 78 and average_change > 1:
            return "hot"
        if average_score >= 65 or average_change > 0:
            return "warm"
        return "neutral"
