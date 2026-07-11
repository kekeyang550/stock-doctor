# Strategy Backtest Preset Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-strategy backtest comparison so users can compare presets under the same cost, holding-period, and sample assumptions.

**Architecture:** Extend the existing backend strategy backtest schema/service/API with preset summaries built from `StrategyBacktestService.run()`. Extend frontend API/types/App state and render a compact comparison block inside `StrategyBacktestPanel`; include the payload in JSON/HTML report export.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest, React Testing Library.

## Global Constraints

- Reuse existing single-strategy backtest calculations; do not fork return/drawdown logic.
- Default compared presets are `strong,value,capital-risk`.
- Existing `/backtests/strategy` and `/backtests/strategy/periods` behavior must remain unchanged.
- Multi-strategy comparison failure must not hide the single strategy report.
- Reports must include the comparison data when available.

---

### Task 1: Backend Preset Comparison Contract

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces: `StrategyBacktestPresetSummary` and `StrategyBacktestPresetComparison`.
- Produces: `StrategyBacktestService.compare_presets(...) -> StrategyBacktestPresetComparison`.

- [ ] **Step 1: Write the failing service test**

Add a test that calls `compare_presets(presets=["strong", "value", "capital-risk"], holding_days=5, fee_bps=8, slippage_bps=12, limit=6)` and asserts summaries, recommendation, and cost-aware metrics.

- [ ] **Step 2: Run the focused backend test**

Run:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_compares_multiple_presets -q
```

Expected: FAIL because `compare_presets` does not exist.

- [ ] **Step 3: Implement schemas and service method**

Create summary fields: `preset`, `label`, `holding_days`, `price_source`, `history_bar_count`, `history_last_date`, `fallback_reason`, `match_count`, `trade_count`, `win_rate`, `average_return_pct`, `max_drawdown_pct`.

- [ ] **Step 4: Re-run focused backend test**

Expected: PASS.

### Task 2: Backend API Endpoint

**Files:**
- Modify: `backend/app/api/routes.py`
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `GET /api/v1/backtests/strategy/presets`.

- [ ] **Step 1: Write failing API test**

Assert the endpoint returns `presets`, `recommended_preset`, and honors `holding_days=10&fee_bps=8&slippage_bps=12&limit=6`.

- [ ] **Step 2: Run focused API test**

Expected: FAIL with 404 or missing route.

- [ ] **Step 3: Implement route and preset parser**

Validate every preset against `SCREENER_PRESETS`. Use `_all_snapshots()` and existing diagnosis generation, then call `compare_presets()`.

- [ ] **Step 4: Re-run focused API test**

Expected: PASS.

### Task 3: Frontend Fetch, State, Panel, and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: `fetchStrategyBacktestPresetComparison(horizon, holdingDays, feeBps, slippageBps, limit)`.
- Produces: `StrategyBacktestPanel` props `presetComparison`, `presetComparisonError`, `currentPreset`.

- [ ] **Step 1: Write failing frontend tests**

Add tests for the API URL, rendered “策略对比”, recommendation label, and report export payload.

- [ ] **Step 2: Run focused frontend tests**

Expected: FAIL because frontend does not call or render preset comparison.

- [ ] **Step 3: Implement types/API/state/UI/export**

Fetch preset comparison with the same current parameters used by single backtest. Render cards after period comparison. Add JSON and HTML report fields.

- [ ] **Step 4: Re-run focused frontend tests**

Expected: PASS.

### Task 4: Verification, Notes, Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

**Interfaces:**
- Produces: project note entry and pushed commit.

- [ ] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-preset-comparison-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [ ] **Step 2: Update project note**

Record files, behavior, verification counts, and commit hash.

- [ ] **Step 3: Commit and push**

Stage only real diff files, commit `feat: compare strategy backtest presets`, and push `local-codex-progress`.
