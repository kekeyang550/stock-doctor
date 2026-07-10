from app.schemas.diagnosis import MomentumSignalItem, StockSnapshot


class MomentumSignalService:
    def build_signals(self, snapshots: list[StockSnapshot], limit: int = 12) -> list[MomentumSignalItem]:
        signals = [self._build_signal(snapshot) for snapshot in snapshots]
        active = [signal for signal in signals if signal.signal_score >= 45]
        return sorted(active, key=lambda item: (item.signal_score, item.change_pct), reverse=True)[:limit]

    def _build_signal(self, snapshot: StockSnapshot) -> MomentumSignalItem:
        score = 38
        reasons = []
        if snapshot.change_pct >= 9.8:
            score += 28
            reasons.append("接近涨停")
        elif snapshot.change_pct >= 3:
            score += 16
            reasons.append("涨幅居前")
        elif snapshot.change_pct <= -3:
            score -= 8
            reasons.append("短线承压")

        if snapshot.technical.volume_ratio >= 1.5:
            score += 16
            reasons.append("量比放大")
        elif snapshot.technical.volume_ratio < 0.8:
            score -= 6
            reasons.append("量能不足")

        if snapshot.capital.main_inflow_million >= 200:
            score += 18
            reasons.append("主力净流入明显")
        elif snapshot.capital.main_inflow_million <= -100:
            score -= 12
            reasons.append("主力净流出")

        if snapshot.risk.st_flag:
            score -= 18
            reasons.append("ST 风险")

        signal_score = max(0, min(100, round(score)))
        return MomentumSignalItem(
            symbol=snapshot.symbol,
            name=snapshot.name,
            industry=snapshot.industry,
            signal_score=signal_score,
            change_pct=snapshot.change_pct,
            volume_ratio=snapshot.technical.volume_ratio,
            main_inflow_million=snapshot.capital.main_inflow_million,
            signal_level=self._level(signal_score, snapshot.change_pct),
            title=self._title(signal_score, snapshot.change_pct),
            reason="；".join(reasons) if reasons else "短线异动不明显，保持观察。",
        )

    def _level(self, score: int, change_pct: float) -> str:
        if change_pct >= 9.8 or score >= 84:
            return "limit-watch"
        if score >= 70:
            return "surging"
        if score >= 55:
            return "active"
        return "cooling"

    def _title(self, score: int, change_pct: float) -> str:
        if change_pct >= 9.8:
            return "涨停观察"
        if score >= 70:
            return "强势异动"
        if score >= 55:
            return "活跃跟踪"
        return "降温观察"
