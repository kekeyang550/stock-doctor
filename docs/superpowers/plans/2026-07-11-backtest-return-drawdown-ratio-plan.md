# Strategy Backtest Return Drawdown Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add return/drawdown ratio to strategy backtest reports, comparisons, UI, and exports.

**Architecture:** Compute the ratio once in `StrategyBacktestService.run()` and propagate it through existing period and preset summary objects. Frontend treats the value as a backend-owned metric and only formats it.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest.

## Global Constraints

- Formula is `average_return_pct / abs(max_drawdown_pct)`.
- Return `0` when max drawdown is `0`.
- Round to two decimals.
- Do not introduce volatility, Sharpe ratio, or benchmark-dependent metrics in this task.

---

### Task 1: Backend Contract and Service

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces: `return_drawdown_ratio: float` on report, period summary, and preset summary.

- [ ] **Step 1: Write failing tests**

Add assertions:

```python
assert report.return_drawdown_ratio == round(report.average_return_pct / abs(report.max_drawdown_pct), 2)
assert all(hasattr(period, "return_drawdown_ratio") for period in comparison.periods)
assert all(hasattr(item, "return_drawdown_ratio") for item in comparison.presets)
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q
```

Expected: FAIL because schema/service do not expose the new field.

- [ ] **Step 3: Implement field and helper**

Add `_return_drawdown_ratio(average_return_pct, max_drawdown_pct)` and use it in `run()`, `compare_periods()`, and `compare_presets()`.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS.

### Task 2: Backend API Coverage

**Files:**
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Verifies API JSON includes `return_drawdown_ratio`.

- [ ] **Step 1: Add API assertions**

Assert `/backtests/strategy`, `/backtests/strategy/periods`, and `/backtests/strategy/presets` include the field.

- [ ] **Step 2: Run focused API tests**

Run:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -q
```

Expected: PASS after Task 1.

### Task 3: Frontend Types, UI, and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`

**Interfaces:**
- Consumes backend `return_drawdown_ratio`.
- Produces visible “收益回撤比” in main metrics, period cards, preset cards, and HTML export.

- [ ] **Step 1: Write failing frontend assertions**

Add mock fields and assert the panel and HTML export contain “收益回撤比”.

- [ ] **Step 2: Run App test**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "收益回撤比"
```

Expected: FAIL until UI renders the field.

- [ ] **Step 3: Implement frontend display**

Add type fields and render `return_drawdown_ratio.toFixed(2)`.

- [ ] **Step 4: Re-run App test**

Expected: PASS.

### Task 4: Verification, Note, Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-return-drawdown-ratio-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [ ] **Step 2: Update project note**

Record the feature and verification counts.

- [ ] **Step 3: Commit and push**

Commit `feat: add backtest return drawdown ratio` and push `local-codex-progress`.
