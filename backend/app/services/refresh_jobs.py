from datetime import datetime, timezone
from time import perf_counter
from uuid import uuid4

from app.config import settings
from app.schemas.diagnosis import DataRefreshJob
from app.services.providers import MarketDataProvider
from app.services.storage import StateStore, create_state_store


class DataRefreshJobService:
    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()

    def list_jobs(self, limit: int = 10) -> list[DataRefreshJob]:
        jobs = [DataRefreshJob.model_validate(item) for item in self._state_store.load_refresh_jobs()]
        return sorted(jobs, key=lambda item: item.started_at, reverse=True)[:limit]

    def run_refresh(self, provider: MarketDataProvider, scope: str = "all") -> DataRefreshJob:
        started_at = datetime.now(timezone.utc)
        timer = perf_counter()
        try:
            stocks = provider.get_watchlist() if scope == "watchlist" else provider.list_stocks()
            watchlist = provider.get_watchlist()
            sources = provider.get_data_sources()
            status = "success"
            message = self._message(scope, len(stocks), len(watchlist))
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
            stock_count=len(stocks),
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
