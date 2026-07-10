from collections import defaultdict

from app.schemas.diagnosis import AlertItem, RiskExposureItem


class RiskExposureService:
    def summarize(self, alerts: list[AlertItem]) -> list[RiskExposureItem]:
        grouped: dict[str, list[AlertItem]] = defaultdict(list)
        for alert in alerts:
            grouped[alert.category].append(alert)

        items: list[RiskExposureItem] = []
        for category, category_alerts in grouped.items():
            high_count = len([item for item in category_alerts if item.severity == "high"])
            medium_count = len([item for item in category_alerts if item.severity == "medium"])
            low_count = len([item for item in category_alerts if item.severity == "low"])
            top = max(category_alerts, key=lambda item: (self._severity_rank(item.severity), item.score))
            severity_score = high_count * 3 + medium_count * 2 + low_count
            items.append(
                RiskExposureItem(
                    category=category,
                    event_count=len(category_alerts),
                    high_count=high_count,
                    medium_count=medium_count,
                    low_count=low_count,
                    severity_score=severity_score,
                    top_symbol=top.symbol,
                    top_name=top.name,
                    top_title=top.title,
                )
            )

        return sorted(items, key=lambda item: (item.severity_score, item.event_count), reverse=True)

    def _severity_rank(self, severity: str) -> int:
        return {"high": 3, "medium": 2, "low": 1}[severity]
