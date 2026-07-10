from app.schemas.diagnosis import AlertItem, DiagnosisResponse, StockSnapshot


class AlertEngine:
    def build_alerts(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse) -> list[AlertItem]:
        alerts: list[AlertItem] = []

        if diagnosis.score.total >= 80 and diagnosis.score.technical >= 85:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="medium",
                    category="机会",
                    title="高分趋势候选",
                    message=f"{snapshot.name} 综合评分 {diagnosis.score.total}，技术结构较强，适合加入重点观察池。",
                    evidence=f"技术 {diagnosis.score.technical} / 资金 {diagnosis.score.capital}",
                )
            )

        if snapshot.technical.rsi14 >= 70:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="medium",
                    category="过热",
                    title="短线热度偏高",
                    message=f"{snapshot.name} RSI14 达到 {snapshot.technical.rsi14:.1f}，短线追高性价比下降。",
                    evidence=f"RSI14 {snapshot.technical.rsi14:.1f}",
                )
            )

        if snapshot.capital.main_inflow_million <= -100:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="high",
                    category="资金",
                    title="主力资金流出",
                    message=f"{snapshot.name} 主力资金净流出较明显，需要观察弱势是否延续。",
                    evidence=f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万",
                )
            )

        distance_to_risk = (snapshot.last_price - diagnosis.key_levels["risk_line"]) / snapshot.last_price
        if distance_to_risk <= 0.05:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="high",
                    category="价位",
                    title="接近风控线",
                    message=f"{snapshot.name} 当前价格距离风控线不足 5%，需关注破位风险。",
                    evidence=f"现价 {snapshot.last_price:.2f} / 风控线 {diagnosis.key_levels['risk_line']:.2f}",
                )
            )

        unlock_days = snapshot.risk.unlock_days
        if unlock_days is not None and unlock_days <= 30:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="high",
                    category="事件",
                    title="临近解禁窗口",
                    message=f"{snapshot.name} {unlock_days} 天内存在解禁窗口，需关注筹码供给冲击。",
                    evidence=f"解禁倒计时 {unlock_days} 天",
                )
            )

        if not alerts and diagnosis.score.total >= 64:
            alerts.append(
                self._alert(
                    snapshot,
                    diagnosis,
                    severity="low",
                    category="观察",
                    title="结构稳定观察",
                    message=f"{snapshot.name} 未触发重大预警，维持常规观察。",
                    evidence=f"综合评分 {diagnosis.score.total}",
                )
            )

        return alerts

    def _alert(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        severity: str,
        category: str,
        title: str,
        message: str,
        evidence: str,
    ) -> AlertItem:
        return AlertItem(
            id=f"{snapshot.symbol}-{category}-{title}",
            symbol=snapshot.symbol,
            name=snapshot.name,
            industry=snapshot.industry,
            severity=severity,
            category=category,
            title=title,
            message=message,
            evidence=evidence,
            score=diagnosis.score.total,
            as_of=snapshot.as_of,
        )
