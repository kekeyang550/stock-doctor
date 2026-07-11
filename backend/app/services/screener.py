from dataclasses import dataclass

from app.schemas.diagnosis import DiagnosisResponse, ScreenCandidate, StockSnapshot


@dataclass(frozen=True)
class ScreenerExplanation:
    reason: str
    rule_tags: list[str]
    positive_evidence: str
    invalidation_risk: str


class ScreenerService:
    def screen(self, snapshots: list[StockSnapshot], diagnoses: list[DiagnosisResponse], preset: str) -> list[ScreenCandidate]:
        diagnosis_by_symbol = {item.symbol: item for item in diagnoses}
        candidates = []
        for snapshot in snapshots:
            diagnosis = diagnosis_by_symbol[snapshot.symbol]
            explanation = self._match_explanation(snapshot, diagnosis, preset)
            if explanation is None:
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
                    reason=explanation.reason,
                    risk_note=diagnosis.risks[0],
                    rule_tags=explanation.rule_tags,
                    positive_evidence=explanation.positive_evidence,
                    invalidation_risk=explanation.invalidation_risk,
                )
            )
        return sorted(candidates, key=lambda item: (item.total_score, item.change_pct), reverse=True)

    def _match_explanation(
        self,
        snapshot: StockSnapshot,
        diagnosis: DiagnosisResponse,
        preset: str,
    ) -> ScreenerExplanation | None:
        if preset == "strong":
            if diagnosis.score.total >= 78 and diagnosis.score.technical >= 80:
                return ScreenerExplanation(
                    reason=f"综合 {diagnosis.score.total}，技术 {diagnosis.score.technical}，趋势结构较强。",
                    rule_tags=["综合高分", "技术强势", "趋势结构"],
                    positive_evidence=(
                        f"综合分 {diagnosis.score.total}，技术分 {diagnosis.score.technical}，"
                        f"现价高于 MA5/MA20。"
                    ),
                    invalidation_risk="若跌破 MA20 或综合评分降至 70 以下，强势假设降级。",
                )
            return None
        if preset == "value":
            if snapshot.fundamental.industry_pe_percentile <= 40 and diagnosis.score.risk >= 70:
                return ScreenerExplanation(
                    reason=f"行业估值分位 {snapshot.fundamental.industry_pe_percentile:.0f}%，风险分 {diagnosis.score.risk}。",
                    rule_tags=["估值分位较低", "风险可控", "价值观察"],
                    positive_evidence=(
                        f"行业估值分位 {snapshot.fundamental.industry_pe_percentile:.0f}%，"
                        f"风险分 {diagnosis.score.risk}。"
                    ),
                    invalidation_risk="若盈利增长转弱或风险分跌破 60，低估值观察失效。",
                )
            return None
        if preset == "capital-risk":
            if snapshot.capital.main_inflow_million <= -100 or diagnosis.score.capital < 45:
                return ScreenerExplanation(
                    reason=f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万，资金分 {diagnosis.score.capital}。",
                    rule_tags=["资金承压", "主力流出", "谨慎观察"],
                    positive_evidence="该候选用于暴露资金压力，不作为买入强信号。",
                    invalidation_risk="主力资金未恢复为正或资金分未回到 55 以上前，不宜追高。",
                )
            return None
        if preset == "breakout-volume":
            above_key_averages = snapshot.last_price > snapshot.technical.ma5 and snapshot.last_price > snapshot.technical.ma20
            volume_expanding = snapshot.technical.volume_ratio >= 1.1
            momentum_positive = snapshot.change_pct > 0 and diagnosis.score.technical >= 70
            if above_key_averages and volume_expanding and momentum_positive and not snapshot.risk.st_flag:
                return ScreenerExplanation(
                    reason=f"价格站上 MA5/MA20，量比 {snapshot.technical.volume_ratio:.2f}，技术分 {diagnosis.score.technical}。",
                    rule_tags=["站上均线", "量比放大", "动能为正"],
                    positive_evidence=(
                        f"技术分 {diagnosis.score.technical}，价格高于 MA5/MA20，"
                        f"量比 {snapshot.technical.volume_ratio:.2f}。"
                    ),
                    invalidation_risk="若跌破 MA20 或量能回落至 1.0 以下，突破假设降级。",
                )
            return None
        if preset == "capital-return":
            capital_improving = snapshot.capital.main_inflow_million >= 100 or diagnosis.score.capital >= 75
            not_overheated = snapshot.change_pct <= 3.5 and snapshot.technical.rsi14 <= 75
            risk_acceptable = diagnosis.score.risk >= 65 and not snapshot.risk.st_flag
            if capital_improving and not_overheated and risk_acceptable:
                return ScreenerExplanation(
                    reason=(
                        f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万，"
                        f"资金分 {diagnosis.score.capital}，涨幅 {snapshot.change_pct:.2f}%。"
                    ),
                    rule_tags=["资金回流", "涨幅不过热", "风险可接受"],
                    positive_evidence=(
                        f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万，"
                        f"资金分 {diagnosis.score.capital}，RSI {snapshot.technical.rsi14:.1f}。"
                    ),
                    invalidation_risk="若主力资金转负或单日涨幅过快，资金回流假设需要复核。",
                )
            return None
        if preset == "risk-avoidance":
            event_risk = snapshot.risk.st_flag or (snapshot.risk.unlock_days is not None and snapshot.risk.unlock_days <= 30)
            weak_technical = snapshot.last_price < snapshot.technical.ma20 or diagnosis.score.technical < 55
            capital_pressure = snapshot.capital.main_inflow_million <= -100 or diagnosis.score.capital < 45
            if event_risk or weak_technical or capital_pressure:
                return ScreenerExplanation(
                    reason=(
                        f"风险复核：风险分 {diagnosis.score.risk}，技术分 {diagnosis.score.technical}，"
                        f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万。"
                    ),
                    rule_tags=["风险回避", "事件/技术复核", "资金压力"],
                    positive_evidence="该候选用于提醒回避或复核，不作为机会优先信号。",
                    invalidation_risk="风险事件解除、技术分回升且资金压力缓解前，维持回避观察。",
                )
            return None
        return None
