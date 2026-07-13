from app.schemas.diagnosis import ChecklistItem, DiagnosisResponse, EvidenceItem, ScoreBreakdown, StockSnapshot


class DiagnosisEngine:
    def diagnose(self, snapshot: StockSnapshot, horizon: str) -> DiagnosisResponse:
        technical_score, technical_evidence = self._score_technical(snapshot)
        valuation_score, valuation_evidence = self._score_valuation(snapshot)
        capital_score, capital_evidence = self._score_capital(snapshot)
        risk_score, risks, risk_evidence = self._score_risk(snapshot)

        total = round(
            technical_score * 0.36
            + valuation_score * 0.24
            + capital_score * 0.24
            + risk_score * 0.16
        )
        rating, verdict = self._rating(total, risks)
        key_levels = self._key_levels(snapshot)
        evidence = technical_evidence + valuation_evidence + capital_evidence + risk_evidence
        checklist = self._checklist(snapshot, total, capital_score, key_levels)
        summary = self._summary(snapshot, rating, verdict, evidence, risks)

        return DiagnosisResponse(
            symbol=snapshot.symbol,
            name=snapshot.name,
            industry=snapshot.industry,
            as_of=snapshot.as_of,
            horizon=horizon,
            verdict=verdict,
            rating=rating,
            score=ScoreBreakdown(
                technical=technical_score,
                valuation=valuation_score,
                capital=capital_score,
                risk=risk_score,
                total=total,
            ),
            key_levels=key_levels,
            evidence=evidence,
            checklist=checklist,
            risks=risks,
            summary=summary,
            disclaimer="本系统仅用于研究与信息整理，不构成任何投资建议或收益承诺。",
        )

    def _score_technical(self, snapshot: StockSnapshot) -> tuple[int, list[EvidenceItem]]:
        tech = snapshot.technical
        score = 50
        evidence: list[EvidenceItem] = []

        if snapshot.last_price > tech.ma5 > tech.ma20 > tech.ma60:
            score += 24
            evidence.append(EvidenceItem(label="均线结构", value="价格 > MA5 > MA20 > MA60", interpretation="中短期趋势排列较强", polarity="positive"))
        elif snapshot.last_price < tech.ma20:
            score -= 14
            evidence.append(EvidenceItem(label="均线结构", value="价格低于 MA20", interpretation="短期趋势偏弱，需要等待修复", polarity="negative"))
        else:
            evidence.append(EvidenceItem(label="均线结构", value="价格贴近中期均线", interpretation="趋势处于观察区", polarity="neutral"))

        if tech.macd > 0:
            score += 8
            evidence.append(EvidenceItem(label="MACD", value=f"{tech.macd:.2f}", interpretation="动能仍在零轴上方", polarity="positive"))
        else:
            score -= 8
            evidence.append(EvidenceItem(label="MACD", value=f"{tech.macd:.2f}", interpretation="动能偏弱", polarity="negative"))

        if tech.rsi14 >= 72:
            score -= 6
            evidence.append(EvidenceItem(label="RSI14", value=f"{tech.rsi14:.1f}", interpretation="短线偏热，追高性价比下降", polarity="negative"))
        elif tech.rsi14 >= 55:
            score += 8
            evidence.append(EvidenceItem(label="RSI14", value=f"{tech.rsi14:.1f}", interpretation="强弱适中偏强", polarity="positive"))
        elif tech.rsi14 < 42:
            score -= 6
            evidence.append(EvidenceItem(label="RSI14", value=f"{tech.rsi14:.1f}", interpretation="弱势区间", polarity="negative"))

        if tech.volume_ratio > 1.4 and snapshot.change_pct > 0:
            score += 8
            evidence.append(EvidenceItem(label="量比", value=f"{tech.volume_ratio:.2f}", interpretation="放量上涨，资金关注度提升", polarity="positive"))
        elif tech.volume_ratio < 0.8:
            score -= 4
            evidence.append(EvidenceItem(label="量比", value=f"{tech.volume_ratio:.2f}", interpretation="成交活跃度不足", polarity="neutral"))

        return self._clamp(score), evidence

    def _score_valuation(self, snapshot: StockSnapshot) -> tuple[int, list[EvidenceItem]]:
        base = snapshot.fundamental
        score = 50
        evidence: list[EvidenceItem] = []

        if base.industry_pe_percentile <= 35:
            score += 14
            evidence.append(EvidenceItem(label="行业估值分位", value=f"{base.industry_pe_percentile:.0f}%", interpretation="估值位于行业相对低位", polarity="positive"))
        elif base.industry_pe_percentile >= 75:
            score -= 14
            evidence.append(EvidenceItem(label="行业估值分位", value=f"{base.industry_pe_percentile:.0f}%", interpretation="估值相对偏贵", polarity="negative"))
        else:
            evidence.append(EvidenceItem(label="行业估值分位", value=f"{base.industry_pe_percentile:.0f}%", interpretation="估值处于行业中段", polarity="neutral"))

        if base.roe >= 18:
            score += 16
            evidence.append(EvidenceItem(label="ROE", value=f"{base.roe:.1f}%", interpretation="盈利质量较强", polarity="positive"))
        elif base.roe < 8:
            score -= 12
            evidence.append(EvidenceItem(label="ROE", value=f"{base.roe:.1f}%", interpretation="资本回报偏低", polarity="negative"))

        growth_avg = (base.revenue_growth + base.profit_growth) / 2
        if growth_avg >= 12:
            score += 12
            evidence.append(EvidenceItem(label="成长性", value=f"{growth_avg:.1f}%", interpretation="收入与利润增速较好", polarity="positive"))
        elif growth_avg < 4:
            score -= 8
            evidence.append(EvidenceItem(label="成长性", value=f"{growth_avg:.1f}%", interpretation="增长弹性不足", polarity="negative"))

        if base.gross_margin is not None:
            if base.gross_margin >= 35:
                score += 6
                evidence.append(EvidenceItem(label="毛利率", value=f"{base.gross_margin:.1f}%", interpretation="产品盈利空间较好", polarity="positive"))
            elif base.gross_margin < 15:
                score -= 5
                evidence.append(EvidenceItem(label="毛利率", value=f"{base.gross_margin:.1f}%", interpretation="毛利空间偏窄", polarity="negative"))
        if base.debt_to_assets is not None:
            if base.debt_to_assets >= 70:
                score -= 6
                evidence.append(EvidenceItem(label="资产负债率", value=f"{base.debt_to_assets:.1f}%", interpretation="财务杠杆偏高", polarity="negative"))
            elif base.debt_to_assets <= 35:
                score += 4
                evidence.append(EvidenceItem(label="资产负债率", value=f"{base.debt_to_assets:.1f}%", interpretation="资产负债结构较轻", polarity="positive"))
        if base.eps is not None and base.eps <= 0:
            score -= 4
            evidence.append(EvidenceItem(label="每股收益", value=f"{base.eps:.2f}", interpretation="每股收益为非正，需复核盈利质量", polarity="negative"))

        return self._clamp(score), evidence

    def _score_capital(self, snapshot: StockSnapshot) -> tuple[int, list[EvidenceItem]]:
        capital = snapshot.capital
        score = 50
        evidence: list[EvidenceItem] = []

        if capital.main_inflow_million > 200:
            score += 18
            evidence.append(EvidenceItem(label="主力资金", value=f"{capital.main_inflow_million:.1f} 百万", interpretation="主力净流入明显", polarity="positive"))
        elif capital.main_inflow_million < -100:
            score -= 14
            evidence.append(EvidenceItem(label="主力资金", value=f"{capital.main_inflow_million:.1f} 百万", interpretation="主力资金净流出", polarity="negative"))
        else:
            evidence.append(EvidenceItem(label="主力资金", value=f"{capital.main_inflow_million:.1f} 百万", interpretation="资金变化温和", polarity="neutral"))

        if capital.northbound_inflow_million > 100:
            score += 10
            evidence.append(EvidenceItem(label="北向资金", value=f"{capital.northbound_inflow_million:.1f} 百万", interpretation="外资偏积极", polarity="positive"))
        elif capital.northbound_inflow_million < -80:
            score -= 8
            evidence.append(EvidenceItem(label="北向资金", value=f"{capital.northbound_inflow_million:.1f} 百万", interpretation="外资短线减持", polarity="negative"))

        if capital.turnover_rate > 3.5:
            score -= 6
            evidence.append(EvidenceItem(label="换手率", value=f"{capital.turnover_rate:.2f}%", interpretation="筹码波动偏高", polarity="negative"))

        return self._clamp(score), evidence

    def _score_risk(self, snapshot: StockSnapshot) -> tuple[int, list[str], list[EvidenceItem]]:
        risk = snapshot.risk
        score = 82
        risks: list[str] = []
        evidence: list[EvidenceItem] = []

        if risk.st_flag:
            score -= 35
            risks.append("ST 标记股票，退市与流动性风险显著。")
        if risk.pledge_ratio >= 20:
            score -= 18
            risks.append("股权质押比例较高，需跟踪平仓和补充质押风险。")
        elif risk.pledge_ratio >= 8:
            score -= 8
            risks.append("存在一定股权质押压力。")

        if risk.unlock_days is not None and risk.unlock_days <= 30:
            score -= 10
            risks.append(f"{risk.unlock_days} 天内存在解禁窗口，需关注供给冲击。")

        if risk.limit_up_streak >= 3:
            score -= 12
            risks.append("连续涨停后波动率放大，短线回撤风险提升。")

        if not risks:
            risks.append("暂未触发重大规则风险，但仍需关注公告、业绩和市场系统性波动。")

        evidence.append(EvidenceItem(label="风险规则", value=f"{len(risks)} 项", interpretation=risks[0], polarity="neutral" if score >= 70 else "negative"))
        return self._clamp(score), risks, evidence

    def _key_levels(self, snapshot: StockSnapshot) -> dict[str, float]:
        tech = snapshot.technical
        support = min(tech.ma20, tech.ma60)
        pivot = tech.ma5
        pressure = round(snapshot.last_price * (1.055 if snapshot.change_pct >= 0 else 1.035), 2)
        stop_watch = round(support * 0.97, 2)
        return {
            "support": round(support, 2),
            "pivot": round(pivot, 2),
            "pressure": pressure,
            "risk_line": stop_watch,
        }

    def _rating(self, total: int, risks: list[str]) -> tuple[str, str]:
        severe = any("ST" in item or "质押比例较高" in item for item in risks)
        if severe and total < 70:
            return "风险优先", "风险升高，先观察"
        if total >= 78:
            return "强势关注", "趋势和质量较优"
        if total >= 64:
            return "稳健观察", "结构尚可，等待确认"
        if total >= 50:
            return "中性震荡", "多空证据分化"
        return "谨慎回避", "弱势或风险占优"

    def _checklist(
        self,
        snapshot: StockSnapshot,
        total: int,
        capital_score: int,
        key_levels: dict[str, float],
    ) -> list[ChecklistItem]:
        items = [
            ChecklistItem(
                id="observe-levels",
                title="观察关键价位",
                detail=(
                    f"支撑 {key_levels['support']:.2f}，风控 {key_levels['risk_line']:.2f}，"
                    f"压力 {key_levels['pressure']:.2f}。"
                ),
                status="watch",
                priority="medium",
            )
        ]

        if total >= 78:
            items.append(
                ChecklistItem(
                    id="track-momentum",
                    title="跟踪强势延续",
                    detail=f"若价格维持在 MA5 {snapshot.technical.ma5:.2f} 上方且量能不明显萎缩，继续观察趋势延续。",
                    status="pending",
                    priority="medium",
                )
            )

        if capital_score < 45 or snapshot.capital.main_inflow_million < -100:
            items.append(
                ChecklistItem(
                    id="review-capital-flow",
                    title="复核资金流向",
                    detail=f"主力净流入 {snapshot.capital.main_inflow_million:.1f} 百万，观察是否连续流出。",
                    status="pending",
                    priority="high",
                )
            )

        if snapshot.technical.rsi14 >= 70:
            items.append(
                ChecklistItem(
                    id="wait-heat-cooldown",
                    title="等待热度降温",
                    detail=f"RSI14 为 {snapshot.technical.rsi14:.1f}，短线热度偏高，等待回落或换手消化。",
                    status="pending",
                    priority="medium",
                )
            )

        if snapshot.risk.unlock_days is not None and snapshot.risk.unlock_days <= 30:
            items.append(
                ChecklistItem(
                    id="track-unlock-window",
                    title="跟踪解禁窗口",
                    detail=f"{snapshot.risk.unlock_days} 天内存在解禁窗口，关注公告和成交变化。",
                    status="pending",
                    priority="high",
                )
            )

        if total < 55:
            items.append(
                ChecklistItem(
                    id="weakness-review",
                    title="弱势复核",
                    detail=f"综合评分 {total}，先确认趋势修复和资金回流。",
                    status="pending",
                    priority="high",
                )
            )

        return items

    def _summary(
        self,
        snapshot: StockSnapshot,
        rating: str,
        verdict: str,
        evidence: list[EvidenceItem],
        risks: list[str],
    ) -> str:
        positives = [item.interpretation for item in evidence if item.polarity == "positive"]
        negatives = [item.interpretation for item in evidence if item.polarity == "negative"]
        lead_positive = positives[0] if positives else "优势信号暂不突出"
        lead_negative = negatives[0] if negatives else "负面信号暂未集中"
        return (
            f"{snapshot.name}当前评级为“{rating}”，结论为“{verdict}”。"
            f"主要支撑来自{lead_positive}；需要留意{lead_negative}。"
            f"风险侧提示：{risks[0]}"
        )

    def _clamp(self, score: int) -> int:
        return max(0, min(100, round(score)))
