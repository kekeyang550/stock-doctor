from datetime import datetime, timezone
from importlib.util import find_spec

from app.config import settings
from app.schemas.diagnosis import (
    DataConnectorHealth,
    DataConnectorRuntimeConfig,
    DataConnectorStatus,
    ProviderCacheStatus,
)
from app.services.providers import MarketDataProvider


class DataConnectorHealthService:
    def build_health(self, provider: MarketDataProvider | None = None) -> DataConnectorHealth:
        checked_at = datetime.now(timezone.utc).isoformat()
        akshare_installed = find_spec("akshare") is not None
        active_provider = settings.data_provider
        source_by_name = self._source_by_name(provider)
        akshare_source = source_by_name.get("AKShare")

        connectors = [
            DataConnectorStatus(
                name="Mock A股样例库",
                status="online",
                active=active_provider == "mock",
                role="MVP 诊断回归数据与离线开发回退",
                package=None,
                package_installed=True,
                configured_provider=active_provider,
                latency_ms=0,
                last_checked_at=checked_at,
                message="本地样例数据可用。",
                next_action="继续作为回归测试和真实数据失败时的兜底数据源。",
            ),
            DataConnectorStatus(
                name="AKShare",
                status=self._akshare_status(akshare_installed, active_provider, akshare_source),
                active=active_provider == "akshare" and akshare_installed,
                role="A 股行情、指数、板块和资金流数据适配",
                package="akshare",
                package_installed=akshare_installed,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message=self._akshare_message(akshare_installed, active_provider, akshare_source),
                next_action=self._akshare_next_action(akshare_installed, active_provider, akshare_source),
            ),
            DataConnectorStatus(
                name="Tushare Pro",
                status="planned",
                active=False,
                role="财务、基础资料、复权日线和公告事件增强",
                package="tushare",
                package_installed=find_spec("tushare") is not None,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message="接口边界已规划，尚未启用。",
                next_action="增加 Token 配置、限流和字段归一化后接入。",
            ),
        ]
        return DataConnectorHealth(
            active_provider=active_provider,
            fallback_provider="mock",
            runtime_config=DataConnectorRuntimeConfig(
                request_timeout_seconds=settings.data_request_timeout_seconds,
                cache_ttl_seconds=settings.data_cache_ttl_seconds,
                freshness_stale_after_minutes=settings.data_freshness_stale_after_minutes,
            ),
            cache_status=self._provider_cache_status(provider),
            connectors=connectors,
        )

    def _source_by_name(self, provider: MarketDataProvider | None) -> dict[str, dict[str, str]]:
        if provider is None:
            return {}
        try:
            sources = provider.get_data_sources()
        except Exception:
            return {}
        return {
            str(source.get("name")): source
            for source in sources
            if source.get("name") is not None
        }

    def _provider_cache_status(self, provider: MarketDataProvider | None) -> ProviderCacheStatus | None:
        if provider is None:
            return None
        get_cache_status = getattr(provider, "get_cache_status", None)
        if get_cache_status is None:
            return None
        try:
            payload = get_cache_status()
        except Exception:
            return None
        return ProviderCacheStatus.model_validate(payload)

    def _akshare_status(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "akshare":
            status = source.get("status", "")
            if status in {"online", "fallback", "missing-package", "planned", "error"}:
                return status
        if not installed:
            return "missing-package"
        return "online" if active_provider == "akshare" else "fallback"

    def _akshare_message(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "akshare":
            return f"适配器报告：{source.get('role', '未返回状态详情')}"
        if not installed:
            return "当前环境未安装 akshare，系统继续使用 Mock 数据。"
        if active_provider != "akshare":
            return "akshare 已安装，但当前配置仍使用 Mock 数据。"
        return "akshare 包已安装，当前作为主数据源；适配器仍保留 Mock 回退。"

    def _akshare_next_action(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "akshare" and source.get("status") == "fallback":
            return "查看 AKShare 适配器返回的错误信息，确认网络、字段名和接口可用性。"
        if not installed:
            return "在后端环境执行 pip install akshare 后，再设置 STOCK_DOCTOR_DATA_PROVIDER=akshare。"
        if active_provider != "akshare":
            return "设置 STOCK_DOCTOR_DATA_PROVIDER=akshare 后重启后端进行真实数据试运行。"
        return "继续补齐股票列表、行情快照和板块资金流字段映射。"
