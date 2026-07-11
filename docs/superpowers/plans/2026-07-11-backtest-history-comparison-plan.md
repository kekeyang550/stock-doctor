# 策略回测历史对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保存最近策略回测摘要，并在前端与导出报告中展示历史趋势对比。

**Architecture:** `StateStore` 增加 `strategy_backtests` 读写能力，`StrategyBacktestHistoryService` 负责摘要生成、保存、筛选和差值计算。单策略回测接口生成 report 后记录摘要，新增历史查询接口供前端展示和报告导出使用。

**Tech Stack:** Python 3.12、FastAPI/Pydantic、pytest、React、TypeScript、Vitest、Vite。

## Global Constraints

- 不新增第三方依赖。
- 不保存每笔交易明细，只保存回测摘要字段。
- 不改变策略回测收益计算、候选筛选、周期推荐或策略推荐逻辑。
- 历史接口失败只能影响局部历史对比 UI，不能拖垮当前回测面板。
- 中文文案保持研究辅助口径，不承诺真实收益。

---

### Task 1: 后端存储和历史服务

**Files:**
- Modify: `backend/app/services/storage.py`
- Create: `backend/app/services/strategy_backtest_history.py`
- Modify: `backend/app/schemas/diagnosis.py`
- Test: `backend/tests/test_sqlite_storage.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces: `StateStore.load_strategy_backtests() -> list[dict[str, Any]]`
- Produces: `StateStore.save_strategy_backtests(records: list[dict[str, Any]]) -> None`
- Produces: `StrategyBacktestHistoryService.record(...)`
- Produces: `StrategyBacktestHistoryService.compare(...) -> StrategyBacktestHistoryComparison`

- [ ] **Step 1: Write failing storage tests**

In JSON/SQLite storage tests, save and load:

```python
payload = [{"id": "bt-1", "preset": "strong", "horizon": "swing"}]
store.save_strategy_backtests(payload)
assert store.load_strategy_backtests() == payload
```

- [ ] **Step 2: Write failing history service test**

Add a test that runs two backtests with different holding days, records them, and asserts:

```python
comparison = history_service.compare("breakout-volume", "swing", store)
assert comparison.latest is not None
assert comparison.previous is not None
assert len(comparison.items) == 2
assert comparison.latest.stability_score >= 0
assert "最近" in comparison.summary or "暂无" not in comparison.summary
```

- [ ] **Step 3: Run focused backend RED**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-history-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_sqlite_storage.py tests/test_strategy_backtest.py::test_strategy_backtest_history_service_records_and_compares -q
```

Expected: FAIL because storage methods and history service do not exist.

- [ ] **Step 4: Implement storage methods**

Add `load_strategy_backtests` and `save_strategy_backtests` to both `JsonStateStore` and `SQLiteStateStore`.

- [ ] **Step 5: Add Pydantic models**

Add `StrategyBacktestHistoryItem` and `StrategyBacktestHistoryComparison` to `backend/app/schemas/diagnosis.py`.

- [ ] **Step 6: Implement history service**

Create `backend/app/services/strategy_backtest_history.py` with:

```python
class StrategyBacktestHistoryService:
    def record(...)
    def compare(...)
```

Use ISO UTC timestamps, cap to 100 records, sort newest first, compute deltas from latest minus previous.

- [ ] **Step 7: Run focused backend GREEN**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-history-green.json"; .\.venv\Scripts\python.exe -m pytest tests/test_sqlite_storage.py tests/test_strategy_backtest.py::test_strategy_backtest_history_service_records_and_compares -q
```

Expected: PASS.

### Task 2: 后端 API 接入

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `GET /api/v1/backtests/strategy/history?preset=<preset>&horizon=<horizon>&limit=8`
- Side effect: `GET /api/v1/backtests/strategy` records the generated report summary.

- [ ] **Step 1: Write failing API test**

Add a test:

```python
client.get("/api/v1/backtests/strategy?preset=breakout-volume&horizon=swing&holding_days=5")
client.get("/api/v1/backtests/strategy?preset=breakout-volume&horizon=swing&holding_days=10")
response = client.get("/api/v1/backtests/strategy/history?preset=breakout-volume&horizon=swing&limit=8")
assert response.status_code == 200
payload = response.json()
assert len(payload["items"]) >= 2
assert payload["latest"]["stability_score"] >= 0
assert "summary" in payload
```

- [ ] **Step 2: Run API RED**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-history-api-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_api.py::test_strategy_backtest_history_records_recent_runs -q
```

Expected: FAIL because route does not exist or no history is recorded.

- [ ] **Step 3: Wire service in routes**

Import `StrategyBacktestHistoryComparison` and `StrategyBacktestHistoryService`. Instantiate service. In `strategy_backtest`, assign report to a variable, call `record(...)`, then return report. Add history route.

- [ ] **Step 4: Run API GREEN**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-history-api-green.json"; .\.venv\Scripts\python.exe -m pytest tests/test_api.py::test_strategy_backtest_history_records_recent_runs -q
```

Expected: PASS.

### Task 3: 前端历史对比 UI 和导出

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `StrategyBacktestHistoryComparison`
- Produces: visible “历史对比” panel content and HTML report section.

- [ ] **Step 1: Add failing frontend fixtures and assertions**

Add `strategyBacktestHistory` fixture and mock `/backtests/strategy/history`. Assert:

```ts
expect(within(backtestPanel).getByText('历史对比')).toBeInTheDocument()
expect(within(backtestPanel).getByText('平均收益变化')).toBeInTheDocument()
expect(within(backtestPanel).getByText('稳定评分变化')).toBeInTheDocument()
expect(within(backtestPanel).getByText('最近回测')).toBeInTheDocument()
expect(html).toContain('历史对比')
expect(html).toContain('稳定评分变化')
```

- [ ] **Step 2: Run frontend RED**

```powershell
npm test -- --run src/App.test.tsx
```

Expected: FAIL because no history UI/export exists.

- [ ] **Step 3: Add types and API**

Add `StrategyBacktestHistoryItem`, `StrategyBacktestHistoryComparison`, and `fetchStrategyBacktestHistory`.

- [ ] **Step 4: Add App state and loading**

Add `strategyBacktestHistory` and `strategyBacktestHistoryError`. In `loadStrategyBacktest`, after current report loads, call history endpoint and set state. Add history to report payload.

- [ ] **Step 5: Render panel**

In `StrategyBacktestPanel`, render a compact history card after stability card. Show summary, deltas, and up to 4 history items.

- [ ] **Step 6: Render HTML export**

In `buildResearchReportHtml`, add “历史对比” under strategy backtest with deltas and recent items.

- [ ] **Step 7: Run frontend GREEN**

```powershell
npm test -- --run src/App.test.tsx
```

Expected: 32 passed.

### Task 4: Verification, notes, commit

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] **Step 1: Run backend full tests**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-history-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

Expected: all backend tests pass; one known upstream deprecation warning is acceptable.

- [ ] **Step 2: Run frontend full tests**

```powershell
npm test -- --run
```

Expected: all frontend tests pass.

- [ ] **Step 3: Run frontend build**

```powershell
npm run build
```

Expected: build exits 0.

- [ ] **Step 4: Browser verification**

Open `http://127.0.0.1:30080/` and verify text includes “策略回测 / 历史对比 / 最近回测”, no console error logs, and body is not blank.

- [ ] **Step 5: Update project note**

Append `2026-07-11 策略回测历史对比` to project notes with scope and verification.

- [ ] **Step 6: Commit and push**

```powershell
git add backend/app/services/storage.py backend/app/services/strategy_backtest_history.py backend/app/schemas/diagnosis.py backend/app/api/routes.py backend/tests/test_sqlite_storage.py backend/tests/test_strategy_backtest.py backend/tests/test_api.py frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/components/screeners/ScreenerPanels.tsx frontend/src/App.tsx frontend/src/App.test.tsx docs/superpowers/specs/2026-07-11-backtest-history-comparison-design.md docs/superpowers/plans/2026-07-11-backtest-history-comparison-plan.md
git commit -m "feat: add backtest history comparison"
git push origin local-codex-progress
```

## Self-Review

- Spec coverage: storage, service, API, UI, export, verification all mapped.
- Placeholder scan: no TBD/TODO.
- Type consistency: uses `StrategyBacktestHistoryItem` and `StrategyBacktestHistoryComparison` everywhere.
