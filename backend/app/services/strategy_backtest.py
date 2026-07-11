from dataclasses import dataclass

from app.schemas.diagnosis import (
    DiagnosisResponse,
    HistoricalPriceBar,
    StockSnapshot,
    StrategyBacktestComparison,
    StrategyBacktestPeriodSummary,
    StrategyBacktestPresetComparison,
    StrategyBacktestPresetSummary,
    StrategyBacktestReport,
    StrategyBacktestTrade,
    TrendPoint,
    TrendSeries,
)
from app.services.providers import MarketDataProvider
from app.services.screener import ScreenerService
from app.services.trend import TrendService


@dataclass(frozen=True)
class PriceSeriesResult:
    series: TrendSeries
    source: str
    history_bar_count: int
    history_last_date: str | None
    fallback_reason: str | None


class StrategyBacktestService:
    DEFAULT_PERIODS = [3, 5, 10, 20]
    DEFAULT_PRESETS = ["strong", "value", "capital-risk"]
    PRESET_LABELS = {
        "strong": "强势关注",
        "value": "低估值观察",
        "capital-risk": "资金承压",
        "breakout-volume": "放量突破",
        "capital-return": "资金回流",
        "risk-avoidance": "风险回避",
    }

    def __init__(
        self,
        screener_service: ScreenerService | None = None,
        trend_service: TrendService | None = None,
        market_data_provider: MarketDataProvider | None = None,
    ) -> None:
        self._screener_service = screener_service or ScreenerService()
        self._trend_service = trend_service or TrendService()
        self._market_data_provider = market_data_provider

    def run(
        self,
        preset: str,
        horizon: str,
        snapshots: list[StockSnapshot],
        diagnoses: list[DiagnosisResponse],
        holding_days: int = 5,
        limit: int = 8,
        fee_bps: float = 5,
        slippage_bps: float = 10,
    ) -> StrategyBacktestReport:
        holding_days = max(1, min(holding_days, 20))
        limit = max(1, min(limit, 30))
        fee_bps = max(0.0, min(float(fee_bps), 100.0))
        slippage_bps = max(0.0, min(float(slippage_bps), 100.0))
        round_trip_cost_pct = self._round_trip_cost_pct(fee_bps, slippage_bps)
        snapshot_by_symbol = {item.symbol: item for item in snapshots}
        candidates = self._screener_service.screen(snapshots=snapshots, diagnoses=diagnoses, preset=preset)
        trades: list[StrategyBacktestTrade] = []
        used_historical = False
        historical_counts: list[int] = []
        historical_last_dates: list[str] = []
        fallback_reasons: list[str] = []

        for candidate in candidates[:limit]:
            snapshot = snapshot_by_symbol.get(candidate.symbol)
            if snapshot is None:
                continue
            price_series = self._price_series(snapshot, holding_days)
            used_historical = used_historical or price_series.source == "historical-kline"
            if price_series.source == "historical-kline":
                historical_counts.append(price_series.history_bar_count)
                if price_series.history_last_date:
                    historical_last_dates.append(price_series.history_last_date)
            elif price_series.fallback_reason:
                fallback_reasons.append(price_series.fallback_reason)
            trade = self._build_trade(snapshot, candidate.reason, candidate.rule_tags, price_series, holding_days, round_trip_cost_pct)
            if trade is not None:
                trades.append(trade)

        returns = [trade.return_pct for trade in trades]
        average_return = sum(returns) / len(returns) if returns else 0.0
        win_rate = (sum(1 for value in returns if value > 0) / len(returns) * 100) if returns else 0.0
        best_return = max(returns) if returns else 0.0
        worst_return = min(returns) if returns else 0.0
        max_drawdown = min((trade.max_drawdown_pct for trade in trades), default=0.0)
        return_drawdown_ratio = self._return_drawdown_ratio(average_return, max_drawdown)

        return StrategyBacktestReport(
            preset=preset,
            horizon=horizon,
            holding_days=holding_days,
            price_source="historical-kline" if used_historical else "synthetic-trend",
            history_bar_count=min(historical_counts) if historical_counts else 0,
            history_last_date=max(historical_last_dates) if historical_last_dates else None,
            fallback_reason=self._fallback_reason(used_historical, fallback_reasons),
            fee_bps=fee_bps,
            slippage_bps=slippage_bps,
            round_trip_cost_pct=round(round_trip_cost_pct, 2),
            sample_size=len(snapshots),
            match_count=len(candidates),
            trade_count=len(trades),
            win_rate=round(win_rate, 1),
            average_return_pct=round(average_return, 2),
            best_return_pct=round(best_return, 2),
            worst_return_pct=round(worst_return, 2),
            max_drawdown_pct=round(max_drawdown, 2),
            return_drawdown_ratio=return_drawdown_ratio,
            summary=self._summary(preset, len(candidates), trades, average_return, max_drawdown),
            rule_notes=self._rule_notes(preset),
            trades=sorted(trades, key=lambda item: item.return_pct, reverse=True),
        )

    def compare_periods(
        self,
        preset: str,
        horizon: str,
        snapshots: list[StockSnapshot],
        diagnoses: list[DiagnosisResponse],
        periods: list[int] | None = None,
        limit: int = 8,
        fee_bps: float = 5,
        slippage_bps: float = 10,
    ) -> StrategyBacktestComparison:
        normalized_periods = self._normalize_periods(periods)
        reports = [
            self.run(
                preset=preset,
                horizon=horizon,
                snapshots=snapshots,
                diagnoses=diagnoses,
                holding_days=holding_days,
                limit=limit,
                fee_bps=fee_bps,
                slippage_bps=slippage_bps,
            )
            for holding_days in normalized_periods
        ]
        summaries = [
            StrategyBacktestPeriodSummary(
                holding_days=report.holding_days,
                price_source=report.price_source,
                history_bar_count=report.history_bar_count,
                history_last_date=report.history_last_date,
                fallback_reason=report.fallback_reason,
                trade_count=report.trade_count,
                win_rate=report.win_rate,
                average_return_pct=report.average_return_pct,
                max_drawdown_pct=report.max_drawdown_pct,
                return_drawdown_ratio=report.return_drawdown_ratio,
            )
            for report in reports
        ]
        recommended = self._recommend_period(summaries)
        return StrategyBacktestComparison(
            preset=preset,
            horizon=horizon,
            sample_size=reports[0].sample_size if reports else len(snapshots),
            match_count=reports[0].match_count if reports else 0,
            recommended_holding_days=recommended.holding_days if recommended else None,
            periods=summaries,
            recommendation_reason=self._period_recommendation_reason(recommended),
            summary=self._comparison_summary(preset, summaries, recommended),
        )

    def compare_presets(
        self,
        presets: list[str] | None,
        horizon: str,
        snapshots: list[StockSnapshot],
        diagnoses: list[DiagnosisResponse],
        holding_days: int = 5,
        limit: int = 8,
        fee_bps: float = 5,
        slippage_bps: float = 10,
    ) -> StrategyBacktestPresetComparison:
        selected_presets = self._normalize_presets(presets)
        reports = [
            self.run(
                preset=preset,
                horizon=horizon,
                snapshots=snapshots,
                diagnoses=diagnoses,
                holding_days=holding_days,
                limit=limit,
                fee_bps=fee_bps,
                slippage_bps=slippage_bps,
            )
            for preset in selected_presets
        ]
        summaries = [
            StrategyBacktestPresetSummary(
                preset=report.preset,
                label=self.PRESET_LABELS.get(report.preset, report.preset),
                holding_days=report.holding_days,
                price_source=report.price_source,
                history_bar_count=report.history_bar_count,
                history_last_date=report.history_last_date,
                fallback_reason=report.fallback_reason,
                match_count=report.match_count,
                trade_count=report.trade_count,
                win_rate=report.win_rate,
                average_return_pct=report.average_return_pct,
                max_drawdown_pct=report.max_drawdown_pct,
                return_drawdown_ratio=report.return_drawdown_ratio,
            )
            for report in reports
        ]
        recommended = self._recommend_preset(summaries)
        return StrategyBacktestPresetComparison(
            horizon=horizon,
            holding_days=reports[0].holding_days if reports else max(1, min(holding_days, 20)),
            sample_size=reports[0].sample_size if reports else len(snapshots),
            recommended_preset=recommended.preset if recommended else None,
            presets=summaries,
            recommendation_reason=self._preset_recommendation_reason(recommended),
            summary=self._preset_comparison_summary(summaries, recommended),
        )

    def _normalize_periods(self, periods: list[int] | None) -> list[int]:
        selected: list[int] = []
        for value in periods or self.DEFAULT_PERIODS:
            holding_days = max(1, min(int(value), 20))
            if holding_days not in selected:
                selected.append(holding_days)
        return selected or self.DEFAULT_PERIODS.copy()

    def _normalize_presets(self, presets: list[str] | None) -> list[str]:
        selected: list[str] = []
        for preset in presets or self.DEFAULT_PRESETS:
            value = preset.strip()
            if value and value not in selected:
                selected.append(value)
        return selected or self.DEFAULT_PRESETS.copy()

    def _recommend_period(self, periods: list[StrategyBacktestPeriodSummary]) -> StrategyBacktestPeriodSummary | None:
        if not periods:
            return None
        return max(
            periods,
            key=lambda period: (
                period.return_drawdown_ratio,
                period.average_return_pct,
                period.max_drawdown_pct,
                period.win_rate,
                -period.holding_days,
            ),
        )

    def _recommend_preset(self, presets: list[StrategyBacktestPresetSummary]) -> StrategyBacktestPresetSummary | None:
        if not presets:
            return None
        return max(
            presets,
            key=lambda preset: (
                preset.return_drawdown_ratio,
                preset.average_return_pct,
                preset.max_drawdown_pct,
                preset.win_rate,
                preset.trade_count,
            ),
        )

    def _comparison_summary(
        self,
        preset: str,
        periods: list[StrategyBacktestPeriodSummary],
        recommended: StrategyBacktestPeriodSummary | None,
    ) -> str:
        if not periods:
            return f"{preset} 暂无可比较的样例周期。"
        if recommended is None:
            return f"{preset} 已生成 {len(periods)} 个周期样例摘要，暂无推荐周期。"
        return (
            f"{preset} 已比较 {len(periods)} 个持有周期，"
            f"当前样例推荐 {recommended.holding_days} 日，"
            f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%。"
        )

    def _preset_comparison_summary(
        self,
        presets: list[StrategyBacktestPresetSummary],
        recommended: StrategyBacktestPresetSummary | None,
    ) -> str:
        if not presets:
            return "暂无可比较的策略样例。"
        if recommended is None:
            return f"已生成 {len(presets)} 个策略样例摘要，暂无推荐策略。"
        return (
            f"已比较 {len(presets)} 个策略，当前样例推荐 {recommended.label}，"
            f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%。"
        )

    def _period_recommendation_reason(self, recommended: StrategyBacktestPeriodSummary | None) -> str | None:
        if recommended is None:
            return None
        return (
            f"推荐 {recommended.holding_days} 日，因为收益回撤比 {recommended.return_drawdown_ratio:.2f}，"
            f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%，"
            f"胜率 {recommended.win_rate:.1f}%。"
        )

    def _preset_recommendation_reason(self, recommended: StrategyBacktestPresetSummary | None) -> str | None:
        if recommended is None:
            return None
        return (
            f"推荐 {recommended.label}，因为收益回撤比 {recommended.return_drawdown_ratio:.2f}，"
            f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%，"
            f"胜率 {recommended.win_rate:.1f}%，交易 {recommended.trade_count} 笔。"
        )

    def _return_drawdown_ratio(self, average_return_pct: float, max_drawdown_pct: float) -> float:
        if max_drawdown_pct == 0:
            return 0.0
        return round(average_return_pct / abs(max_drawdown_pct), 2)

    def _build_trade(
        self,
        snapshot: StockSnapshot,
        signal_reason: str,
        rule_tags: list[str],
        price_series: PriceSeriesResult,
        holding_days: int,
        cost_pct: float,
    ) -> StrategyBacktestTrade | None:
        points = price_series.series.points
        if len(points) < 2:
            return None

        entry_index = max(0, len(points) - holding_days - 1)
        exit_index = len(points) - 1
        entry = points[entry_index]
        exit_point = points[exit_index]
        if entry.close <= 0:
            return None

        window = points[entry_index:exit_index + 1]
        gross_return_pct = ((exit_point.close - entry.close) / entry.close) * 100
        return_pct = gross_return_pct - cost_pct
        max_drawdown_pct = self._max_drawdown(window)

        return StrategyBacktestTrade(
            symbol=snapshot.symbol,
            name=snapshot.name,
            industry=snapshot.industry,
            entry_date=entry.date,
            exit_date=exit_point.date,
            entry_price=entry.close,
            exit_price=exit_point.close,
            gross_return_pct=round(gross_return_pct, 2),
            cost_pct=round(cost_pct, 2),
            return_pct=round(return_pct, 2),
            max_drawdown_pct=round(max_drawdown_pct, 2),
            holding_days=exit_index - entry_index,
            price_source=price_series.source,
            history_bar_count=price_series.history_bar_count,
            history_last_date=price_series.history_last_date,
            fallback_reason=price_series.fallback_reason,
            rule_tags=rule_tags,
            signal_reason=signal_reason,
        )

    def _price_series(self, snapshot: StockSnapshot, holding_days: int) -> PriceSeriesResult:
        requested_days = max(holding_days + 5, 60)
        historical_points, failure_reason = self._historical_points(snapshot.symbol, days=requested_days)
        if len(historical_points) >= holding_days + 1:
            return PriceSeriesResult(
                series=self._series_from_points(snapshot, historical_points),
                source="historical-kline",
                history_bar_count=len(historical_points),
                history_last_date=historical_points[-1].date,
                fallback_reason=None,
            )
        reason = failure_reason or "历史K线样本不足，已回退样例趋势"
        return PriceSeriesResult(
            series=self._trend_service.build_series(snapshot=snapshot, days=max(holding_days + 5, 20)),
            source="synthetic-trend",
            history_bar_count=0,
            history_last_date=None,
            fallback_reason=reason,
        )

    def _historical_points(self, symbol: str, days: int) -> tuple[list[TrendPoint], str | None]:
        if self._market_data_provider is None:
            return [], "未配置历史行情 provider，已回退样例趋势"
        try:
            bars = self._market_data_provider.get_price_history(symbol, days=days)
        except Exception:
            return [], "历史行情读取失败，已回退样例趋势"
        return self._bars_to_points(bars), None

    def _fallback_reason(self, used_historical: bool, reasons: list[str]) -> str | None:
        if not reasons:
            return None
        if used_historical:
            return "部分标的历史K线不可用，已混合使用样例趋势"
        return reasons[0]

    def _round_trip_cost_pct(self, fee_bps: float, slippage_bps: float) -> float:
        return (fee_bps + slippage_bps) * 2 / 100

    def _bars_to_points(self, bars: list[HistoricalPriceBar]) -> list[TrendPoint]:
        points: list[TrendPoint] = []
        closes: list[float] = []
        volumes: list[float] = []
        for bar in bars:
            if bar.close <= 0:
                continue
            closes.append(bar.close)
            volumes.append(max(0, bar.volume))
            index = len(closes) - 1
            ma5 = sum(closes[max(0, index - 4): index + 1]) / len(closes[max(0, index - 4): index + 1])
            ma20 = sum(closes[max(0, index - 19): index + 1]) / len(closes[max(0, index - 19): index + 1])
            volume_ratio = self._volume_ratio(volumes)
            points.append(
                TrendPoint(
                    date=bar.date,
                    close=round(bar.close, 2),
                    ma5=round(ma5, 2),
                    ma20=round(ma20, 2),
                    volume_ratio=round(volume_ratio, 2),
                )
            )
        return points

    def _series_from_points(self, snapshot: StockSnapshot, points: list[TrendPoint]):
        change_pct = ((points[-1].close - points[0].close) / points[0].close) * 100 if points and points[0].close > 0 else 0
        return TrendSeries(
            symbol=snapshot.symbol,
            name=snapshot.name,
            as_of=points[-1].date,
            points=points,
            change_30d_pct=round(change_pct, 2),
            high=max(point.close for point in points),
            low=min(point.close for point in points),
        )

    def _volume_ratio(self, volumes: list[float]) -> float:
        if len(volumes) < 2:
            return 1
        history = volumes[max(0, len(volumes) - 6):-1]
        average = sum(history) / len(history) if history else 0
        if average <= 0:
            return 1
        return max(0.1, volumes[-1] / average)

    def _max_drawdown(self, points: list[TrendPoint]) -> float:
        peak = points[0].close
        worst = 0.0
        for point in points:
            peak = max(peak, point.close)
            if peak <= 0:
                continue
            drawdown = ((point.close - peak) / peak) * 100
            worst = min(worst, drawdown)
        return worst

    def _summary(self, preset: str, match_count: int, trades: list[StrategyBacktestTrade], average_return: float, max_drawdown: float) -> str:
        if not trades:
            return f"{preset} 当前样例未形成可回测交易。"
        return (
            f"{preset} 在样例数据中命中 {match_count} 只标的，"
            f"形成 {len(trades)} 笔 {trades[0].holding_days} 日持有交易，"
            f"平均收益 {average_return:.2f}%，最大回撤 {max_drawdown:.2f}%。"
        )

    def _rule_notes(self, preset: str) -> list[str]:
        notes = {
            "strong": ["综合分和技术分同时较强。", "适合观察强势延续，但需复核回撤。"],
            "value": ["行业估值分位较低且风险可控。", "适合验证低估值修复，不代表短线动能。"],
            "capital-risk": ["用于暴露资金压力，不作为买入信号。", "收益统计仅帮助观察回避策略效果。"],
            "breakout-volume": ["价格站上关键均线且量能放大。", "若量能回落或跌破 MA20，突破假设降级。"],
            "capital-return": ["资金回流且不过热。", "适合验证温和资金修复样例。"],
            "risk-avoidance": ["事件、技术或资金压力触发回避。", "用于复核风险暴露，不作为机会优先信号。"],
        }
        return notes.get(preset, ["当前策略使用样例规则生成，仅作研究参考。"])
