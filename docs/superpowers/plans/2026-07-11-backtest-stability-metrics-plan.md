# Strategy Backtest Stability Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add strategy backtest stability metrics for volatility, consecutive losses, best gain path, and worst loss path.

**Architecture:** `StrategyBacktestService` computes metrics from chronological trades and adds scalar fields to `StrategyBacktestReport`. React treats these fields as optional for compatibility, renders them in a compact card, and exports them in the HTML report.

**Tech Stack:** FastAPI/Pydantic backend, pytest, React/TypeScript frontend, Vitest/Testing Library, Vite build.

## Global Constraints

- Use TDD: write failing tests before production edits.
- Keep the feature scoped to single-strategy backtest response, UI, and HTML export.
- Do not change screener ranking, trade sorting, period recommendation, or preset recommendation behavior.
- Use Chinese UI copy for user-visible text.
- Keep generated docs inside `docs/superpowers`.

---

### Task 1: Backend Stability Metrics

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces `StrategyBacktestReport.return_volatility_pct: float`.
- Produces `StrategyBacktestReport.max_consecutive_loss_count: int`.
- Produces `StrategyBacktestReport.best_path_gain_pct: float`.
- Produces `StrategyBacktestReport.worst_path_loss_pct: float`.
- Produces helper methods `_return_volatility(values: list[float]) -> float`, `_max_consecutive_loss_count(trades: list[StrategyBacktestTrade]) -> int`, `_best_path_gain(trades: list[StrategyBacktestTrade]) -> float`, `_worst_path_loss(trades: list[StrategyBacktestTrade]) -> float`.

- [ ] **Step 1: Write failing backend assertions**

In `test_strategy_backtest_reports_returns_and_drawdown`, add:

```python
assert report.return_volatility_pct >= 0
assert isinstance(report.max_consecutive_loss_count, int)
assert report.max_consecutive_loss_count >= 0
assert report.best_path_gain_pct >= report.best_return_pct or report.best_return_pct <= 0
assert report.worst_path_loss_pct <= report.worst_return_pct or report.worst_return_pct >= 0
```

- [ ] **Step 2: Run focused backend RED**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-stability-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown -q
```

Expected: FAIL because the new fields do not exist.

- [ ] **Step 3: Implement backend fields and helpers**

Add fields to `StrategyBacktestReport`, compute volatility from returns, and compute streak/path metrics from trades sorted by `(exit_date, symbol)`.

- [ ] **Step 4: Run focused backend GREEN**

Run the same pytest command. Expected: PASS.

### Task 2: Frontend Panel and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes optional `return_volatility_pct`, `max_consecutive_loss_count`, `best_path_gain_pct`, `worst_path_loss_pct`.
- Produces UI text `稳定性`, `收益波动`, `最长连续亏损`, `最佳连续收益`, `最差连续亏损`.
- Produces HTML section `稳定性`.

- [ ] **Step 1: Write failing frontend assertions**

Update `strategyBacktest` fixture:

```ts
return_volatility_pct: 2.75,
max_consecutive_loss_count: 1,
best_path_gain_pct: 3.4,
worst_path_loss_pct: -2.1,
```

Add strategy panel assertions:

```ts
expect(within(backtestPanel).getByText('稳定性')).toBeInTheDocument()
expect(within(backtestPanel).getByText('收益波动')).toBeInTheDocument()
expect(within(backtestPanel).getByText('最长连续亏损')).toBeInTheDocument()
expect(within(backtestPanel).getByText('最佳连续收益')).toBeInTheDocument()
expect(within(backtestPanel).getByText('最差连续亏损')).toBeInTheDocument()
```

Add HTML assertions:

```ts
expect(html).toContain('稳定性')
expect(html).toContain('收益波动')
expect(html).toContain('最长连续亏损')
expect(html).toContain('最佳连续收益')
expect(html).toContain('最差连续亏损')
```

- [ ] **Step 2: Run focused frontend RED**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: FAIL because the UI/export do not render the new metrics.

- [ ] **Step 3: Implement frontend types, UI, and export**

Add optional fields in `types.ts`, a compact card after “权益曲线”, and HTML export metrics after the equity curve section.

- [ ] **Step 4: Run focused frontend GREEN**

Run the same Vitest command. Expected: PASS.

### Task 3: Full Verification and Commit

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Produces local project note entry.
- Produces commit `feat: add backtest stability metrics`.

- [ ] **Step 1: Run backend full tests**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-stability-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

Expected: all tests pass.

- [ ] **Step 2: Run frontend full tests and build**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run
npm run build
```

Expected: tests and build pass.

- [ ] **Step 3: Browser verify**

Open `http://127.0.0.1:30080/`, verify the page is nonblank and “稳定性” appears in the strategy backtest panel without console errors.

- [ ] **Step 4: Commit and push**

```powershell
git add backend/app/schemas/diagnosis.py backend/app/services/strategy_backtest.py backend/tests/test_strategy_backtest.py frontend/src/lib/types.ts frontend/src/components/screeners/ScreenerPanels.tsx frontend/src/App.tsx frontend/src/App.test.tsx docs/superpowers/specs/2026-07-11-backtest-stability-metrics-design.md docs/superpowers/plans/2026-07-11-backtest-stability-metrics-plan.md
git commit -m "feat: add backtest stability metrics"
git push origin local-codex-progress
```
