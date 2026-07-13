from datetime import date

from app.schemas.diagnosis import DataConnectorHealth, DataQualityCheck, DataQualityReport, StockSnapshot

SOURCE_LABELS = {
    "capital-flow": "资金流",
    "fundamental": "财务字段",
    "fundamental-quote-detail": "东方财富估值详情",
    "historical-kline": "历史 K 线",
    "sina-capital-flow": "新浪资金流兜底",
    "tdx-kline": "通达信本地 K 线",
    "tencent-direct-search": "腾讯直接搜码",
    "tencent-index": "腾讯指数兜底",
    "tencent-kline": "腾讯 K 线兜底",
    "tencent-quote-detail": "腾讯估值兜底",
    "tencent-quotes": "腾讯报价兜底",
    "tushare-daily-basic": "Tushare 日行情基础指标",
    "tushare-fina-indicator": "Tushare 财务指标",
    "tushare-stock-basic": "Tushare 基础资料",
}

CONSERVATIVE_FIELD_LABELS = {
    "capital": "资金字段",
    "capital-flow": "资金流",
    "capital-seed": "资金样例种子",
    "fundamental": "财务字段",
    "fundamental-seed": "财务样例种子",
    "growth": "成长字段",
    "northbound": "北向资金",
    "technical": "技术指标",
}


class DataQualityService:
    def build_report(
        self,
        snapshot: StockSnapshot,
        connector_health: DataConnectorHealth | None = None,
    ) -> DataQualityReport:
        checks = [
            self._market_check(snapshot),
            self._source_coverage_check(snapshot),
            self._technical_check(snapshot),
            self._fundamental_check(snapshot),
            self._capital_check(snapshot),
            self._risk_check(snapshot),
            self._as_of_check(snapshot),
        ]
        if connector_health is not None:
            checks.append(self._runtime_check(connector_health))
        issue_count = len([check for check in checks if check.status != "pass"])
        failures = len([check for check in checks if check.status == "fail"])
        warnings = len([check for check in checks if check.status == "warn"])
        score = max(0, 100 - failures * 22 - warnings * 10)
        status = "fail" if failures else "warn" if warnings else "pass"
        coverage_pct = round((len(checks) - issue_count) / len(checks) * 100, 1)
        return DataQualityReport(
            symbol=snapshot.symbol,
            name=snapshot.name,
            as_of=snapshot.as_of,
            status=status,
            score=score,
            coverage_pct=coverage_pct,
            issue_count=issue_count,
            summary=self._summary(status, score, issue_count),
            checks=checks,
        )

    def _market_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        problems = []
        if snapshot.last_price <= 0:
            problems.append("最新价无效")
        if abs(snapshot.change_pct) > 20:
            problems.append("涨跌幅超过常规 A 股边界")
        return self._check(
            key="market",
            label="行情字段",
            problems=problems,
            warn=False,
            pass_detail="最新价与涨跌幅字段完整。",
            impact="直接影响关键价位、涨跌幅排序和短线热度判断。",
        )

    def _source_coverage_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        sources = [self._source_label(value) for value in snapshot.data_sources]
        conservative_fields = [self._conservative_label(value) for value in snapshot.conservative_fields]
        if conservative_fields:
            source_text = "、".join(sources) if sources else "未标注真实来源"
            conservative_text = "、".join(conservative_fields)
            status = "fail" if not sources and len(conservative_fields) >= 3 else "warn"
            return DataQualityCheck(
                key="source_coverage",
                label="来源覆盖",
                status=status,
                detail=f"真实来源：{source_text}；保守估算：{conservative_text}。",
                impact="用于区分真实数据、备用源和样例/保守估算，影响诊断结论可信度。",
            )
        if sources:
            return DataQualityCheck(
                key="source_coverage",
                label="来源覆盖",
                status="pass",
                detail=f"真实来源：{'、'.join(sources)}。",
                impact="用于区分真实数据、备用源和样例/保守估算，影响诊断结论可信度。",
            )
        return DataQualityCheck(
            key="source_coverage",
            label="来源覆盖",
            status="pass",
            detail="当前快照未单独标注字段来源，按字段完整性评估。",
            impact="用于区分真实数据、备用源和样例/保守估算，影响诊断结论可信度。",
        )

    def _technical_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        tech = snapshot.technical
        problems = []
        if min(tech.ma5, tech.ma20, tech.ma60) <= 0:
            problems.append("均线存在非正数")
        if not 0 <= tech.rsi14 <= 100:
            problems.append("RSI14 超出 0-100")
        if tech.volume_ratio < 0:
            problems.append("量比为负")
        return self._check(
            key="technical",
            label="技术指标",
            problems=problems,
            warn=False,
            pass_detail="均线、RSI、MACD 和量比字段可用于技术评分。",
            impact="影响技术分、趋势证据和操作清单。",
        )

    def _fundamental_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        base = snapshot.fundamental
        problems = []
        if base.pe_ttm <= 0:
            problems.append("PE TTM 非正")
        if base.pb <= 0:
            problems.append("PB 非正")
        if not 0 <= base.industry_pe_percentile <= 100:
            problems.append("行业估值分位超出 0-100")
        if base.roe < -100 or base.roe > 100:
            problems.append("ROE 超出常规区间")
        return self._check(
            key="fundamental",
            label="估值财务",
            problems=problems,
            warn=False,
            pass_detail="估值、盈利质量与成长性字段完整。",
            impact="影响估值分、成长性证据和策略股票池。",
        )

    def _capital_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        capital = snapshot.capital
        problems = []
        if capital.turnover_rate < 0:
            problems.append("换手率为负")
        warn = abs(capital.main_inflow_million) == 0 and abs(capital.northbound_inflow_million) == 0
        if warn:
            problems.append("资金流字段疑似缺省为 0")
        return self._check(
            key="capital",
            label="资金行为",
            problems=problems,
            warn=warn,
            pass_detail="主力、北向和换手字段可用于资金评分。",
            impact="影响资金分、资金流预警和资金承压筛选。",
        )

    def _risk_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        risk = snapshot.risk
        problems = []
        if risk.pledge_ratio < 0 or risk.pledge_ratio > 100:
            problems.append("质押比例超出 0-100")
        if risk.unlock_days is not None and risk.unlock_days < 0:
            problems.append("解禁天数为负")
        if risk.limit_up_streak < 0:
            problems.append("连板数为负")
        return self._check(
            key="risk",
            label="风险字段",
            problems=problems,
            warn=False,
            pass_detail="质押、解禁、ST 与连板字段可用于风险规则。",
            impact="影响风险分、预警中心和跟踪时间线。",
        )

    def _as_of_check(self, snapshot: StockSnapshot) -> DataQualityCheck:
        try:
            as_of = date.fromisoformat(snapshot.as_of)
        except ValueError:
            return DataQualityCheck(
                key="as_of",
                label="数据日期",
                status="fail",
                detail="数据日期格式无法识别。",
                impact="无法判断诊断报告的时效性。",
            )
        age_days = max(0, (date.today() - as_of).days)
        if age_days <= 1:
            status = "pass"
            detail = f"数据日期为 {snapshot.as_of}，时效正常。"
        elif age_days <= 7:
            status = "warn"
            detail = f"数据日期距今 {age_days} 天，建议刷新。"
        else:
            status = "fail"
            detail = f"数据日期距今 {age_days} 天，应视为过期。"
        return DataQualityCheck(
            key="as_of",
            label="数据日期",
            status=status,
            detail=detail,
            impact="影响诊断报告和价位提醒的有效期判断。",
        )

    def _runtime_check(self, connector_health: DataConnectorHealth) -> DataQualityCheck:
        active_connector = next((item for item in connector_health.connectors if item.active), None)
        fallback_count = len([item for item in connector_health.connectors if item.status == "fallback"])
        error_count = len([item for item in connector_health.connectors if item.status in {"error", "missing-package"}])
        cache_status = connector_health.cache_status
        stale_buckets = []
        hit_rates = []
        if cache_status is not None:
            stale_buckets = [bucket.label for bucket in cache_status.buckets if bucket.status in {"expired", "partial"}]
            hit_rates = [
                bucket.hit_rate_pct
                for bucket in cache_status.buckets
                if bucket.hit_count + bucket.miss_count > 0
            ]
        average_hit_rate = round(sum(hit_rates) / len(hit_rates), 1) if hit_rates else None

        problems = []
        if active_connector is not None and active_connector.status in {"fallback", "error", "missing-package"}:
            problems.append(f"主连接器 {active_connector.name} 状态为 {active_connector.status}")
        if fallback_count >= 3:
            problems.append(f"{fallback_count} 个连接器处于 fallback")
        if error_count:
            problems.append(f"{error_count} 个连接器缺包或异常")
        if stale_buckets:
            problems.append(f"缓存桶需刷新：{'、'.join(stale_buckets[:3])}")
        if average_hit_rate is not None and average_hit_rate < 50:
            problems.append(f"缓存平均命中率 {average_hit_rate}%")

        if not problems:
            hit_text = f"，缓存平均命中率 {average_hit_rate}%" if average_hit_rate is not None else ""
            return DataQualityCheck(
                key="runtime_environment",
                label="运行环境",
                status="pass",
                detail=f"连接器状态稳定{hit_text}。",
                impact="影响真实数据获取稳定性、缓存复用和 fallback 风险判断。",
            )

        status = "fail" if error_count or (active_connector is not None and active_connector.status == "error") else "warn"
        return DataQualityCheck(
            key="runtime_environment",
            label="运行环境",
            status=status,
            detail="；".join(problems) + "。",
            impact="影响真实数据获取稳定性、缓存复用和 fallback 风险判断。",
        )

    def _check(
        self,
        key: str,
        label: str,
        problems: list[str],
        warn: bool,
        pass_detail: str,
        impact: str,
    ) -> DataQualityCheck:
        if not problems:
            return DataQualityCheck(key=key, label=label, status="pass", detail=pass_detail, impact=impact)
        return DataQualityCheck(
            key=key,
            label=label,
            status="warn" if warn else "fail",
            detail="；".join(problems) + "。",
            impact=impact,
        )

    def _summary(self, status: str, score: int, issue_count: int) -> str:
        if status == "pass":
            return f"数据质量 {score} 分，当前诊断字段完整。"
        if status == "warn":
            return f"数据质量 {score} 分，存在 {issue_count} 个可继续观察的问题。"
        return f"数据质量 {score} 分，存在 {issue_count} 个会影响诊断可信度的问题。"

    def _source_label(self, value: str) -> str:
        return SOURCE_LABELS.get(value, value)

    def _conservative_label(self, value: str) -> str:
        return CONSERVATIVE_FIELD_LABELS.get(value, value)
