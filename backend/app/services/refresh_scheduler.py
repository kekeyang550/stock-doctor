import asyncio
import contextlib

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

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> bool:
        if not self.enabled:
            return False
        if self.running:
            return True
        self._task = asyncio.create_task(self._run_loop(), name="stock-doctor-refresh-scheduler")
        return True

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def run_once(self) -> None:
        await asyncio.to_thread(self._refresh_service.run_refresh, provider=self._provider, scope=self.scope)

    async def _run_loop(self) -> None:
        if self.run_on_startup:
            await self.run_once()
        while True:
            await asyncio.sleep(self.interval_minutes * 60)
            await self.run_once()
