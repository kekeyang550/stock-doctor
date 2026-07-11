# Strategy Backtest Cost And Trade Lineage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make strategy backtest returns more realistic by adding explicit cost assumptions and trade-level data lineage.

**Architecture:** Extend existing Pydantic schemas and `StrategyBacktestService` without changing screener rules. Keep `return_pct` as net return, add `gross_return_pct` and `cost_pct`, pass API query parameters through routes, then render the same fields in React and HTML export.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest, Testing Library.

## Global Constraints

- User-facing copy is Chinese.
- Do not introduce new runtime dependencies.
- Keep defaults conservative: `fee_bps=5`, `slippage_bps=10`.
- Keep existing `return_pct` field for compatibility, but make it net return.
- Follow TDD: failing tests first, then implementation.

---

### Task 1: Backend Cost And Trade Lineage

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_strategy_backtest.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `StrategyBacktestReport.fee_bps: float`
- Produces: `StrategyBacktestReport.slippage_bps: float`
- Produces: `StrategyBacktestReport.round_trip_cost_pct: float`
- Produces: `StrategyBacktestTrade.gross_return_pct: float`
- Produces: `StrategyBacktestTrade.cost_pct: float`
- Produces: `StrategyBacktestTrade.price_source: "historical-kline" | "synthetic-trend"`
- Produces: `StrategyBacktestTrade.history_bar_count: int`
- Produces: `StrategyBacktestTrade.history_last_date: str | None`
- Produces: `StrategyBacktestTrade.fallback_reason: str | None`

- [ ] **Step 1: Write failing backend tests**

Add assertions in `test_strategy_backtest.py` that report cost fields exist and trade net return equals gross return minus cost. Add API assertions in `test_api.py` for `fee_bps=5&slippage_bps=10`.

- [ ] **Step 2: Run backend focused tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py tests/test_api.py -q`

Expected: fail on missing fields and route parameters.

- [ ] **Step 3: Implement backend**

Add schema fields, route query parameters, service parameters, cost calculation, and trade-level lineage propagation.

- [ ] **Step 4: Re-run backend focused tests**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py tests/test_api.py -q`

Expected: pass.

### Task 2: Frontend Cost Display And Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes the backend fields from Task 1.

- [ ] **Step 1: Write failing frontend tests**

Add fixture fields, then assert the panel shows cost assumptions and trade lines show net/gross/cost copy. Assert HTML export contains cost assumptions.

- [ ] **Step 2: Run focused frontend tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest summary|HTML research report"`

Expected: fail because the UI and export do not render cost fields yet.

- [ ] **Step 3: Implement frontend**

Extend types, render cost metrics in the strategy backtest panel, add trade-level cost/source details, and add HTML report metrics.

- [ ] **Step 4: Re-run focused frontend tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest summary|HTML research report"`

Expected: pass.

### Task 3: Verification And Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Run full verification**

Run frontend full tests, frontend build, and backend full pytest with an isolated `STOCK_DOCTOR_STATE_PATH`.

- [ ] **Step 2: Update project note**

Record behavior, documents, verification results, and remaining limitations.

- [ ] **Step 3: Commit and push**

Stage only substantive diff files, commit `feat: add backtest cost assumptions`, and push `origin/local-codex-progress`.
