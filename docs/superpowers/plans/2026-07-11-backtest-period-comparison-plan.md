# 策略回测多周期对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加策略回测多周期摘要，让用户在一个面板里比较 `3 / 5 / 10 / 20` 日持有周期。

**Architecture:** 后端在 `StrategyBacktestService` 中新增批量比较方法，内部复用现有单周期 `run()`。前端新增 comparison 类型、API client、App 状态和 `StrategyBacktestPanel` 展示区。

**Tech Stack:** FastAPI、Pydantic、pytest、React、TypeScript、Vitest、Testing Library。

## Global Constraints

- 不引入新依赖。
- 不改变现有 `/api/v1/backtests/strategy` 单周期接口行为。
- `periods` 仅接受 1-20 的整数；无有效值时回退 `3,5,10,20`。
- 对比摘要失败不能影响单周期策略回测、策略股票池或页面基础加载。
- 所有新增说明文档使用中文。

---

### Task 1: 后端多周期摘要

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_strategy_backtest.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `StrategyBacktestPeriodSummary` and `StrategyBacktestComparison`.
- Produces: `StrategyBacktestService.compare_periods(preset, horizon, snapshots, diagnoses, periods, limit) -> StrategyBacktestComparison`.
- Produces: `GET /api/v1/backtests/strategy/periods`.

- [ ] **Step 1: Write failing service test**

Add a test asserting `compare_periods()` returns summaries for `3,5,10,20`, picks a recommended period from those values, and includes non-empty summary text.

- [ ] **Step 2: Run service test to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q`

Expected: failure because `compare_periods` or schema does not exist.

- [ ] **Step 3: Implement schemas and service**

Add the two Pydantic classes. Implement period normalization, reuse `run()`, create summaries, and choose recommendation by `(average_return_pct, max_drawdown_pct, win_rate, -holding_days)`.

- [ ] **Step 4: Run service test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q`

Expected: pass.

- [ ] **Step 5: Write failing API test**

Add an API test for `/api/v1/backtests/strategy/periods?preset=breakout-volume&horizon=swing&periods=3,5,10,20`.

- [ ] **Step 6: Run API test to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_api.py -q`

Expected: failure because route does not exist.

- [ ] **Step 7: Implement route**

Import `StrategyBacktestComparison`, add a parser for `periods`, validate preset, build snapshots/diagnoses, call `compare_periods()`.

- [ ] **Step 8: Run backend tests**

Run: `.\.venv\Scripts\python.exe -m pytest`

Expected: all backend tests pass.

### Task 2: 前端周期对比展示

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/backtests/strategy/periods`.
- Produces: `fetchStrategyBacktestComparison(preset, horizon)`.
- Produces: `StrategyBacktestPanel` props `comparison` and `comparisonError`.

- [ ] **Step 1: Write failing frontend test**

Add a Vitest case that renders the app, waits for `.strategy-backtest-panel`, and asserts “周期对比”, “3日”, “20日”, “推荐”, “平均收益”, and “最大回撤” are visible.

- [ ] **Step 2: Run frontend test to verify it fails**

Run: `npm test -- --run src/App.test.tsx -t "period comparison"`

Expected: failure because no comparison UI/API exists.

- [ ] **Step 3: Implement types and API client**

Add `StrategyBacktestPeriodSummary`, `StrategyBacktestComparison`, and `fetchStrategyBacktestComparison()`.

- [ ] **Step 4: Implement App loading state**

Add `strategyBacktestComparison` and `strategyBacktestComparisonError`. In `loadStrategyBacktest`, fetch both single report and comparison; if comparison fails after report succeeds, preserve report and store comparison error.

- [ ] **Step 5: Implement panel UI and CSS**

Add a compact comparison section below the selected-period note or metrics. Mark the recommended period and render a local warning when comparison fails.

- [ ] **Step 6: Run frontend focused test**

Run: `npm test -- --run src/App.test.tsx -t "period comparison"`

Expected: pass.

- [ ] **Step 7: Run full frontend checks**

Run: `npm test -- --run` and `npm run build`.

Expected: all tests and build pass.

### Task 3: Documentation and final verification

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Update project notes**

Append a section “2026-07-11 策略回测多周期对比”.

- [ ] **Step 2: Run final verification**

Run backend tests, frontend tests, and frontend build fresh.

- [ ] **Step 3: Final report**

Summarize changed files, verification results, and remaining next steps.
