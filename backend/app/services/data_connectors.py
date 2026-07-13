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
        tushare_installed = find_spec("tushare") is not None
        active_provider = settings.data_provider
        source_by_name = self._source_by_name(provider)
        eastmoney_source = source_by_name.get("东方财富")
        tencent_source = source_by_name.get("腾讯行情")
        sina_source = source_by_name.get("新浪资金流")
        tdx_source = source_by_name.get("通达信本地日线")
        local_stock_directory_source = source_by_name.get("同花顺本地股票名表")
        akshare_source = source_by_name.get("AKShare")
        tushare_source = source_by_name.get("Tushare Pro")

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
                name="东方财富",
                status=self._provider_source_status(active_provider, "eastmoney", eastmoney_source),
                active=active_provider == "eastmoney",
                role="A 股行情、指数和历史 K 线直连适配",
                package="requests",
                package_installed=find_spec("requests") is not None,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message=self._provider_source_message(active_provider, "eastmoney", eastmoney_source, "东方财富直连适配器"),
                next_action=self._provider_source_next_action(active_provider, "eastmoney", eastmoney_source),
            ),
            DataConnectorStatus(
                name="腾讯行情",
                status=tencent_source.get("status", "fallback") if tencent_source is not None else "fallback",
                active=active_provider == "eastmoney" and tencent_source is not None and tencent_source.get("status") == "online",
                role="真实报价和历史 K 线备用适配",
                package="requests",
                package_installed=find_spec("requests") is not None,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message=(
                    f"适配器报告：{tencent_source.get('role', '未返回状态详情')}"
                    if tencent_source is not None
                    else "东方财富直连可用时保持备用；触发备用后会显示在线。"
                ),
                next_action=(
                    "继续观察备用源缓存命中和 K 线覆盖。"
                    if tencent_source is not None and tencent_source.get("status") == "online"
                    else "当东方财富接口断开时，后端会自动尝试腾讯行情备用源。"
                ),
            ),
            DataConnectorStatus(
                name="新浪资金流",
                status=sina_source.get("status", "fallback") if sina_source is not None else "fallback",
                active=active_provider == "eastmoney" and sina_source is not None and sina_source.get("status") == "online",
                role="个股资金流备用适配",
                package="requests",
                package_installed=find_spec("requests") is not None,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message=(
                    f"适配器报告：{sina_source.get('role', '未返回状态详情')}"
                    if sina_source is not None
                    else "东方财富资金流接口可用时保持备用；触发备用后会显示在线。"
                ),
                next_action=(
                    "继续观察资金流字段覆盖率和主源恢复情况。"
                    if sina_source is not None and sina_source.get("status") == "online"
                    else "当东方财富资金流接口不可用时，后端会自动尝试新浪资金流备用源。"
                ),
            ),
            DataConnectorStatus(
                name="通达信本地日线",
                status=tdx_source.get("status", "fallback") if tdx_source is not None else "fallback",
                active=active_provider == "eastmoney" and tdx_source is not None and tdx_source.get("status") == "online",
                role="本地历史 K 线参考与兜底",
                package=None,
                package_installed=True,
                configured_provider=active_provider,
                latency_ms=0 if tdx_source is not None and tdx_source.get("status") == "online" else None,
                last_checked_at=checked_at,
                message=(
                    f"适配器报告：{tdx_source.get('role', '未返回状态详情')}"
                    if tdx_source is not None
                    else "未收到通达信本地日线适配器状态。"
                ),
                next_action=(
                    "继续作为历史 K 线交叉校验；若过期，请在通达信客户端补全日线数据。"
                    if tdx_source is not None and tdx_source.get("status") == "online"
                    else "确认通达信 vipdoc 路径和日线下载状态。"
                ),
            ),
            DataConnectorStatus(
                name="同花顺本地股票名表",
                status=(
                    local_stock_directory_source.get("status", "fallback")
                    if local_stock_directory_source is not None
                    else "fallback"
                ),
                active=(
                    active_provider == "eastmoney"
                    and local_stock_directory_source is not None
                    and local_stock_directory_source.get("status") == "online"
                ),
                role="本地 A 股代码/名称索引",
                package=None,
                package_installed=True,
                configured_provider=active_provider,
                latency_ms=0
                if local_stock_directory_source is not None
                and local_stock_directory_source.get("status") == "online"
                else None,
                last_checked_at=checked_at,
                message=(
                    f"适配器报告：{local_stock_directory_source.get('role', '未返回状态详情')}"
                    if local_stock_directory_source is not None
                    else "未收到本地股票名表状态；名称搜索会退回当前行情列表和代码直连。"
                ),
                next_action=(
                    "继续作为名称搜索和代码补全索引；如搜索不到新股，可更新同花顺基础资料。"
                    if local_stock_directory_source is not None
                    and local_stock_directory_source.get("status") == "online"
                    else "确认同花顺 stockname 路径是否存在，或通过 STOCK_DOCTOR_THS_STOCKNAME_PATHS 指定。"
                ),
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
                status=self._tushare_status(tushare_installed, active_provider, tushare_source),
                active=active_provider == "tushare",
                role="财务、基础资料、复权日线和公告事件增强",
                package="tushare",
                package_installed=tushare_installed,
                configured_provider=active_provider,
                latency_ms=None,
                last_checked_at=checked_at,
                message=self._tushare_message(tushare_installed, active_provider, tushare_source),
                next_action=self._tushare_next_action(tushare_installed, active_provider, tushare_source),
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

    def _provider_source_status(
        self,
        active_provider: str,
        provider_key: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == provider_key:
            status = source.get("status", "")
            if status in {"online", "fallback", "missing-package", "planned", "error"}:
                return status
        return "online" if active_provider == provider_key else "fallback"

    def _provider_source_message(
        self,
        active_provider: str,
        provider_key: str,
        source: dict[str, str] | None,
        label: str,
    ) -> str:
        if source is not None and active_provider == provider_key:
            return f"适配器报告：{source.get('role', '未返回状态详情')}"
        if active_provider != provider_key:
            return f"{label}可用；当前未作为主数据源。"
        return f"{label}当前作为主数据源；失败时保留 Mock 回退。"

    def _provider_source_next_action(
        self,
        active_provider: str,
        provider_key: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == provider_key and source.get("status") == "fallback":
            return "查看适配器返回的错误信息，确认网络、代理和接口可用性。"
        if active_provider != provider_key:
            return f"设置 STOCK_DOCTOR_DATA_PROVIDER={provider_key} 后重启后端进行真实数据试运行。"
        return "继续观察缓存命中、字段覆盖率和接口延迟，确认诊断和回测口径稳定。"

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
        if active_provider == "eastmoney":
            return "fallback"
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
        if active_provider == "eastmoney":
            return "akshare 已安装时仍可作为备用聚合适配器；当前主数据源为东方财富直连。"
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
        if active_provider == "eastmoney":
            return "如需回到 AKShare 聚合链路，可设置 STOCK_DOCTOR_DATA_PROVIDER=akshare 后重启后端。"
        if not installed:
            return "在后端环境执行 pip install akshare 后，再设置 STOCK_DOCTOR_DATA_PROVIDER=akshare。"
        if active_provider != "akshare":
            return "设置 STOCK_DOCTOR_DATA_PROVIDER=akshare 后重启后端进行真实数据试运行。"
        return "继续补齐股票列表、行情快照和板块资金流字段映射。"

    def _tushare_status(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "tushare":
            status = source.get("status", "")
            if status in {"online", "fallback", "missing-package", "planned", "error"}:
                return status
        if not installed:
            return "missing-package"
        return "planned"

    def _tushare_message(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "tushare":
            return f"适配器报告：{source.get('role', '未返回状态详情')}"
        token_configured = bool(settings.tushare_token.strip())
        if not installed and not token_configured:
            return "tushare 包和 Token 均未配置；当前仍使用已接入数据源。"
        if not installed:
            return "Token 已配置，但当前环境未安装 tushare 包。"
        if not token_configured:
            return "tushare 包已安装，等待 STOCK_DOCTOR_TUSHARE_TOKEN 后再启用财务增强。"
        return "tushare 包和 Token 已就绪，下一步可接入财务字段归一化。"

    def _tushare_next_action(
        self,
        installed: bool,
        active_provider: str,
        source: dict[str, str] | None,
    ) -> str:
        if source is not None and active_provider == "tushare" and source.get("status") == "fallback":
            return "当前 Tushare 已安全回退到 Mock；补齐包、Token 和字段归一化后再承载诊断。"
        if source is not None and active_provider == "tushare":
            return "继续实现 Tushare 财务字段、基础资料和复权日线归一化。"
        token_configured = bool(settings.tushare_token.strip())
        if not installed:
            return "在后端环境执行 pip install tushare，并配置 STOCK_DOCTOR_TUSHARE_TOKEN。"
        if not token_configured:
            return "配置 STOCK_DOCTOR_TUSHARE_TOKEN 后重启后端，再接入财务/复权日线字段。"
        return "实现 Tushare 财务字段、基础资料和复权日线归一化后，再开放 provider 切换。"
