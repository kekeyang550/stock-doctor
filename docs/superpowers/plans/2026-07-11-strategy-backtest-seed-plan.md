# 策略回测雏形 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sample-data strategy backtest report that shows rule hits, holding period returns, win rate, and drawdown for the active screener preset.

**Architecture:** Add a backend `StrategyBacktestService` that composes existing screener, diagnosis, and trend services. Expose it through `/api/v1/backtests/strategy`, then render the report in a focused frontend panel near the strategy screener.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest, Testing Library.

## Global Constraints

- Use existing sample market data and existing strategy rules only.
- Do not add Python or frontend dependencies.
- Label the feature as sample backtest, not real historical trading performance.
- Keep all new files inside `project_0010_stock-doctor/stock-doctor`.
- Preserve existing endpoints and current strategy screener behavior.

---

### Task 1: Backend Schemas And Service

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Create: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Consumes: `StockSnapshot`, `DiagnosisResponse`, `ScreenCandidate`, `TrendService.build_series(snapshot, days)`
- Produces: `StrategyBacktestService.run(preset, horizon, snapshots, diagnoses, holding_days, limit) -> StrategyBacktestReport`

- [ ] **Step 1: Write the failing service test**

```python
from app.services.diagnosis import DiagnosisEngine
from app.services.market_data import MockMarketDataProvider
from app.services.strategy_backtest import StrategyBacktestService


def test_strategy_backtest_reports_returns_and_drawdown():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]

    report = StrategyBacktestService().run(
        preset="breakout-volume",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        holding_days=5,
        limit=8,
    )

    assert report.preset == "breakout-volume"
    assert report.holding_days == 5
    assert report.sample_size == len(snapshots)
    assert report.match_count >= 1
    assert report.trade_count >= 1
    assert 0 <= report.win_rate <= 100
    assert report.best_return_pct >= report.worst_return_pct
    assert report.max_drawdown_pct <= 0
    assert report.trades[0].holding_days == 5
    assert report.trades[0].rule_tags
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q`
Expected: FAIL because `app.services.strategy_backtest` does not exist.

- [ ] **Step 3: Add Pydantic models**

Add `StrategyBacktestTrade` and `StrategyBacktestReport` to `backend/app/schemas/diagnosis.py` with the fields from the design doc.

- [ ] **Step 4: Implement `StrategyBacktestService`**

Create `backend/app/services/strategy_backtest.py`. Use `ScreenerService().screen(...)` to find matches, `TrendService().build_series(..., days=max(holding_days + 5, 20))` for each match, calculate entry/exit return and drawdown, sort trades by return descending, and aggregate summary fields.

- [ ] **Step 5: Run the service test**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q`
Expected: PASS.

### Task 2: Backend API Route

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `strategy_backtest_service.run(...)`
- Produces: `GET /api/v1/backtests/strategy?preset=breakout-volume&horizon=swing&holding_days=5&limit=8`

- [ ] **Step 1: Write the failing API test**

```python
def test_strategy_backtest_endpoint_returns_sample_report():
    response = client.get("/api/v1/backtests/strategy?preset=breakout-volume&horizon=swing&holding_days=5")

    assert response.status_code == 200
    payload = response.json()
    assert payload["preset"] == "breakout-volume"
    assert payload["horizon"] == "swing"
    assert payload["holding_days"] == 5
    assert payload["trade_count"] >= 1
    assert {"win_rate", "average_return_pct", "max_drawdown_pct", "trades"}.issubset(payload.keys())
    assert {"symbol", "entry_price", "exit_price", "return_pct", "rule_tags"}.issubset(payload["trades"][0].keys())
```

- [ ] **Step 2: Run the API test to verify it fails**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_api.py::test_strategy_backtest_endpoint_returns_sample_report -q`
Expected: FAIL with 404.

- [ ] **Step 3: Register service and route**

Import `StrategyBacktestReport` and `StrategyBacktestService`, instantiate `strategy_backtest_service`, validate presets with the same set as `/screeners/{preset}`, build all snapshots and diagnoses, and return `strategy_backtest_service.run(...)`.

- [ ] **Step 4: Run API and backend tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py tests/test_api.py::test_strategy_backtest_endpoint_returns_sample_report -q`
Expected: PASS.

### Task 3: Frontend API, Types, And Panel

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `StrategyBacktestReport`
- Produces: `fetchStrategyBacktest(preset, horizon, holdingDays)` and `StrategyBacktestPanel`

- [ ] **Step 1: Write the failing App test**

Add a `strategyBacktest` fixture and mock `/backtests/strategy`. Assert the page shows “策略回测”, “样例交易”, “胜率”, “平均收益”, “最大回撤”, and a trade symbol/name.

- [ ] **Step 2: Run the focused frontend test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "shows strategy backtest"`
Expected: FAIL because the panel is not rendered.

- [ ] **Step 3: Add frontend types and API helper**

Add `StrategyBacktestTrade` and `StrategyBacktestReport` to `types.ts`. Add `fetchStrategyBacktest(preset, horizon, holdingDays = 5)` to `api.ts`.

- [ ] **Step 4: Add app state and load callback**

In `App.tsx`, add `strategyBacktest`, `strategyBacktestError`, and a loader that refreshes when `screenerPreset` or `horizon` changes. Pass report and error into the screener area.

- [ ] **Step 5: Add `StrategyBacktestPanel`**

In `ScreenerPanels.tsx`, render summary metrics and top trades. Use existing panel/state styles. Show local error and empty state.

- [ ] **Step 6: Run the focused frontend test**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "shows strategy backtest"`
Expected: PASS.

### Task 4: Verification And Project Notes

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

**Interfaces:**
- Consumes: completed backend and frontend implementation
- Produces: project handoff note and verified build/test status

- [ ] **Step 1: Run full frontend tests**

Run: `cd frontend; npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

Run: `cd frontend; npm run build`
Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run backend tests**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-strategy-backtest-test-state.json'; .\.venv\Scripts\python.exe -m pytest`
Expected: all backend tests pass.

- [ ] **Step 4: Update project notes**

Append a `2026-07-11 策略回测雏形第一阶段` section describing the API, panel, scope limits, docs, and verification results.
