# Strategy Backtest Equity Curve Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an equity/drawdown path to strategy backtests and surface it in the app and exported HTML reports.

**Architecture:** The backend owns the deterministic curve calculation and returns `equity_curve` as part of `StrategyBacktestReport`. The frontend treats the field as optional for old responses, renders a compact card in `StrategyBacktestPanel`, and exports the same data in `buildResearchReportHtml`.

**Tech Stack:** FastAPI/Pydantic backend, pytest, React/TypeScript frontend, Vitest/Testing Library, Vite build.

## Global Constraints

- Use TDD: write failing tests before production edits.
- Keep the feature scoped to single-strategy backtest response, UI, and HTML export.
- Do not change screener ranking, trade sorting, period recommendation, or preset recommendation behavior.
- Use Chinese UI copy for user-visible text.
- Keep generated docs inside `docs/superpowers`.

---

### Task 1: Backend Equity Curve

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces: `StrategyBacktestCurvePoint` with `step`, `label`, `equity_pct`, `drawdown_pct`, `trade_return_pct`, `symbol`, `name`.
- Produces: `StrategyBacktestReport.equity_curve: list[StrategyBacktestCurvePoint]`.
- Produces: `StrategyBacktestService._equity_curve(trades: list[StrategyBacktestTrade]) -> list[StrategyBacktestCurvePoint]`.

- [ ] **Step 1: Write the failing backend test**

Add assertions to `test_strategy_backtest_reports_returns_and_drawdown`:

```python
assert report.equity_curve
assert report.equity_curve[0].step == 0
assert report.equity_curve[0].label == "起点"
assert report.equity_curve[0].equity_pct == 0
assert report.equity_curve[0].drawdown_pct == 0
assert report.equity_curve[-1].equity_pct == round(sum(trade.return_pct for trade in report.trades), 2)
assert all(point.drawdown_pct <= 0 for point in report.equity_curve)
assert any(point.symbol and point.name for point in report.equity_curve[1:])
```

- [ ] **Step 2: Run the backend test to verify RED**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-equity-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown -q
```

Expected: FAIL because `StrategyBacktestReport` has no `equity_curve`.

- [ ] **Step 3: Implement backend schema and service**

Add the Pydantic model and populate `equity_curve=self._equity_curve(trades)` in `StrategyBacktestReport`. Implement `_equity_curve()` using trades sorted by `(exit_date, symbol)`, with a fixed start point and rounded cumulative values.

- [ ] **Step 4: Run backend focused test to verify GREEN**

Run the same pytest command. Expected: PASS.

### Task 2: Frontend Panel and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `StrategyBacktestReport.equity_curve?: StrategyBacktestCurvePoint[]`.
- Produces UI text: `权益曲线`, `累计收益`, `路径最大回撤`.
- Produces HTML report section title: `权益曲线`.

- [ ] **Step 1: Write failing frontend tests**

Update the `strategyBacktest` fixture with:

```ts
equity_curve: [
  { step: 0, label: '起点', equity_pct: 0, drawdown_pct: 0, trade_return_pct: 0, symbol: null, name: null },
  { step: 1, label: '贵州茅台', equity_pct: 3.4, drawdown_pct: 0, trade_return_pct: 3.4, symbol: '600519', name: '贵州茅台' },
  { step: 2, label: '宁德时代', equity_pct: 1.3, drawdown_pct: -2.1, trade_return_pct: -2.1, symbol: '300750', name: '宁德时代' },
]
```

In the strategy panel test assert:

```ts
expect(within(backtestPanel).getByText('权益曲线')).toBeInTheDocument()
expect(within(backtestPanel).getByText('累计收益')).toBeInTheDocument()
expect(within(backtestPanel).getByText('路径最大回撤')).toBeInTheDocument()
expect(within(backtestPanel).getByText(/贵州茅台/)).toBeInTheDocument()
```

In the HTML export test assert:

```ts
expect(html).toContain('权益曲线')
expect(html).toContain('路径最大回撤')
expect(html).toContain('贵州茅台')
```

- [ ] **Step 2: Run frontend focused tests to verify RED**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: FAIL because the UI/export do not render the new section.

- [ ] **Step 3: Implement types, UI, and export**

Add `StrategyBacktestCurvePoint`, optional `equity_curve`, a compact card in `StrategyBacktestPanel`, and the HTML report subsection in `buildResearchReportHtml`.

- [ ] **Step 4: Run frontend focused tests to verify GREEN**

Run the same Vitest command. Expected: PASS.

### Task 3: Full Verification and Commit

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Produces local documentation entry for this feature.
- Produces commit `feat: add backtest equity curve`.

- [ ] **Step 1: Run full backend tests**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-equity-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

Expected: all tests pass.

- [ ] **Step 2: Run full frontend tests and build**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run
npm run build
```

Expected: all tests pass and build exits 0.

- [ ] **Step 3: Browser verify**

Open `http://127.0.0.1:30080/` and confirm the page is nonblank and the strategy panel can render without console errors.

- [ ] **Step 4: Update project notes, commit, and push**

Update `项目说明.md`, then run:

```powershell
git add backend/app/schemas/diagnosis.py backend/app/services/strategy_backtest.py backend/tests/test_strategy_backtest.py frontend/src/lib/types.ts frontend/src/components/screeners/ScreenerPanels.tsx frontend/src/App.tsx frontend/src/App.test.tsx docs/superpowers/specs/2026-07-11-backtest-equity-curve-design.md docs/superpowers/plans/2026-07-11-backtest-equity-curve-plan.md C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md
git commit -m "feat: add backtest equity curve"
git push origin local-codex-progress
```
