from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from app.config import settings
from app.schemas.diagnosis import DataFreshnessStatus, DataRefreshJob
from app.services.providers import MarketDataProvider
from app.services.storage import StateStore, create_state_store


class DataRefreshJobService:
    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()

    def list_jobs(self, limit: int = 10) -> list[DataRefreshJob]:
        jobs = [DataRefreshJob.model_validate(item) for item in self._state_store.load_refresh_jobs()]
        return sorted(jobs, key=lambda item: datetime.fromisoformat(item.started_at), reverse=True)[:limit]

    def build_freshness(self, provider: MarketDataProvider, stale_after_minutes: int | None = None) -> DataFreshnessStatus:
        stale_after_minutes = stale_after_minutes or settings.data_freshness_stale_after_minutes
        expected_stock_count = len(provider.list_stocks())
        successful_jobs = [job for job in self.list_jobs(limit=50) if job.status == "success"]
        if not successful_jobs:
            return DataFreshnessStatus(
                status="unknown",
                provider=settings.data_provider,
                last_success_at=None,
                age_minutes=None,
                stale_after_minutes=stale_after_minutes,
                expected_stock_count=expected_stock_count,
                last_stock_count=0,
                coverage_pct=0,
                message="尚无成功刷新记录。",
                next_action="运行一次刷新任务，建立数据新鲜度基线。",
            )

        latest = successful_jobs[0]
        last_success_at = datetime.fromisoformat(latest.finished_at)
        now = datetime.now(last_success_at.tzinfo or timezone.utc)
        age_minutes = max(0, round((now - last_success_at).total_seconds() / 60))
        coverage_pct = round((latest.stock_count / expected_stock_count) * 100, 1) if expected_stock_count else 0
        status = self._freshness_status(age_minutes, stale_after_minutes, coverage_pct)
        return DataFreshnessStatus(
            status=status,
            provider=latest.provider,
            last_success_at=latest.finished_at,
            age_minutes=age_minutes,
            stale_after_minutes=stale_after_minutes,
            expected_stock_count=expected_stock_count,
            last_stock_count=latest.stock_count,
            coverage_pct=coverage_pct,
            message=self._freshness_message(status, age_minutes, coverage_pct),
            next_action=self._freshness_next_action(status),
        )

    def run_refresh(self, provider: MarketDataProvider, scope: str = "all") -> DataRefreshJob:
        started_at = datetime.now(timezone.utc)
        timer = perf_counter()
        warmed_count = 0
        try:
            warmed_count = provider.warm_cache(scope)
            stocks = provider.get_watchlist() if scope == "watchlist" else provider.list_stocks()
            watchlist = provider.get_watchlist()
            sources = provider.get_data_sources()
            status = "success"
            message = self._message(scope, warmed_count, len(watchlist))
        except Exception as exc:
            stocks = []
            watchlist = []
            sources = []
            status = "failed"
            message = f"刷新失败：{exc}"
        finished_at = datetime.now(timezone.utc)
        job = DataRefreshJob(
            id=uuid4().hex,
            provider=settings.data_provider,
            status=status,
            started_at=started_at.isoformat(),
            finished_at=finished_at.isoformat(),
            duration_ms=max(0, round((perf_counter() - timer) * 1000)),
            stock_count=warmed_count if status == "success" else len(stocks),
            watchlist_count=len(watchlist),
            source_count=len(sources),
            message=message,
        )
        jobs = self._state_store.load_refresh_jobs()
        jobs.insert(0, job.model_dump(mode="json"))
        self._state_store.save_refresh_jobs(jobs[:50])
        return job

    def _message(self, scope: str, stock_count: int, watchlist_count: int) -> str:
        if scope == "watchlist":
            return f"已刷新自选股范围，覆盖 {stock_count} 只标的。"
        return f"已刷新全市场样例范围，覆盖 {stock_count} 只标的，自选股 {watchlist_count} 只。"

    def _freshness_status(self, age_minutes: int, stale_after_minutes: int, coverage_pct: float) -> str:
        if coverage_pct < 50:
            return "expired"
        if age_minutes <= stale_after_minutes:
            return "fresh"
        if age_minutes <= stale_after_minutes * 8:
            return "stale"
        return "expired"

    def _freshness_message(self, status: str, age_minutes: int, coverage_pct: float) -> str:
        if status == "fresh":
            return f"最近刷新距今 {age_minutes} 分钟，覆盖率 {coverage_pct:.1f}%。"
        if status == "stale":
            return f"最近刷新距今 {age_minutes} 分钟，建议更新。"
        return f"最近刷新距今 {age_minutes} 分钟或覆盖率不足，数据应视为过期。"

    def _freshness_next_action(self, status: str) -> str:
        if status == "fresh":
            return "可以继续使用当前诊断数据。"
        if status == "stale":
            return "建议运行刷新任务后再做新的诊断判断。"
        return "立即运行刷新任务；接入真实数据源后应启用定时刷新。"
