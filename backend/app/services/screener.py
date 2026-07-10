from app.schemas.diagnosis import DiagnosisResponse, ScreenCandidate, StockSnapshot


class ScreenerService:
    def screen(self, snapshots: list[StockSnapshot], diagnoses: list[DiagnosisResponse], preset: str) -> list[ScreenCandidate]:
        diagnosis_by_symbol = {item.symbol: item for item in diagnoses}
        candidates = []
        for snapshot in snapshots:
            diagnosis = diagnosis_by_symbol[snapshot.symbol]
            reason = self._match_reason(snapshot, diagnosis, preset)
            if reason is None:
                continue
            candidates.append(
                ScreenCandidate(
                    symbol=snapshot.symbol,
                    name=snapshot.name,
                    industry=snapshot.industry,
                    preset=preset,
                    total_score=diagnosis.score.total,
                    change_pct=snapshot.change_pct,
                    rating=diagnosis.rating,
                    reason=reason,
                    risk_note=diagnosis.risks[0],
                )
            )
        return sorted(candidates, key=lambda item: (item.total_score, item.change_pct), reverse=True)

    def _match_reason(self, snapshot: StockSnapshot, diagnosis: DiagnosisResponse, preset: str) -> str | None:
        if preset == "strong":
            if diagnosis.score.total >= 78 and diagnosis.score.technical >= 80:
                return f"综合 {diagnosis.score.total}，技术 {diagnosis.score.technical}，趋势结构较强。"
            return None
        if preset == "value":
            if snapshot.fundamental.industry_pe_percentile <= 40 and diagnosis.score.risk >= 70:
                return f"行业估值分位 {snapshot.fundamental.industry_pe_percentile:.0f}%，风险分 {diagnosis.score.risk}。"
            return None
        if preset == "capital-risk":
            if snapshot.capital.main_inflow_million <= -100 or diagnosis.score.capital < 45:
                return f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万，资金分 {diagnosis.score.capital}。"
            return None
        return None
