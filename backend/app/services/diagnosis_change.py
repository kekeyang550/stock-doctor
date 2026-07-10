from datetime import datetime, timezone

from app.schemas.diagnosis import DiagnosisChangeItem, DiagnosisChangeReport, DiagnosisResponse, ReportRecord


class DiagnosisChangeService:
    def build_change(
        self,
        current: DiagnosisResponse,
        previous: ReportRecord | None,
    ) -> DiagnosisChangeReport:
        if previous is None:
            return DiagnosisChangeReport(
                symbol=current.symbol,
                name=current.name,
                status="baseline",
                current_generated_at=datetime.now(timezone.utc).isoformat(),
                previous_generated_at=None,
                score_delta=0,
                technical_delta=0,
                valuation_delta=0,
                capital_delta=0,
                risk_delta=0,
                rating_changed=False,
                previous_rating=None,
                current_rating=current.rating,
                summary="暂无历史报告，当前诊断作为复盘基线。",
                changes=[
                    DiagnosisChangeItem(
                        key="baseline",
                        label="复盘基线",
                        direction="flat",
                        detail="保存当前报告后，后续诊断会自动对比变化。",
                    )
                ],
            )

        old = previous.diagnosis
        score_delta = current.score.total - old.score.total
        technical_delta = current.score.technical - old.score.technical
        valuation_delta = current.score.valuation - old.score.valuation
        capital_delta = current.score.capital - old.score.capital
        risk_delta = current.score.risk - old.score.risk
        rating_changed = current.rating != old.rating
        changes = [
            self._score_change("total", "综合评分", score_delta),
            self._score_change("technical", "技术分", technical_delta),
            self._score_change("valuation", "估值分", valuation_delta),
            self._score_change("capital", "资金分", capital_delta),
            self._score_change("risk", "风险分", risk_delta),
        ]
        if rating_changed:
            changes.insert(
                0,
                DiagnosisChangeItem(
                    key="rating",
                    label="评级变化",
                    direction="changed",
                    detail=f"评级由“{old.rating}”变为“{current.rating}”。",
                ),
            )
        status = self._status(score_delta, risk_delta, rating_changed)
        return DiagnosisChangeReport(
            symbol=current.symbol,
            name=current.name,
            status=status,
            current_generated_at=datetime.now(timezone.utc).isoformat(),
            previous_generated_at=previous.generated_at,
            score_delta=score_delta,
            technical_delta=technical_delta,
            valuation_delta=valuation_delta,
            capital_delta=capital_delta,
            risk_delta=risk_delta,
            rating_changed=rating_changed,
            previous_rating=old.rating,
            current_rating=current.rating,
            summary=self._summary(status, score_delta, risk_delta, rating_changed),
            changes=changes,
        )

    def latest_for_symbol(self, reports: list[ReportRecord], symbol: str) -> ReportRecord | None:
        normalized = symbol.strip().upper()
        for report in reports:
            if report.diagnosis.symbol.upper() == normalized:
                return report
        return None

    def _score_change(self, key: str, label: str, delta: int) -> DiagnosisChangeItem:
        if delta > 0:
            direction = "up"
            detail = f"{label}较上次提高 {delta} 分。"
        elif delta < 0:
            direction = "down"
            detail = f"{label}较上次下降 {abs(delta)} 分。"
        else:
            direction = "flat"
            detail = f"{label}与上次持平。"
        return DiagnosisChangeItem(key=key, label=label, direction=direction, detail=detail)

    def _status(self, score_delta: int, risk_delta: int, rating_changed: bool) -> str:
        if score_delta >= 5 and risk_delta >= -3:
            return "improved"
        if score_delta <= -5 or risk_delta <= -8:
            return "weakened"
        if rating_changed:
            return "changed"
        if score_delta == 0 and risk_delta == 0:
            return "flat"
        return "changed"

    def _summary(self, status: str, score_delta: int, risk_delta: int, rating_changed: bool) -> str:
        if status == "improved":
            return f"当前诊断较上次增强，综合分提升 {score_delta} 分。"
        if status == "weakened":
            return f"当前诊断较上次转弱，综合分变化 {score_delta} 分，风险分变化 {risk_delta} 分。"
        if status == "flat":
            return "当前诊断与上次基本一致。"
        if rating_changed:
            return "当前评级发生变化，建议复核触发原因。"
        return f"当前诊断有边际变化，综合分变化 {score_delta} 分。"
