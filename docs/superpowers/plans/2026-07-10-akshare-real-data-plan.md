# AKShare 真实数据链路 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 Stock Doctor 的 AKShare 真实行情路径，让股票列表、市场概览、刷新预热、fallback 状态和测试都更可靠。

**Architecture:** 继续把所有 AKShare 细节封装在 `AkshareMarketDataProvider` 内，下游诊断、选股、热点和 API routes 只消费现有 schema。刷新服务通过 provider 边界触发缓存预热；连接器健康继续读取 provider 的 `get_data_sources()`，把真实数据状态和 fallback 原因展示给前端。

**Tech Stack:** Python 3.12、FastAPI、Pydantic v2、pytest；测试使用 fake AKShare module，不访问真实网络。

## Global Constraints

- 保留 Mock provider 作为稳定兜底，真实数据失败不能导致 dashboard 常规请求崩溃。
- AKShare 网络、缺包、空 payload、字段名变化都要转成 fallback/error 状态和可读消息。
- 不引入真实 AKShare 网络测试。
- 本地源码当前不是 `.git` 工作树，执行计划时不能依赖 commit 成功。
- 每个任务完成后至少运行对应 pytest；阶段收尾运行 `python -m pytest`。

---

## 文件结构

- Modify: `backend/app/services/akshare_provider.py`
  - 负责 AKShare row 归一化、市场概览、缓存预热、fallback 状态和可读数据源信息。
- Modify: `backend/app/services/providers.py`
  - 在 `MarketDataProvider` 协议中增加 `warm_cache(scope: str = "all") -> int`。
- Modify: `backend/app/services/market_data.py`
  - Mock provider 实现 no-op `warm_cache`，保持协议一致。
- Modify: `backend/app/services/refresh_jobs.py`
  - 刷新任务调用 provider 的 `warm_cache`，让刷新不仅列出股票，还预热 snapshot。
- Modify: `backend/tests/test_provider_factory.py`
  - 增加 fake AKShare 市场概览、字段来源/fallback、缓存预热测试。
- Modify: `backend/tests/test_refresh_jobs.py`
  - 增加刷新服务调用 `warm_cache` 的测试。
- Modify: `backend/tests/test_data_connectors.py`
  - 增加 provider source message 被连接器健康透出的测试。

---

### Task 1: AKShare 市场概览归一化

**Files:**
- Modify: `backend/app/services/akshare_provider.py`
- Test: `backend/tests/test_provider_factory.py`

**Interfaces:**
- Consumes: fake AKShare methods `stock_zh_a_spot_em()` and optional `stock_zh_index_spot_em()`
- Produces: `AkshareMarketDataProvider.get_market_overview() -> MarketOverview`

- [ ] **Step 1: 写失败测试**

Add to `backend/tests/test_provider_factory.py`:

```python
class FakeAkshareWithMarketOverview:
    def stock_zh_a_spot_em(self):
        return [
            {"代码": "000001", "名称": "平安银行", "行业": "银行", "最新价": "10.62", "涨跌幅": "0.19"},
            {"代码": "600519", "名称": "贵州茅台", "行业": "白酒", "最新价": "1518.3", "涨跌幅": "1.18"},
            {"代码": "300750", "名称": "宁德时代", "行业": "电池", "最新价": "214.8", "涨跌幅": "-0.74"},
        ]

    def stock_zh_index_spot_em(self):
        return [
            {"代码": "000300", "名称": "沪深300", "最新价": "4216.38", "涨跌幅": "0.72"},
            {"代码": "000001", "名称": "上证指数", "最新价": "3120.15", "涨跌幅": "0.31"},
        ]


class FailingAkshareMarketOverview(FakeAkshareWithMarketOverview):
    def stock_zh_index_spot_em(self):
        raise RuntimeError("index endpoint unavailable")


def test_akshare_provider_builds_market_overview_from_remote_rows():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithMarketOverview())

    overview = provider.get_market_overview()

    assert overview.index_name == "沪深300"
    assert overview.index_level == 4216.38
    assert overview.index_change_pct == 0.72
    assert overview.advancing == 2
    assert overview.declining == 1
    assert overview.hot_industries[:2] == ["白酒", "银行"]
    assert "AKShare" in overview.risk_notes[0]


def test_akshare_provider_market_overview_falls_back_when_index_endpoint_fails():
    provider = AkshareMarketDataProvider(ak_module=FailingAkshareMarketOverview())

    overview = provider.get_market_overview()
    sources = provider.get_data_sources()

    assert overview.index_name == "沪深 300"
    assert sources[0]["status"] == "fallback"
    assert "index endpoint unavailable" in sources[0]["role"]
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
python -m pytest tests/test_provider_factory.py::test_akshare_provider_builds_market_overview_from_remote_rows tests/test_provider_factory.py::test_akshare_provider_market_overview_falls_back_when_index_endpoint_fails -v
```

Expected: first test fails because `get_market_overview()` still returns Mock; second test may fail because fallback error is not recorded for the index endpoint.

- [ ] **Step 3: 实现市场概览**

In `backend/app/services/akshare_provider.py`, replace `get_market_overview()` and add helpers:

```python
    def get_market_overview(self) -> MarketOverview:
        if self._ak is None:
            return self._fallback.get_market_overview()
        try:
            overview = self._market_overview_from_remote()
        except Exception as exc:
            self._last_error = str(exc)
            return self._fallback.get_market_overview()
        if overview is None:
            self._last_error = "AKShare market overview returned no usable rows"
            return self._fallback.get_market_overview()
        self._last_error = None
        return overview

    def _market_overview_from_remote(self) -> MarketOverview | None:
        stocks = self.list_stocks()
        index_rows = self._call_stock_rows("stock_zh_index_spot_em")
        index_row = self._pick_index_row(index_rows)
        if index_row is None:
            return None
        index_name = self._first_text(index_row, "名称", "name") or "沪深300"
        index_level = self._first_float(index_row, "最新价", "last_price", "close", default=0)
        index_change_pct = self._first_float(index_row, "涨跌幅", "change_pct", default=0)
        if index_level <= 0:
            return None
        advancing = len([stock for stock in stocks if stock.change_pct >= 0])
        declining = len(stocks) - advancing
        hot_industries = [
            stock.industry
            for stock in sorted(stocks, key=lambda item: item.change_pct, reverse=True)
            if stock.industry
        ][:3]
        return MarketOverview(
            as_of=date.today().isoformat(),
            index_name=index_name,
            index_level=index_level,
            index_change_pct=index_change_pct,
            advancing=advancing,
            declining=declining,
            hot_industries=hot_industries,
            risk_notes=["AKShare 行情概览已启用；指数和市场广度来自远端归一化数据。"],
        )

    def _pick_index_row(self, rows: list[dict]) -> dict | None:
        if not rows:
            return None
        for row in rows:
            code = self._first_text(row, "代码", "code", "symbol")
            name = self._first_text(row, "名称", "name")
            if code in {"000300", "399300"} or "沪深300" in name or "沪深 300" in name:
                return row
        return rows[0]
```

- [ ] **Step 4: 运行通过测试**

Run:

```powershell
python -m pytest tests/test_provider_factory.py::test_akshare_provider_builds_market_overview_from_remote_rows tests/test_provider_factory.py::test_akshare_provider_market_overview_falls_back_when_index_endpoint_fails -v
```

Expected: both tests PASS.

- [ ] **Step 5: 记录提交状态**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository. If a real Git worktree has been restored, commit:

```powershell
git add backend/app/services/akshare_provider.py backend/tests/test_provider_factory.py
git commit -m "feat: build akshare market overview"
```

---

### Task 2: Provider 缓存预热接口

**Files:**
- Modify: `backend/app/services/providers.py`
- Modify: `backend/app/services/market_data.py`
- Modify: `backend/app/services/akshare_provider.py`
- Test: `backend/tests/test_provider_factory.py`

**Interfaces:**
- Produces: `MarketDataProvider.warm_cache(scope: str = "all") -> int`
- Consumes later: `DataRefreshJobService.run_refresh()` will call `provider.warm_cache(scope)`

- [ ] **Step 1: 写失败测试**

Add to `backend/tests/test_provider_factory.py`:

```python
def test_akshare_provider_warms_watchlist_snapshot_cache(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare, state_store=store)
    provider.add_to_watchlist("688002")

    warmed = provider.warm_cache(scope="watchlist")
    first = provider.get_snapshot("688002")
    second = provider.get_snapshot("688002")

    assert warmed == 1
    assert first is second
    assert akshare.history_calls == 1


def test_akshare_provider_warms_all_listed_stocks():
    akshare = FakeAkshareWithHistory()
    provider = AkshareMarketDataProvider(ak_module=akshare)

    warmed = provider.warm_cache(scope="all")

    assert warmed == 1
    assert akshare.history_calls == 1
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
python -m pytest tests/test_provider_factory.py::test_akshare_provider_warms_watchlist_snapshot_cache tests/test_provider_factory.py::test_akshare_provider_warms_all_listed_stocks -v
```

Expected: FAIL with `AttributeError: 'AkshareMarketDataProvider' object has no attribute 'warm_cache'`.

- [ ] **Step 3: 更新 provider 协议**

In `backend/app/services/providers.py`, add:

```python
    def warm_cache(self, scope: str = "all") -> int:
        ...
```

- [ ] **Step 4: Mock provider 实现 no-op 预热**

In `backend/app/services/market_data.py`, add this method inside `MockMarketDataProvider`:

```python
    def warm_cache(self, scope: str = "all") -> int:
        stocks = self.get_watchlist() if scope == "watchlist" else self.list_stocks()
        return len(stocks)
```

- [ ] **Step 5: AKShare provider 实现 snapshot 预热**

In `backend/app/services/akshare_provider.py`, add:

```python
    def warm_cache(self, scope: str = "all") -> int:
        stocks = self.get_watchlist() if scope == "watchlist" else self.list_stocks()
        warmed = 0
        for stock in stocks:
            if self.get_snapshot(stock.symbol) is not None:
                warmed += 1
        return warmed
```

- [ ] **Step 6: 运行通过测试**

Run:

```powershell
python -m pytest tests/test_provider_factory.py::test_akshare_provider_warms_watchlist_snapshot_cache tests/test_provider_factory.py::test_akshare_provider_warms_all_listed_stocks -v
```

Expected: both tests PASS.

- [ ] **Step 7: 记录提交状态**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository. If Git is available:

```powershell
git add backend/app/services/providers.py backend/app/services/market_data.py backend/app/services/akshare_provider.py backend/tests/test_provider_factory.py
git commit -m "feat: add provider cache warming"
```

---

### Task 3: 刷新任务调用缓存预热

**Files:**
- Modify: `backend/app/services/refresh_jobs.py`
- Test: `backend/tests/test_refresh_jobs.py`

**Interfaces:**
- Consumes: `MarketDataProvider.warm_cache(scope: str = "all") -> int`
- Produces: refresh job `stock_count` reflects warmed target count, and message remains readable.

- [ ] **Step 1: 写失败测试**

Add to `backend/tests/test_refresh_jobs.py`:

```python
class WarmableProvider(MockMarketDataProvider):
    def __init__(self, state_store):
        super().__init__(state_store=state_store)
        self.warmed_scopes = []

    def warm_cache(self, scope: str = "all") -> int:
        self.warmed_scopes.append(scope)
        return len(self.get_watchlist() if scope == "watchlist" else self.list_stocks())


def test_refresh_job_service_warms_provider_cache(tmp_path):
    store = JsonStateStore(tmp_path / "state.json")
    provider = WarmableProvider(state_store=store)
    service = DataRefreshJobService(state_store=store)

    job = service.run_refresh(provider=provider, scope="watchlist")

    assert job.status == "success"
    assert provider.warmed_scopes == ["watchlist"]
    assert job.stock_count == len(provider.get_watchlist())
```

- [ ] **Step 2: 运行失败测试**

Run:

```powershell
python -m pytest tests/test_refresh_jobs.py::test_refresh_job_service_warms_provider_cache -v
```

Expected: FAIL because `DataRefreshJobService.run_refresh()` does not call `warm_cache`.

- [ ] **Step 3: 实现刷新预热**

In `backend/app/services/refresh_jobs.py`, change the successful branch in `run_refresh()` to:

```python
        try:
            warmed_count = provider.warm_cache(scope)
            stocks = provider.get_watchlist() if scope == "watchlist" else provider.list_stocks()
            watchlist = provider.get_watchlist()
            sources = provider.get_data_sources()
            status = "success"
            message = self._message(scope, warmed_count, len(watchlist))
        except Exception as exc:
```

Then change the `DataRefreshJob` creation in the same method so `stock_count` uses the actual warmed coverage:

```python
            stock_count=warmed_count if status == "success" else len(stocks),
```

- [ ] **Step 4: 运行通过测试**

Run:

```powershell
python -m pytest tests/test_refresh_jobs.py::test_refresh_job_service_warms_provider_cache tests/test_refresh_jobs.py -v
```

Expected: selected refresh job tests PASS.

- [ ] **Step 5: 记录提交状态**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository. If Git is available:

```powershell
git add backend/app/services/refresh_jobs.py backend/tests/test_refresh_jobs.py
git commit -m "feat: warm provider cache during refresh"
```

---

### Task 4: AKShare fallback 状态和字段来源说明

**Files:**
- Modify: `backend/app/services/akshare_provider.py`
- Modify: `backend/tests/test_provider_factory.py`
- Modify: `backend/tests/test_data_connectors.py`

**Interfaces:**
- Produces: `AkshareMarketDataProvider.get_data_sources() -> list[dict[str, str]]` with readable role text.
- Consumes: `DataConnectorHealthService._source_by_name()` and existing connector health schema.

- [ ] **Step 1: 写 provider 状态测试**

Add to `backend/tests/test_provider_factory.py`:

```python
def test_akshare_provider_reports_partial_snapshot_sources():
    provider = AkshareMarketDataProvider(ak_module=FakeAkshareWithRemoteStock())

    snapshot = provider.get_snapshot("688001")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert sources[0]["status"] == "online"
    assert "保守估算" in sources[0]["role"]
    assert "fundamental" in sources[0]["role"]
    assert "capital" in sources[0]["role"]


def test_akshare_provider_reports_error_after_snapshot_enrichment_failure():
    class FailingHistoryAkshare(FakeAkshareWithRemoteStock):
        def stock_zh_a_hist(self, symbol: str, period: str, adjust: str):
            raise RuntimeError("history unavailable")

    provider = AkshareMarketDataProvider(ak_module=FailingHistoryAkshare())

    snapshot = provider.get_snapshot("688001")
    sources = provider.get_data_sources()

    assert snapshot is not None
    assert sources[0]["status"] == "fallback"
    assert "history unavailable" in sources[0]["role"]
```

- [ ] **Step 2: 写连接器健康透传测试**

Add to `backend/tests/test_data_connectors.py`:

```python
class PartialAkshareProvider:
    def get_data_sources(self):
        return [
            {
                "name": "AKShare",
                "status": "online",
                "role": "行情可用；fundamental、capital 使用保守估算。",
            },
            {"name": "Mock A股样例库", "status": "fallback", "role": "稳定回退"},
        ]


def test_data_connector_health_surfaces_partial_provider_message(monkeypatch):
    monkeypatch.setattr(settings, "data_provider", "akshare")

    health = DataConnectorHealthService().build_health(provider=PartialAkshareProvider())
    akshare = next(connector for connector in health.connectors if connector.name == "AKShare")

    assert akshare.status == "online"
    assert "fundamental" in akshare.message
    assert "capital" in akshare.message
```

- [ ] **Step 3: 运行失败测试**

Run:

```powershell
python -m pytest tests/test_provider_factory.py::test_akshare_provider_reports_partial_snapshot_sources tests/test_provider_factory.py::test_akshare_provider_reports_error_after_snapshot_enrichment_failure tests/test_data_connectors.py::test_data_connector_health_surfaces_partial_provider_message -v
```

Expected: provider status tests fail because partial source notes are not tracked; connector test may pass once provider-like source is passed through.

- [ ] **Step 4: 实现字段来源和错误记录**

In `backend/app/services/akshare_provider.py`, initialize note storage in `__init__`:

```python
        self._partial_notes: set[str] = set()
```

In `_summary_to_conservative_snapshot()`, replace the direct fallback expressions with explicit source tracking:

```python
        technical = self._technical_from_history(summary.symbol)
        if technical is None:
            self._partial_notes.add("technical")
            technical = self._conservative_technical(summary.last_price)

        fundamental = self._fundamental_from_remote(summary.symbol)
        if fundamental is None:
            self._partial_notes.add("fundamental")
            fundamental = self._conservative_fundamental()

        capital = self._capital_from_remote(summary.symbol)
        if capital is None:
            self._partial_notes.add("capital")
            capital = self._conservative_capital()
```

In `_call_history_rows()`, preserve readable errors:

```python
        try:
            payload = method(symbol=symbol, period="daily", adjust="qfq")
        except TypeError:
            try:
                payload = method(symbol)
            except Exception as exc:
                self._last_error = str(exc)
                return []
        except Exception as exc:
            self._last_error = str(exc)
            return []
```

In `_call_symbol_rows()`, preserve readable errors:

```python
        try:
            payload = method(symbol=symbol)
        except TypeError:
            try:
                payload = method(symbol)
            except Exception as exc:
                self._last_error = str(exc)
                return []
        except Exception as exc:
            self._last_error = str(exc)
            return []
```

Replace `get_data_sources()` with:

```python
    def get_data_sources(self) -> list[dict[str, str]]:
        if self._ak is None:
            status = "missing-package"
            message = "当前环境未安装 akshare。"
        elif self._last_error is not None:
            status = "fallback"
            message = self._last_error
        else:
            status = "online"
            message = "行情列表可由 AKShare 获取。"

        if self._partial_notes and status == "online":
            partial = "、".join(sorted(self._partial_notes))
            message = f"{message} {partial} 使用保守估算。"

        return [
            {"name": "AKShare", "status": status, "role": f"行情、指数、板块、资金流；{message}"},
            {"name": "Mock A股样例库", "status": "fallback", "role": "适配器未完成时的稳定回退"},
        ]
```

- [ ] **Step 5: 运行通过测试**

Run:

```powershell
python -m pytest tests/test_provider_factory.py::test_akshare_provider_reports_partial_snapshot_sources tests/test_provider_factory.py::test_akshare_provider_reports_error_after_snapshot_enrichment_failure tests/test_data_connectors.py::test_data_connector_health_surfaces_partial_provider_message -v
```

Expected: all selected tests PASS.

- [ ] **Step 6: 记录提交状态**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository. If Git is available:

```powershell
git add backend/app/services/akshare_provider.py backend/tests/test_provider_factory.py backend/tests/test_data_connectors.py
git commit -m "feat: surface akshare fallback details"
```

---

### Task 5: 第一阶段回归验证

**Files:**
- No code changes expected.

**Interfaces:**
- Verifies backend behavior remains compatible with current API and services.

- [ ] **Step 1: 运行 AKShare/provider 相关测试**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
python -m pytest tests/test_provider_factory.py tests/test_data_connectors.py tests/test_refresh_jobs.py -v
```

Expected: all selected tests PASS.

- [ ] **Step 2: 运行完整后端测试**

Run:

```powershell
python -m pytest
```

Expected: all backend tests PASS.

- [ ] **Step 3: 更新项目说明**

Modify `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md` by adding an implementation note:

```md
## 2026-07-10 开发进展

- 第一阶段计划聚焦 AKShare 真实数据链路：市场概览、缓存预热、刷新任务、fallback 状态和 provider 测试。
- 当前源码目录仍不是完整 Git 工作树；如需提交和同步，需要先恢复 GitHub Git 访问或重新完整克隆。
```

- [ ] **Step 4: 检查 Git 状态或记录无法提交**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository. If Git is available:

```powershell
git add C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md
git commit -m "docs: note akshare real data phase"
```
