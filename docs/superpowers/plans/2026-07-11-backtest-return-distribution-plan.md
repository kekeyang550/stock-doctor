# Backtest Return Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add return distribution statistics to single-period strategy backtest reports, UI, and HTML export.

**Architecture:** Extend `StrategyBacktestReport` with derived distribution fields computed from trade returns. Render them in the existing StrategyBacktestPanel and report HTML.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Pytest, Vitest.

## Global Constraints

- Do not change recommendation ranking in this increment.
- Do not add a new statistics dependency.
- Keep frontend fields optional for old backend compatibility.
- Use TDD.

---

### Task 1: Backend Distribution Fields

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

- [x] **Step 1: Write failing test**

Assert positive/negative/flat counts, median bounds, and P25/P75 ordering.

- [x] **Step 2: Run focused backend test**

```bash
cd backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-distribution-red-state.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown
```

Expected before implementation: FAIL because fields are missing.

- [x] **Step 3: Implement schema and percentile helper**

Add report fields and compute counts/percentiles from trade returns.

- [x] **Step 4: Re-run focused backend test**

Expected after implementation: PASS.

### Task 2: Frontend Panel

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Test: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing UI test**

Assert the strategy backtest panel shows `收益分布`, `胜 1 / 负 1 / 平 0`, median, P25, and P75.

- [x] **Step 2: Render distribution card**

Add a compact card after the core backtest metrics.

- [x] **Step 3: Re-run focused frontend test**

Expected after implementation: PASS.

### Task 3: HTML Export

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing HTML test**

Assert the exported report contains `收益分布` and distribution values.

- [x] **Step 2: Render HTML section**

Add a defensive “收益分布” block in the strategy backtest section.

- [x] **Step 3: Re-run focused test**

Expected after implementation: PASS.

### Task 4: Verification and Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-distribution-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record feature scope, docs, and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: add backtest return distribution` and push `local-codex-progress`.
