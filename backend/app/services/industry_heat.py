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
            average_inflow = sum(snapshot.capital.main_inflow_million for snapshot in industry_snapshots) / len(industry_snapshots)
            alert_count = high_alerts[industry]
            heat_score = self._heat_score(average_score, average_change, average_inflow, alert_count)
            items.append(
                IndustryHeatItem(
                    industry=industry,
                    stock_count=len(industry_snapshots),
                    heat_score=heat_score,
                    average_score=round(average_score, 1),
                    average_change_pct=round(average_change, 2),
                    average_main_inflow_million=round(average_inflow, 1),
                    high_alert_count=alert_count,
                    top_symbol=top.symbol,
                    top_name=top.name,
                    top_score=top.total_score,
                    heat_level=self._heat_level(heat_score, alert_count),
                    momentum_label=self._momentum_label(average_change, average_inflow, alert_count),
                )
            )

        return sorted(items, key=lambda item: (item.heat_score, item.average_change_pct), reverse=True)

    def _heat_score(
        self,
        average_score: float,
        average_change: float,
        average_inflow: float,
        high_alert_count: int,
    ) -> int:
        change_bonus = max(-12, min(16, average_change * 4))
        inflow_bonus = max(-10, min(12, average_inflow / 80))
        alert_penalty = min(24, high_alert_count * 8)
        return max(0, min(100, round(average_score * 0.72 + 22 + change_bonus + inflow_bonus - alert_penalty)))

    def _heat_level(self, heat_score: int, high_alert_count: int) -> str:
        if high_alert_count >= 2 or heat_score < 55:
            return "cool"
        if heat_score >= 82:
            return "hot"
        if heat_score >= 66:
            return "warm"
        return "neutral"

    def _momentum_label(self, average_change: float, average_inflow: float, high_alert_count: int) -> str:
        if high_alert_count >= 2:
            return "风险压制"
        if average_change >= 1 and average_inflow > 0:
            return "价量共振"
        if average_change >= 1:
            return "价格走强"
        if average_inflow >= 100:
            return "资金预热"
        if average_change < 0 and average_inflow < 0:
            return "资金降温"
        return "温和观察"
