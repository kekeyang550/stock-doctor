from datetime import date, timedelta

from app.schemas.diagnosis import StockSnapshot, TrendPoint, TrendSeries


class TrendService:
    def build_series(self, snapshot: StockSnapshot, days: int = 30) -> TrendSeries:
        days = max(5, min(days, 60))
        end_date = date.fromisoformat(snapshot.as_of)
        trend_bias = 1 if snapshot.last_price >= snapshot.technical.ma20 else -1
        volatility = max(0.006, abs(snapshot.change_pct) / 100 / 2)
        start_price = snapshot.last_price / (1 + trend_bias * 0.055)
        closes: list[float] = []

        for index in range(days):
            progress = index / max(days - 1, 1)
            wave = ((index % 6) - 2.5) * volatility
            drift = trend_bias * 0.055 * progress
            close = start_price * (1 + drift + wave)
            closes.append(round(close, 2))

        closes[-1] = round(snapshot.last_price, 2)
        points: list[TrendPoint] = []
        for index, close in enumerate(closes):
            current_date = end_date - timedelta(days=days - 1 - index)
            ma5 = sum(closes[max(0, index - 4): index + 1]) / len(closes[max(0, index - 4): index + 1])
            ma20 = sum(closes[max(0, index - 19): index + 1]) / len(closes[max(0, index - 19): index + 1])
            volume_ratio = max(0.5, snapshot.technical.volume_ratio + (((index % 5) - 2) * 0.06))
            points.append(
                TrendPoint(
                    date=current_date.isoformat(),
                    close=round(close, 2),
                    ma5=round(ma5, 2),
                    ma20=round(ma20, 2),
                    volume_ratio=round(volume_ratio, 2),
                )
            )

        change_30d_pct = ((points[-1].close - points[0].close) / points[0].close) * 100
        return TrendSeries(
            symbol=snapshot.symbol,
            name=snapshot.name,
            as_of=snapshot.as_of,
            points=points,
            change_30d_pct=round(change_30d_pct, 2),
            high=max(point.close for point in points),
            low=min(point.close for point in points),
        )
