from collections import Counter, defaultdict

from app.schemas.diagnosis import (
    AlertItem,
    DiagnosisResponse,
    PortfolioRiskConcentration,
    PortfolioRiskDistribution,
    PortfolioRiskDriver,
    PortfolioRiskReport,
    PortfolioPositionWeight,
    RiskExposureItem,
    StockSnapshot,
)


class PortfolioRiskService:
    def build(
        self,
        scope: str,
        horizon: str,
        snapshots: list[StockSnapshot],
        diagnoses: list[DiagnosisResponse],
        alerts: list[AlertItem],
        exposures: list[RiskExposureItem],
        position_weights: dict[str, float] | None = None,
    ) -> PortfolioRiskReport:
        stock_count = len(snapshots)
        if stock_count == 0:
            return PortfolioRiskReport(
                scope=scope,
                horizon=horizon,
                stock_count=0,
                weight_mode="equal",
                total_position_weight=0,
                average_total_score=0,
                average_risk_score=0,
                portfolio_risk_score=0,
                risk_level="low",
                risk_label="暂无数据",
                summary="当前范围暂无组合风险数据。",
                concentration=PortfolioRiskConcentration(
                    top_industry="暂无",
                    top_industry_count=0,
                    top_industry_ratio=0,
                    industry_count=0,
                ),
                distribution=PortfolioRiskDistribution(high_count=0, medium_count=0, low_count=0),
                top_drivers=[],
                suggestions=["先添加自选股，再查看组合风险。"],
                exposures=exposures,
                positions=[],
            )

        diagnosis_by_symbol = {item.symbol: item for item in diagnoses}
        normalized_weights, raw_weights, weight_mode, total_position_weight = self._weights(snapshots, position_weights)
        average_total = round(sum(item.score.total * normalized_weights.get(item.symbol, 0) for item in diagnoses), 1)
        average_risk = round(sum(item.score.risk * normalized_weights.get(item.symbol, 0) for item in diagnoses), 1)
        concentration = self._concentration(snapshots, normalized_weights)
        distribution = self._distribution(diagnoses)
        pressure = self._pressure_score(
            average_risk_score=average_risk,
            high_alert_count=len([item for item in alerts if item.severity == "high"]),
            medium_alert_count=len([item for item in alerts if item.severity == "medium"]),
            top_industry_ratio=concentration.top_industry_ratio,
            stock_count=stock_count,
        )
        risk_level, risk_label = self._risk_level(pressure)
        drivers = self._drivers(snapshots, diagnosis_by_symbol, alerts, raw_weights)
        suggestions = self._suggestions(pressure, concentration, distribution, drivers)
        positions = self._positions(snapshots, raw_weights)

        return PortfolioRiskReport(
            scope=scope,
            horizon=horizon,
            stock_count=stock_count,
            weight_mode=weight_mode,
            total_position_weight=round(total_position_weight, 2),
            average_total_score=average_total,
            average_risk_score=average_risk,
            portfolio_risk_score=pressure,
            risk_level=risk_level,
            risk_label=risk_label,
            summary=f"{stock_count} 只标的组合风险为{risk_label}，行业集中度最高为 {concentration.top_industry}。",
            concentration=concentration,
            distribution=distribution,
            top_drivers=drivers,
            suggestions=suggestions,
            exposures=exposures,
            positions=positions,
        )

    def _weights(
        self,
        snapshots: list[StockSnapshot],
        position_weights: dict[str, float] | None,
    ) -> tuple[dict[str, float], dict[str, float], str, float]:
        valid_symbols = {snapshot.symbol for snapshot in snapshots}
        raw_weights = {
            symbol: float(weight)
            for symbol, weight in (position_weights or {}).items()
            if symbol in valid_symbols and weight > 0
        }
        total = sum(raw_weights.values())
        if raw_weights and total > 0:
            normalized = {snapshot.symbol: raw_weights.get(snapshot.symbol, 0) / total for snapshot in snapshots}
            raw = {snapshot.symbol: round(raw_weights.get(snapshot.symbol, 0), 2) for snapshot in snapshots}
            return normalized, raw, "custom", total

        equal_weight = 1 / len(snapshots)
        equal_raw = round(100 * equal_weight, 2)
        normalized = {snapshot.symbol: equal_weight for snapshot in snapshots}
        raw = {snapshot.symbol: equal_raw for snapshot in snapshots}
        return normalized, raw, "equal", 100

    def _positions(self, snapshots: list[StockSnapshot], raw_weights: dict[str, float]) -> list[PortfolioPositionWeight]:
        return [
            PortfolioPositionWeight(
                symbol=snapshot.symbol,
                name=snapshot.name,
                industry=snapshot.industry,
                weight_pct=raw_weights.get(snapshot.symbol, 0),
            )
            for snapshot in snapshots
        ]

    def _concentration(self, snapshots: list[StockSnapshot], normalized_weights: dict[str, float]) -> PortfolioRiskConcentration:
        industry_counts = Counter(snapshot.industry for snapshot in snapshots)
        industry_weights: dict[str, float] = defaultdict(float)
        for snapshot in snapshots:
            industry_weights[snapshot.industry] += normalized_weights.get(snapshot.symbol, 0)
        top_industry, top_ratio = max(industry_weights.items(), key=lambda item: item[1])
        top_count = industry_counts[top_industry]
        return PortfolioRiskConcentration(
            top_industry=top_industry,
            top_industry_count=top_count,
            top_industry_ratio=round(top_ratio, 4),
            industry_count=len(industry_counts),
        )

    def _distribution(self, diagnoses: list[DiagnosisResponse]) -> PortfolioRiskDistribution:
        high_count = len([item for item in diagnoses if item.score.risk < 60])
        medium_count = len([item for item in diagnoses if 60 <= item.score.risk < 75])
        low_count = len([item for item in diagnoses if item.score.risk >= 75])
        return PortfolioRiskDistribution(high_count=high_count, medium_count=medium_count, low_count=low_count)

    def _pressure_score(
        self,
        average_risk_score: float,
        high_alert_count: int,
        medium_alert_count: int,
        top_industry_ratio: float,
        stock_count: int,
    ) -> int:
        risk_pressure = max(0, 100 - average_risk_score)
        alert_pressure = min(30, high_alert_count * 12 + medium_alert_count * 6)
        concentration_pressure = 0
        if stock_count >= 3:
            concentration_pressure = max(0, round((top_industry_ratio - 0.34) * 45))
        return max(0, min(100, round(risk_pressure * 0.65 + alert_pressure + concentration_pressure)))

    def _risk_level(self, pressure: int) -> tuple[str, str]:
        if pressure >= 65:
            return "high", "高风险"
        if pressure >= 35:
            return "medium", "中等风险"
        return "low", "低风险"

    def _drivers(
        self,
        snapshots: list[StockSnapshot],
        diagnosis_by_symbol: dict[str, DiagnosisResponse],
        alerts: list[AlertItem],
        raw_weights: dict[str, float],
    ) -> list[PortfolioRiskDriver]:
        alerts_by_symbol: dict[str, list[AlertItem]] = defaultdict(list)
        for alert in alerts:
            alerts_by_symbol[alert.symbol].append(alert)

        drivers: list[PortfolioRiskDriver] = []
        for snapshot in snapshots:
            diagnosis = diagnosis_by_symbol.get(snapshot.symbol)
            if diagnosis is None:
                continue
            stock_alerts = alerts_by_symbol[snapshot.symbol]
            primary_risk = stock_alerts[0].title if stock_alerts else diagnosis.risks[0]
            drivers.append(
                PortfolioRiskDriver(
                    symbol=snapshot.symbol,
                    name=snapshot.name,
                    industry=snapshot.industry,
                    risk_score=diagnosis.score.risk,
                    total_score=diagnosis.score.total,
                    alert_count=len(stock_alerts),
                    primary_risk=primary_risk,
                    position_weight_pct=raw_weights.get(snapshot.symbol, 0),
                )
            )

        return sorted(drivers, key=lambda item: (item.risk_score, -item.alert_count, item.total_score))[:3]

    def _suggestions(
        self,
        pressure: int,
        concentration: PortfolioRiskConcentration,
        distribution: PortfolioRiskDistribution,
        drivers: list[PortfolioRiskDriver],
    ) -> list[str]:
        suggestions: list[str] = []
        if drivers:
            suggestions.append(f"优先复核 {drivers[0].name}：{drivers[0].primary_risk}")
        if concentration.top_industry_ratio >= 0.5 and concentration.top_industry_count >= 2:
            suggestions.append(f"{concentration.top_industry} 占比较高，注意行业共振回撤。")
        if distribution.high_count:
            suggestions.append(f"{distribution.high_count} 只标的处于高风险档，先检查风控线和事件窗口。")
        if not suggestions:
            suggestions.append("组合风险压力较低，维持常规复盘和数据刷新节奏。")
        if pressure >= 65:
            suggestions.append("风险压力偏高，降低新增操作频率，先处理高优先级预警。")
        return suggestions[:3]
