# Strategy Backtest Parameter Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users adjust strategy backtest fee, slippage, and sample limit from the frontend and preserve those parameters in exported reports.

**Architecture:** Keep backend behavior unchanged except for one coverage test. Extend frontend API helpers to include query params, store parameter state in `App.tsx`, render numeric controls in `StrategyBacktestPanel`, and include the same state in JSON/HTML report exports.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, FastAPI, pytest.

## Global Constraints

- User-facing copy is Chinese.
- Do not add dependencies.
- Keep parameter ranges aligned with backend: fee/slippage `0..100`, limit `1..30`.
- Keep existing automatic reload behavior.
- Use TDD: failing tests before implementation.

---

### Task 1: Frontend API And UI Controls

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: `fetchStrategyBacktest(preset, horizon, holdingDays, feeBps, slippageBps, limit)`
- Produces: `fetchStrategyBacktestComparison(preset, horizon, feeBps, slippageBps, limit)`
- Produces: `StrategyBacktestPanel` props `feeBps`, `slippageBps`, `limit`, and change callbacks.

- [ ] **Step 1: Write failing frontend tests**

Assert parameter inputs exist, changing them triggers URLs containing `fee_bps=8`, `slippage_bps=12`, and `limit=6`, and exported JSON/HTML include the parameter summary.

- [ ] **Step 2: Run focused frontend tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest"`

Expected: fail because controls and export fields do not exist.

- [ ] **Step 3: Implement frontend**

Extend API helpers, add state and callbacks in `App.tsx`, pass props to `StrategyBacktestPanel`, render numeric controls, and add export payload/HTML fields.

- [ ] **Step 4: Re-run focused frontend tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest|exports"`

Expected: pass.

### Task 2: Backend Coverage Test

**Files:**
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes existing `/api/v1/backtests/strategy/periods` query params `fee_bps` and `slippage_bps`.

- [ ] **Step 1: Write backend API test**

Assert period comparison with custom costs returns period summaries and average return values.

- [ ] **Step 2: Run backend focused test**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_api.py -q`

Expected: pass once existing route support is confirmed.

### Task 3: Verification And Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Run full verification**

Run frontend full tests, frontend build, and backend full pytest with isolated state.

- [ ] **Step 2: Update project note**

Record behavior, docs, verification results, and remaining limitations.

- [ ] **Step 3: Commit and push**

Stage only substantive repo files, commit `feat: add backtest parameter controls`, and push `origin/local-codex-progress`.
