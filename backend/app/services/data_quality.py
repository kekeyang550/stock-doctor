from datetime import date

from app.schemas.diagnosis import DataQualityCheck, DataQualityReport, StockSnapshot


class DataQualityService:
    def build_report(self, snapshot: StockSnapshot) -> DataQualityReport:
        checks = [
            self._market_check(snapshot),
            self._technical_check(snapshot),
            self._fundamental_check(snapshot),
            self._capital_check(snapshot),
            self._risk_check(snapshot),
            self._as_of_check(snapshot),
        ]
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
