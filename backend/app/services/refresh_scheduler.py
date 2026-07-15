import asyncio
import contextlib
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.services.providers import MarketDataProvider
from app.services.refresh_jobs import DataRefreshJobService


class DataRefreshScheduler:
    def __init__(
        self,
        provider: MarketDataProvider,
        refresh_service: DataRefreshJobService,
        *,
        enabled: bool | None = None,
        interval_minutes: int | None = None,
        scope: str | None = None,
        run_on_startup: bool | None = None,
    ) -> None:
        self._provider = provider
        self._refresh_service = refresh_service
        self.enabled = settings.data_auto_refresh_enabled if enabled is None else enabled
        self.interval_minutes = interval_minutes or settings.data_auto_refresh_interval_minutes
        self.scope = scope or settings.data_auto_refresh_scope
        self.run_on_startup = settings.data_auto_refresh_on_startup if run_on_startup is None else run_on_startup
        self._task: asyncio.Task[None] | None = None
        self._started_at: str | None = None
        self._next_run_at: str | None = None
        self._last_run_started_at: str | None = None
        self._last_run_finished_at: str | None = None
        self._last_run_status: str | None = None
        self._last_error: str | None = None
        self._run_count = 0

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def status(self) -> dict[str, object]:
        return {
            "enabled": self.enabled,
            "interval_minutes": self.interval_minutes,
            "scope": self.scope,
            "run_on_startup": self.run_on_startup,
            "running": self.running,
            "started_at": self._started_at,
            "next_run_at": self._next_run_at if self.running else None,
            "last_run_started_at": self._last_run_started_at,
            "last_run_finished_at": self._last_run_finished_at,
            "last_run_status": self._last_run_status,
            "last_error": self._last_error,
            "run_count": self._run_count,
        }

    def start(self) -> bool:
        if not self.enabled:
            return False
        if self.running:
            return True
        now = datetime.now(timezone.utc)
        self._started_at = now.isoformat()
        self._next_run_at = (now if self.run_on_startup else now + timedelta(minutes=self.interval_minutes)).isoformat()
        self._task = asyncio.create_task(self._run_loop(), name="stock-doctor-refresh-scheduler")
        return True

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        self._next_run_at = None

    async def run_once(self) -> None:
        started_at = datetime.now(timezone.utc)
        self._last_run_started_at = started_at.isoformat()
        self._last_run_finished_at = None
        try:
            job = await asyncio.to_thread(self._refresh_service.run_refresh, provider=self._provider, scope=self.scope)
            self._last_run_status = job.status
            self._last_error = job.message if job.status == "failed" else None
        except Exception as exc:
            self._last_run_status = "failed"
            self._last_error = str(exc)
            raise
        finally:
            self._last_run_finished_at = datetime.now(timezone.utc).isoformat()
            self._run_count += 1

    async def _run_loop(self) -> None:
        if self.run_on_startup:
            with contextlib.suppress(Exception):
                await self.run_once()
        while True:
            self._next_run_at = (datetime.now(timezone.utc) + timedelta(minutes=self.interval_minutes)).isoformat()
            await asyncio.sleep(self.interval_minutes * 60)
            with contextlib.suppress(Exception):
                await self.run_once()
