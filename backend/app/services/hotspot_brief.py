from app.schemas.diagnosis import ConceptHeatItem, HotspotBrief, IndustryHeatItem, MomentumSignalItem


class HotspotBriefService:
    def build_brief(
        self,
        industries: list[IndustryHeatItem],
        concepts: list[ConceptHeatItem],
        signals: list[MomentumSignalItem],
    ) -> HotspotBrief:
        top_industry = industries[0] if industries else None
        top_concept = concepts[0] if concepts else None
        top_signal = signals[0] if signals else None
        status = self._status(top_industry, top_concept, top_signal)
        focus_symbols = []
        for symbol in [
            top_industry.top_symbol if top_industry else None,
            top_concept.top_symbol if top_concept else None,
            top_signal.symbol if top_signal else None,
        ]:
            if symbol and symbol not in focus_symbols:
                focus_symbols.append(symbol)
        return HotspotBrief(
            status=status,
            summary=self._summary(status, top_industry, top_concept, top_signal),
            top_industry=top_industry,
            top_concept=top_concept,
            top_signal=top_signal,
            focus_symbols=focus_symbols,
        )

    def _status(
        self,
        industry: IndustryHeatItem | None,
        concept: ConceptHeatItem | None,
        signal: MomentumSignalItem | None,
    ) -> str:
        scores = [
            industry.heat_score if industry else 0,
            concept.heat_score if concept else 0,
            signal.signal_score if signal else 0,
        ]
        average = sum(scores) / len(scores)
        if average >= 82:
            return "hot"
        if average >= 66:
            return "warm"
        if average >= 52:
            return "neutral"
        return "cool"

    def _summary(
        self,
        status: str,
        industry: IndustryHeatItem | None,
        concept: ConceptHeatItem | None,
        signal: MomentumSignalItem | None,
    ) -> str:
        if not industry and not concept and not signal:
            return "暂无足够热点数据，先观察市场方向。"
        industry_text = f"行业主线为{industry.industry}" if industry else "行业主线暂不明确"
        concept_text = f"题材焦点为{concept.concept}" if concept else "题材焦点暂不明确"
        signal_text = f"异动代表为{signal.name}" if signal else "暂未出现明显异动代表"
        status_text = {
            "hot": "热点强度较高",
            "warm": "热点温和扩散",
            "neutral": "热点分化观察",
            "cool": "热点动能偏弱",
        }[status]
        return f"{status_text}，{industry_text}，{concept_text}，{signal_text}。"
