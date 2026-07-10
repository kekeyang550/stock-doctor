from app.schemas.diagnosis import DiagnosisResponse, DiagnosisThesis, StockSnapshot, ThesisEvidence


class ThesisService:
    def build_thesis(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse) -> DiagnosisThesis:
        positive = [item for item in diagnosis.evidence if item.polarity == "positive"]
        negative = [item for item in diagnosis.evidence if item.polarity == "negative"]
        neutral = [item for item in diagnosis.evidence if item.polarity == "neutral"]
        confidence = self._confidence(diagnosis, len(positive), len(negative))
        stance = self._stance(diagnosis.score.total, diagnosis.score.risk, len(negative))
        return DiagnosisThesis(
            symbol=snapshot.symbol,
            name=snapshot.name,
            horizon=diagnosis.horizon,
            stance=stance,
            confidence=confidence,
            bull_case=self._bull_case(snapshot, diagnosis, positive),
            bear_case=self._bear_case(snapshot, diagnosis, negative),
            trigger=self._trigger(snapshot, diagnosis),
            invalidation=self._invalidation(diagnosis),
            evidence=self._weighted_evidence(diagnosis, positive, negative, neutral),
            next_checks=self._next_checks(snapshot, diagnosis),
        )

    def _confidence(self, diagnosis: DiagnosisResponse, positive_count: int, negative_count: int) -> int:
        score_gap = abs(diagnosis.score.total - 50)
        evidence_balance = max(0, positive_count - negative_count) * 4
        risk_penalty = max(0, 70 - diagnosis.score.risk) // 2
        return max(35, min(95, 48 + score_gap + evidence_balance - risk_penalty))

    def _stance(self, total: int, risk: int, negative_count: int) -> str:
        if total >= 76 and risk >= 65 and negative_count <= 2:
            return "bullish"
        if total < 58 or risk < 55:
            return "defensive"
        return "balanced"

    def _bull_case(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse, positive) -> str:
        lead = positive[0].interpretation if positive else "优势证据仍需等待确认"
        return f"{snapshot.name}的多头假设来自{lead}，综合评分 {diagnosis.score.total}。"

    def _bear_case(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse, negative) -> str:
        lead = (negative[0].interpretation if negative else diagnosis.risks[0]).rstrip("。")
        return f"{snapshot.name}的空头假设主要是{lead}。"

    def _trigger(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse) -> str:
        pressure = diagnosis.key_levels["pressure"]
        pivot = diagnosis.key_levels["pivot"]
        if diagnosis.score.total >= 76:
            return f"价格放量站稳中枢 {pivot:.2f} 后，观察能否挑战压力位 {pressure:.2f}。"
        return f"先观察价格能否重新站上中枢 {pivot:.2f}，并配合资金回流。"

    def _invalidation(self, diagnosis: DiagnosisResponse) -> str:
        return f"若跌破风控线 {diagnosis.key_levels['risk_line']:.2f} 或核心风险继续升温，当前假设失效。"

    def _weighted_evidence(self, diagnosis: DiagnosisResponse, positive, negative, neutral) -> list[ThesisEvidence]:
        items: list[ThesisEvidence] = []
        for evidence in positive[:3]:
            items.append(
                ThesisEvidence(
                    label=evidence.label,
                    side="bull",
                    weight=self._weight_for_label(evidence.label, diagnosis),
                    detail=evidence.interpretation,
                )
            )
        for evidence in negative[:3]:
            items.append(
                ThesisEvidence(
                    label=evidence.label,
                    side="bear",
                    weight=self._weight_for_label(evidence.label, diagnosis),
                    detail=evidence.interpretation,
                )
            )
        for evidence in neutral[:2]:
            items.append(
                ThesisEvidence(
                    label=evidence.label,
                    side="neutral",
                    weight=35,
                    detail=evidence.interpretation,
                )
            )
        return sorted(items, key=lambda item: item.weight, reverse=True)

    def _weight_for_label(self, label: str, diagnosis: DiagnosisResponse) -> int:
        if label in {"均线结构", "MACD", "RSI14", "量比"}:
            return max(35, min(95, diagnosis.score.technical))
        if label in {"主力资金", "北向资金", "换手率"}:
            return max(35, min(95, diagnosis.score.capital))
        if label in {"行业估值分位", "ROE", "成长性"}:
            return max(35, min(95, diagnosis.score.valuation))
        if label == "风险规则":
            return max(35, min(95, 100 - diagnosis.score.risk))
        return 50

    def _next_checks(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse) -> list[str]:
        checks = [
            f"复核 {snapshot.as_of} 后的价格是否仍在中枢 {diagnosis.key_levels['pivot']:.2f} 附近。",
            "确认主力资金与北向资金是否连续两日同向。",
            "检查最新公告、业绩预告和限售解禁变化。",
        ]
        if diagnosis.score.risk < 70:
            checks.insert(0, "优先复核风险项是否已经缓解。")
        return checks[:4]
