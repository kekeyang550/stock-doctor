from contextlib import redirect_stdout
from datetime import datetime, timezone
from importlib.util import find_spec
from io import StringIO
from time import monotonic

from app.config import settings
from app.schemas.diagnosis import (
    FundamentalSnapshot,
    HistoricalPriceBar,
    MarketOverview,
    StockSnapshot,
    StockSummary,
    TushareProbeResult,
    TushareProbeStep,
)
from app.services.market_data import MockMarketDataProvider
from app.services.storage import StateStore


class TushareMarketDataProvider:
    """Safe first-stage Tushare adapter.

    Tushare will be used for financial/basic-info enrichment later. Until those
    fields are normalized, this provider keeps the app usable by delegating
    market data to the deterministic fallback provider.
    """

    def __init__(self, ts_module: object | None = None, state_store: StateStore | None = None) -> None:
        self._ts_module = ts_module
        self._fallback = MockMarketDataProvider(state_store=state_store)
        self._last_basic_enriched = False
        self._last_finance_enriched = False
        self._last_history_enriched = False
        self._last_history_adjusted = False
        self._last_error: str | None = None

    def list_stocks(self) -> list[StockSummary]:
        return self._fallback.list_stocks()

    def get_market_overview(self) -> MarketOverview:
        return self._fallback.get_market_overview()

    def get_data_sources(self) -> list[dict[str, str]]:
        enriched = self._last_basic_enriched or self._last_finance_enriched or self._last_history_enriched
        status = (
            "online"
            if enriched
            else "fallback"
            if self._last_error
            else "planned"
            if self._is_ready()
            else "fallback"
        )
        return [
            {
                "name": "Tushare Pro",
                "status": status,
                "role": self._source_role(),
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "Tushare 未完成字段归一化前的稳定回退"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        return self._fallback.get_watchlist()

    def add_to_watchlist(self, symbol: str) -> bool:
        return self._fallback.add_to_watchlist(symbol)

    def remove_from_watchlist(self, symbol: str) -> None:
        self._fallback.remove_from_watchlist(symbol)

    def replace_watchlist(self, symbols: list[str]) -> list[StockSummary]:
        return self._fallback.replace_watchlist(symbols)

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        snapshot = self._fallback.get_snapshot(symbol)
        if snapshot is None or not self._is_ready():
            return snapshot
        fundamental = self._fundamental_from_tushare(symbol)
        basic_info = self._basic_info_from_tushare(symbol)
        if fundamental is None and basic_info is None:
            return snapshot
        update = {}
        sources = set(snapshot.data_sources)
        conservative_fields = list(snapshot.conservative_fields)
        if fundamental is not None:
            self._last_finance_enriched = True
            sources.update({"tushare-daily-basic", "tushare-fina-indicator"})
            conservative_fields = [
                item
                for item in conservative_fields
                if item not in {"fundamental", "fundamental-seed", "growth"}
            ]
            update["fundamental"] = fundamental
        if basic_info is not None:
            self._last_basic_enriched = True
            sources.add("tushare-stock-basic")
            update.update(basic_info)
        update["data_sources"] = sorted(sources)
        update["conservative_fields"] = conservative_fields
        return snapshot.model_copy(update=update)

    def get_price_history(self, symbol: str, days: int = 60) -> list[HistoricalPriceBar]:
        if not self._is_ready():
            return self._fallback.get_price_history(symbol, days=days)
        bars = self._history_from_tushare(symbol, days=days)
        if not bars:
            return self._fallback.get_price_history(symbol, days=days)
        self._last_history_enriched = True
        return bars

    def warm_cache(self, scope: str = "all") -> int:
        return self._fallback.warm_cache(scope)

    def get_cache_status(self) -> dict:
        return self._fallback.get_cache_status()

    def probe_connectivity(self, symbol: str = "600519") -> TushareProbeResult:
        started_at = monotonic()
        normalized = symbol.strip().upper() or "600519"
        package_available = self._package_available()
        token_configured = bool(settings.tushare_token.strip())
        steps = [
            TushareProbeStep(
                key="package",
                label="tushare 包",
                status="pass" if package_available else "fail",
                detail="当前 Python 环境可导入 tushare。" if package_available else "当前 Python 环境未安装 tushare 包。",
                duration_ms=0,
            ),
            TushareProbeStep(
                key="token",
                label="Tushare Token",
                status="pass" if token_configured else "warn",
                detail="Token 已通过环境变量配置。" if token_configured else "未配置 STOCK_DOCTOR_TUSHARE_TOKEN。",
                duration_ms=0,
            ),
        ]
        if not package_available or not token_configured:
            return self._probe_result(normalized, package_available, token_configured, steps, started_at)

        client_started_at = monotonic()
        client = self._client()
        steps.append(
            TushareProbeStep(
                key="client",
                label="Pro API 初始化",
                status="pass" if client is not None else "fail",
                detail="pro_api 初始化成功。" if client is not None else "pro_api 初始化失败，继续使用安全回退。",
                duration_ms=self._elapsed_ms(client_started_at),
            )
        )
        if client is None:
            return self._probe_result(normalized, package_available, token_configured, steps, started_at)

        ts_code = self._ts_code(normalized)
        steps.append(self._probe_stock_basic(client, ts_code))
        steps.append(self._probe_daily_basic(client, ts_code))
        steps.append(self._probe_fina_indicator(client, ts_code))
        steps.append(self._probe_pro_bar(client, ts_code))
        return self._probe_result(normalized, package_available, token_configured, steps, started_at)

    def _is_ready(self) -> bool:
        return self._package_available() and bool(settings.tushare_token.strip())

    def _package_available(self) -> bool:
        return self._ts_module is not None or find_spec("tushare") is not None

    def _source_role(self) -> str:
        package_available = self._package_available()
        token_configured = bool(settings.tushare_token.strip())
        enriched_parts = []
        if self._last_basic_enriched:
            enriched_parts.append("基础资料")
        if self._last_finance_enriched:
            enriched_parts.append("财务基础指标")
        if self._last_history_enriched:
            enriched_parts.append("前复权日线" if self._last_history_adjusted else "日线")
        if enriched_parts:
            return f"{'、'.join(enriched_parts)}已从 Tushare Pro 增强。"
        if self._last_error:
            return f"Tushare 连通性校验失败：{self._last_error}；继续使用 Mock 回退。"
        if package_available and token_configured:
            return "包和 Token 已就绪；基础资料、财务基础指标和前复权日线可尝试增强。"
        if token_configured:
            return "Token 已配置，但当前环境未安装 tushare 包；继续使用 Mock 回退。"
        if package_available:
            return "tushare 包已安装，等待 STOCK_DOCTOR_TUSHARE_TOKEN；继续使用 Mock 回退。"
        return "tushare 包和 Token 均未配置；继续使用 Mock 回退。"

    def _probe_stock_basic(self, client: object, ts_code: str) -> TushareProbeStep:
        started_at = monotonic()
        stock_basic = getattr(client, "stock_basic", None)
        if stock_basic is None:
            return TushareProbeStep(key="stock_basic", label="基础资料", status="fail", detail="client 缺少 stock_basic 能力。", duration_ms=self._elapsed_ms(started_at))
        try:
            rows = self._rows(stock_basic(ts_code=ts_code, fields="ts_code,name,industry"))
        except Exception as exc:
            return TushareProbeStep(
                key="stock_basic",
                label="基础资料",
                status=self._probe_error_status(exc),
                detail=f"stock_basic 调用失败：{self._safe_error_detail(exc)}",
                duration_ms=self._elapsed_ms(started_at),
            )
        return self._probe_rows_step("stock_basic", "基础资料", rows, self._elapsed_ms(started_at))

    def _probe_daily_basic(self, client: object, ts_code: str) -> TushareProbeStep:
        started_at = monotonic()
        try:
            rows = self._rows(client.daily_basic(ts_code=ts_code, fields="ts_code,trade_date,pe_ttm,pb,turnover_rate"))
        except Exception as exc:
            return TushareProbeStep(
                key="daily_basic",
                label="日行情基础指标",
                status=self._probe_error_status(exc),
                detail=f"daily_basic 调用失败：{self._safe_error_detail(exc)}",
                duration_ms=self._elapsed_ms(started_at),
            )
        return self._probe_rows_step("daily_basic", "日行情基础指标", rows, self._elapsed_ms(started_at))

    def _probe_fina_indicator(self, client: object, ts_code: str) -> TushareProbeStep:
        started_at = monotonic()
        try:
            rows = self._rows(client.fina_indicator(ts_code=ts_code, fields="ts_code,end_date,roe_dt,revenue_yoy,netprofit_yoy"))
        except Exception as exc:
            return TushareProbeStep(
                key="fina_indicator",
                label="财务指标",
                status=self._probe_error_status(exc, optional=True),
                detail=f"fina_indicator 调用失败：{self._safe_error_detail(exc)}",
                duration_ms=self._elapsed_ms(started_at),
            )
        return self._probe_rows_step("fina_indicator", "财务指标", rows, self._elapsed_ms(started_at))

    def _probe_pro_bar(self, client: object, ts_code: str) -> TushareProbeStep:
        started_at = monotonic()
        module = self._ts_module
        if module is None:
            try:
                import tushare as module  # type: ignore
            except Exception:
                return TushareProbeStep(key="pro_bar", label="前复权日线", status="fail", detail="tushare 包导入失败。", duration_ms=self._elapsed_ms(started_at))
        pro_bar = getattr(module, "pro_bar", None)
        if pro_bar is None:
            return TushareProbeStep(key="pro_bar", label="前复权日线", status="fail", detail="tushare.pro_bar 不可用。", duration_ms=self._elapsed_ms(started_at))
        try:
            self._set_module_token(module)
            stdout = StringIO()
            with redirect_stdout(stdout):
                rows = self._rows(pro_bar(ts_code=ts_code, adj="qfq", freq="D"))
        except Exception as exc:
            pro_bar_error = self._safe_error_detail(exc, stdout.getvalue())
            fallback_step = self._probe_daily_history(client, ts_code, started_at, pro_bar_error)
            if fallback_step is not None:
                return fallback_step
            return TushareProbeStep(
                key="pro_bar",
                label="前复权日线",
                status=self._probe_error_status(exc),
                detail=f"pro_bar 前复权日线调用失败：{pro_bar_error}",
                duration_ms=self._elapsed_ms(started_at),
            )
        return self._probe_rows_step("pro_bar", "前复权日线", rows, self._elapsed_ms(started_at))

    def _probe_daily_history(
        self,
        client: object,
        ts_code: str,
        started_at: float,
        pro_bar_error: str,
    ) -> TushareProbeStep | None:
        daily = getattr(client, "daily", None)
        if daily is None:
            return None
        try:
            rows = self._rows(daily(ts_code=ts_code))
        except Exception as exc:
            detail = self._safe_error_detail(exc)
            return TushareProbeStep(
                key="pro_bar",
                label="前复权日线",
                status="fail",
                detail=f"前复权日线不可用，未复权 daily 日线也调用失败：{detail}；前复权失败原因：{pro_bar_error}",
                duration_ms=self._elapsed_ms(started_at),
            )
        if rows:
            return TushareProbeStep(
                key="pro_bar",
                label="前复权日线",
                status="warn",
                detail=f"前复权日线不可用，已用未复权 daily 日线验证通过。前复权失败原因：{pro_bar_error}",
                duration_ms=self._elapsed_ms(started_at),
                row_count=len(rows),
            )
        return TushareProbeStep(
            key="pro_bar",
            label="前复权日线",
            status="warn",
            detail=f"前复权日线不可用，未复权 daily 日线可调用但返回空数据。前复权失败原因：{pro_bar_error}",
            duration_ms=self._elapsed_ms(started_at),
            row_count=0,
        )

    def _probe_rows_step(self, key: str, label: str, rows: list[dict], duration_ms: int) -> TushareProbeStep:
        if rows:
            return TushareProbeStep(key=key, label=label, status="pass", detail=f"返回 {len(rows)} 行样本。", duration_ms=duration_ms, row_count=len(rows))
        return TushareProbeStep(key=key, label=label, status="warn", detail="接口可调用但返回空数据。", duration_ms=duration_ms, row_count=0)

    def _probe_result(
        self,
        symbol: str,
        package_available: bool,
        token_configured: bool,
        steps: list[TushareProbeStep],
        started_at: float,
    ) -> TushareProbeResult:
        has_fail = any(step.status == "fail" for step in steps)
        has_warn = any(step.status == "warn" for step in steps)
        status = "fail" if has_fail else "warn" if has_warn else "pass"
        if status == "pass":
            message = "Tushare Pro 预检通过，基础资料、财务指标和前复权日线均可调用。"
            next_action = "可以考虑切换 STOCK_DOCTOR_DATA_PROVIDER=tushare 做真实数据增强试运行。"
        elif not package_available:
            message = "当前 Python 环境未安装 tushare 包。"
            next_action = '在 backend 目录执行 pip install -e ".[real-data]" 后重启后端，再重新检测。'
        elif not token_configured:
            message = "Tushare Pro Token 未配置，当前只能使用其他数据源或 Mock 回退。"
            next_action = "配置 STOCK_DOCTOR_TUSHARE_TOKEN 后重启后端，再重新检测。"
        elif status == "warn":
            message = "Tushare Pro 预检部分通过，部分真实数据可用，但存在频率、权限或空数据限制。"
            next_action = "可继续用东方财富主源；如需 Tushare 财务指标或复权日线，请等待频控恢复或提升账号权限后再检测。"
        else:
            message = "Tushare Pro 预检未完全通过，系统会继续使用安全回退。"
            next_action = "根据失败步骤检查 token 权限、网络连通性或 Tushare 接口返回。"
        return TushareProbeResult(
            symbol=symbol,
            generated_at=datetime.now(timezone.utc).isoformat(),
            status=status,
            package_installed=package_available,
            token_configured=token_configured,
            duration_ms=self._elapsed_ms(started_at),
            message=message,
            next_action=next_action,
            steps=steps,
        )

    @staticmethod
    def _elapsed_ms(started_at: float) -> int:
        return max(0, round((monotonic() - started_at) * 1000))

    def _client(self):
        module = self._ts_module
        if module is None:
            try:
                import tushare as module  # type: ignore
            except Exception:
                self._last_error = "tushare 包导入失败"
                return None
        pro_api = getattr(module, "pro_api", None)
        if pro_api is None:
            self._last_error = "tushare.pro_api 不可用"
            return None
        try:
            self._set_module_token(module)
            return pro_api(settings.tushare_token.strip())
        except Exception:
            self._last_error = "pro_api 初始化失败"
            return None

    def _fundamental_from_tushare(self, symbol: str) -> FundamentalSnapshot | None:
        client = self._client()
        if client is None:
            return None
        ts_code = self._ts_code(symbol)
        try:
            daily_rows = self._rows(
                client.daily_basic(
                    ts_code=ts_code,
                    fields="ts_code,trade_date,pe_ttm,pb,turnover_rate",
                )
            )
        except Exception as exc:
            daily_rows = []
            self._last_error = f"daily_basic 调用失败：{self._safe_error_detail(exc)}"
        try:
            fina_rows = self._rows(
                client.fina_indicator(
                    ts_code=ts_code,
                    fields=(
                        "ts_code,end_date,roe_dt,roe,q_roe,revenue_yoy,netprofit_yoy,"
                        "eps,basic_eps,grossprofit_margin,gross_margin,debt_to_assets,"
                        "ocfps,ocf_to_profit,cashflow_ratio,current_ratio,quick_ratio,"
                        "netprofit_margin,assets_turn,saleexp_to_gr,adminexp_of_gr,"
                        "finaexp_of_gr,assets_to_eqt"
                    ),
                )
            )
        except Exception as exc:
            fina_rows = []
            self._last_error = f"fina_indicator 调用失败：{self._safe_error_detail(exc)}"
        daily = daily_rows[0] if daily_rows else {}
        fina = fina_rows[0] if fina_rows else {}
        pe_ttm = self._first_float(daily, "pe_ttm", "pe", default=0)
        pb = self._first_float(daily, "pb", default=0)
        roe = self._first_float(fina, "roe_dt", "roe", "q_roe", default=0)
        revenue_growth = self._first_float(fina, "revenue_yoy", "or_yoy", default=0)
        profit_growth = self._first_float(fina, "netprofit_yoy", "profit_yoy", default=0)
        eps = self._first_optional_float(fina, "eps", "basic_eps")
        gross_margin = self._first_optional_float(fina, "grossprofit_margin", "gross_margin")
        debt_to_assets = self._first_optional_float(fina, "debt_to_assets")
        operating_cashflow_per_share = self._first_optional_float(fina, "ocfps")
        cashflow_to_profit = self._first_optional_float(fina, "ocf_to_profit", "cashflow_ratio")
        current_ratio = self._first_optional_float(fina, "current_ratio")
        quick_ratio = self._first_optional_float(fina, "quick_ratio")
        net_margin = self._first_optional_float(fina, "netprofit_margin", "net_profit_margin")
        asset_turnover = self._first_optional_float(fina, "assets_turn", "asset_turnover", "total_assets_turnover")
        selling_expense_ratio = self._first_optional_float(fina, "saleexp_to_gr", "selling_expense_ratio")
        admin_expense_ratio = self._first_optional_float(fina, "adminexp_of_gr", "admin_expense_ratio")
        financial_expense_ratio = self._first_optional_float(fina, "finaexp_of_gr", "financial_expense_ratio")
        equity_multiplier = self._first_optional_float(fina, "assets_to_eqt", "equity_multiplier")
        if pe_ttm <= 0 and pb <= 0 and roe == 0 and revenue_growth == 0 and profit_growth == 0:
            self._last_error = self._last_error or "财务指标返回空数据"
            return None
        self._last_error = None
        return FundamentalSnapshot(
            pe_ttm=pe_ttm,
            pb=pb,
            roe=max(-100, min(100, roe)),
            revenue_growth=revenue_growth,
            profit_growth=profit_growth,
            industry_pe_percentile=self._valuation_percentile(pe_ttm),
            eps=eps,
            gross_margin=gross_margin,
            debt_to_assets=debt_to_assets,
            operating_cashflow_per_share=operating_cashflow_per_share,
            cashflow_to_profit=cashflow_to_profit,
            current_ratio=current_ratio,
            quick_ratio=quick_ratio,
            net_margin=net_margin,
            asset_turnover=asset_turnover,
            selling_expense_ratio=selling_expense_ratio,
            admin_expense_ratio=admin_expense_ratio,
            financial_expense_ratio=financial_expense_ratio,
            equity_multiplier=equity_multiplier,
        )

    def _basic_info_from_tushare(self, symbol: str) -> dict[str, str] | None:
        client = self._client()
        stock_basic = getattr(client, "stock_basic", None) if client is not None else None
        if stock_basic is None:
            return None
        try:
            rows = self._rows(
                stock_basic(
                    ts_code=self._ts_code(symbol),
                    fields="ts_code,name,industry,area,market,list_date",
                )
            )
        except Exception as exc:
            self._last_error = f"stock_basic 调用失败：{self._safe_error_detail(exc)}"
            return None
        if not rows:
            self._last_error = self._last_error or "基础资料返回空数据"
            return None
        row = rows[0]
        update = {}
        name = self._first_text(row, "name", "stock_name")
        industry = self._first_text(row, "industry", "sw_industry")
        if name:
            update["name"] = name
        if industry:
            update["industry"] = industry
        return update or None

    def _history_from_tushare(self, symbol: str, days: int) -> list[HistoricalPriceBar]:
        module = self._ts_module
        if module is None:
            try:
                import tushare as module  # type: ignore
            except Exception:
                return []
        pro_bar = getattr(module, "pro_bar", None)
        if pro_bar is None:
            return []
        try:
            self._set_module_token(module)
            stdout = StringIO()
            with redirect_stdout(stdout):
                payload = pro_bar(
                    ts_code=self._ts_code(symbol),
                    adj="qfq",
                    freq="D",
                )
            rows = self._rows(payload)
        except Exception as exc:
            pro_bar_error = self._safe_error_detail(exc, stdout.getvalue())
            daily_rows = self._daily_history_rows(symbol)
            if not daily_rows:
                self._last_error = f"pro_bar 前复权日线调用失败：{pro_bar_error}"
                return []
            self._last_history_adjusted = False
            self._last_error = None
            return self._history_bars_from_rows(daily_rows, days)
        bars = self._history_bars_from_rows(rows, days)
        if not bars:
            self._last_error = self._last_error or "前复权日线返回空数据"
            return []
        self._last_history_adjusted = True
        self._last_error = None
        return bars

    def _daily_history_rows(self, symbol: str) -> list[dict]:
        client = self._client()
        daily = getattr(client, "daily", None) if client is not None else None
        if daily is None:
            return []
        try:
            return self._rows(daily(ts_code=self._ts_code(symbol)))
        except Exception as exc:
            self._last_error = f"daily 日线调用失败：{self._safe_error_detail(exc)}"
            return []

    def _history_bars_from_rows(self, rows: list[dict], days: int) -> list[HistoricalPriceBar]:
        bars: list[HistoricalPriceBar] = []
        for row in rows:
            close = self._first_float(row, "close", default=0)
            date_value = str(row.get("trade_date") or row.get("date") or "").strip()
            if close <= 0 or not date_value:
                continue
            bars.append(
                HistoricalPriceBar(
                    date=self._format_trade_date(date_value),
                    close=close,
                    volume=self._first_float(row, "vol", "volume", default=0),
                )
            )
        if not bars:
            return []
        return sorted(bars, key=lambda bar: bar.date)[-max(1, days):]

    def _rows(self, payload: object) -> list[dict]:
        if payload is None:
            return []
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        to_dict = getattr(payload, "to_dict", None)
        if to_dict is not None:
            try:
                records = to_dict("records")
                if isinstance(records, list):
                    return [item for item in records if isinstance(item, dict)]
            except Exception:
                return []
        return []

    def _set_module_token(self, module: object) -> None:
        token = settings.tushare_token.strip()
        if not token:
            return
        set_token = getattr(module, "set_token", None)
        if not callable(set_token):
            return
        try:
            set_token(token)
        except Exception:
            return

    def _probe_error_status(self, exc: Exception, optional: bool = False) -> str:
        detail = str(exc)
        if "频率超限" in detail:
            return "warn"
        if optional and ("没有接口" in detail or "权限" in detail):
            return "warn"
        return "fail"

    def _safe_error_detail(self, exc: Exception, stdout_text: str = "") -> str:
        parts: list[str] = []
        for line in stdout_text.splitlines():
            clean = line.strip()
            if clean and clean not in parts:
                parts.append(clean)
        exc_detail = str(exc).strip() or exc.__class__.__name__
        if exc_detail and exc_detail not in parts:
            parts.append(exc_detail)
        detail = "；".join(parts)
        token = settings.tushare_token.strip()
        if token:
            detail = detail.replace(token, "<TOKEN>")
        if len(detail) > 240:
            detail = f"{detail[:237]}..."
        return detail

    def _first_float(self, row: dict, *keys: str, default: float = 0) -> float:
        for key in keys:
            value = row.get(key)
            if value is None or value == "":
                continue
            try:
                return round(float(value), 2)
            except (TypeError, ValueError):
                continue
        return default

    def _first_optional_float(self, row: dict, *keys: str) -> float | None:
        for key in keys:
            value = row.get(key)
            if value is None or value == "":
                continue
            try:
                return round(float(value), 2)
            except (TypeError, ValueError):
                continue
        return None

    def _first_text(self, row: dict, *keys: str) -> str | None:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None

    def _valuation_percentile(self, pe_ttm: float) -> float:
        if pe_ttm <= 0:
            return 50
        if pe_ttm <= 10:
            return 25
        if pe_ttm <= 20:
            return 40
        if pe_ttm <= 35:
            return 58
        if pe_ttm <= 50:
            return 76
        return 88

    def _format_trade_date(self, value: str) -> str:
        if len(value) == 8 and value.isdigit():
            return f"{value[:4]}-{value[4:6]}-{value[6:]}"
        return value

    def _ts_code(self, symbol: str) -> str:
        normalized = symbol.strip().upper()
        suffix = "SH" if normalized.startswith("6") else "SZ"
        return f"{normalized}.{suffix}"
