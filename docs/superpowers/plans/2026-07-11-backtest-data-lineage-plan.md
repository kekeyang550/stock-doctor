# Strategy Backtest Data Lineage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visible data lineage metadata to strategy backtests so users can inspect historical K-line usage and fallback reasons.

**Architecture:** Keep the existing backtest algorithm intact. Extend schema fields, return lineage from `_price_series()`, aggregate lineage at report/period level, and render the same metadata in the frontend panel and HTML export.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not change the current strategy matching rules or return calculations.
- Keep report fields backward compatible by adding optional/defaulted fields.
- Use Chinese user-facing copy.
- Follow existing component and CSS patterns.
- Write failing tests before production code.

---

### Task 1: Backend Lineage Schema And Service

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `StrategyBacktestReport.history_bar_count: int`
- Produces: `StrategyBacktestReport.history_last_date: str | None`
- Produces: `StrategyBacktestReport.fallback_reason: str | None`
- Produces: same three fields on `StrategyBacktestPeriodSummary`

- [ ] **Step 1: Write failing backend tests**

Add assertions that historical backtests include bar count and last date, while failing providers return fallback reason.

- [ ] **Step 2: Run focused backend tests and confirm failure**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py tests/test_api.py -q`

Expected: fail because fields do not exist.

- [ ] **Step 3: Implement schema and service metadata**

Add the three fields to Pydantic models. Return price series metadata from `_price_series()`, aggregate it in `run()`, and pass through `compare_periods()`.

- [ ] **Step 4: Run focused backend tests and confirm pass**

Run: `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py tests/test_api.py -q`

Expected: pass.

### Task 2: Frontend Panel And Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `StrategyBacktestReport.history_bar_count`, `history_last_date`, `fallback_reason`
- Consumes: same fields on period summaries

- [ ] **Step 1: Write failing frontend tests**

Assert the strategy backtest panel shows “历史样本”, a last date, and fallback-safe source text. Assert HTML export includes the backtest data lineage summary.

- [ ] **Step 2: Run focused frontend tests and confirm failure**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest"`

Expected: fail because the new text is not rendered.

- [ ] **Step 3: Implement types, UI, CSS, and HTML export copy**

Extend TypeScript types, expand the source badge into a lineage card, add compact CSS, and include lineage fields in `buildResearchReportHtml()`.

- [ ] **Step 4: Run focused frontend tests and confirm pass**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "strategy backtest|HTML research report"`

Expected: pass.

### Task 3: Full Verification And Documentation

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

**Interfaces:**
- Produces: project note section `2026-07-11 策略回测数据血统增强`

- [ ] **Step 1: Run full verification**

Run backend full pytest with a temp state path, frontend full Vitest, and frontend build.

- [ ] **Step 2: Update project note**

Record changed behavior, verification results, and remaining limitations.

- [ ] **Step 3: Commit and push**

Stage only files with substantive diff, commit as `feat: add backtest data lineage`, and push `local-codex-progress`.
