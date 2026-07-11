# Strategy Backtest Stability Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a readable stability score, label, and explanation notes to strategy backtests.

**Architecture:** The backend computes the assessment from existing stability metrics inside `StrategyBacktestService.run()`. The frontend treats the new fields as optional and renders them in the existing “稳定性” card and HTML report.

**Tech Stack:** FastAPI/Pydantic backend, pytest, React/TypeScript frontend, Vitest/Testing Library, Vite build.

## Global Constraints

- Use TDD: write failing tests before production edits.
- Keep the feature scoped to single-strategy backtest response, UI, and HTML export.
- Do not change screener ranking, trade sorting, period recommendation, or preset recommendation behavior.
- Use Chinese UI copy for user-visible text.
- Keep generated docs inside `docs/superpowers`.

---

### Task 1: Backend Assessment Fields

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces `StrategyBacktestReport.stability_score: int`.
- Produces `StrategyBacktestReport.stability_label: str`.
- Produces `StrategyBacktestReport.stability_notes: list[str]`.
- Produces helper `_stability_score(return_volatility_pct: float, max_consecutive_loss_count: int, worst_path_loss_pct: float, average_return_pct: float) -> int`.
- Produces helper `_stability_label(score: int) -> str`.
- Produces helper `_stability_notes(...) -> list[str]`.

- [ ] **Step 1: Write failing backend assertions**

Add to `test_strategy_backtest_reports_returns_and_drawdown`:

```python
assert 0 <= report.stability_score <= 100
assert report.stability_label in {"稳定", "需观察", "波动偏高"}
assert report.stability_notes
assert any("收益" in note or "亏损" in note or "波动" in note for note in report.stability_notes)
```

- [ ] **Step 2: Run focused backend RED**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-stability-assessment-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown -q
```

Expected: FAIL because the assessment fields do not exist.

- [ ] **Step 3: Implement backend fields and helpers**

Add fields to `StrategyBacktestReport`; compute the stability metrics once in `run()`, then compute the score, label, and notes from them.

- [ ] **Step 4: Run focused backend GREEN**

Run the same pytest command. Expected: PASS.

### Task 2: Frontend Panel and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes optional `stability_score`, `stability_label`, `stability_notes`.
- Produces UI text `稳定评分`, `稳定等级`, `稳定性说明`.
- Produces HTML report text `稳定评分`, `稳定等级`, `稳定性说明`.

- [ ] **Step 1: Write failing frontend assertions**

Update `strategyBacktest` fixture:

```ts
stability_score: 78,
stability_label: '稳定',
stability_notes: ['收益波动较低，样例路径较平滑。', '最长连续亏损 1 笔，回撤压力可控。'],
```

Add panel assertions:

```ts
expect(within(backtestPanel).getByText('稳定评分')).toBeInTheDocument()
expect(within(backtestPanel).getByText('稳定等级')).toBeInTheDocument()
expect(within(backtestPanel).getByText('稳定性说明')).toBeInTheDocument()
expect(within(backtestPanel).getByText('78')).toBeInTheDocument()
```

Add HTML assertions:

```ts
expect(html).toContain('稳定评分')
expect(html).toContain('稳定等级')
expect(html).toContain('稳定性说明')
expect(html).toContain('收益波动较低')
```

- [ ] **Step 2: Run focused frontend RED**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: FAIL because the UI/export do not render the new assessment fields.

- [ ] **Step 3: Implement frontend types, UI, and export**

Add optional fields in `types.ts`, extend the existing stability card, and add HTML report metrics and notes under the stability section.

- [ ] **Step 4: Run focused frontend GREEN**

Run the same Vitest command. Expected: PASS.

### Task 3: Full Verification and Commit

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Produces local project note entry.
- Produces commit `feat: add backtest stability assessment`.

- [ ] **Step 1: Run backend full tests**

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-stability-assessment-test-state.json"; .\.venv\Scripts\python.exe -m pytest
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

Open `http://127.0.0.1:30080/`, verify the page is nonblank and “稳定评分” appears in the strategy backtest panel without console errors.

- [ ] **Step 4: Commit and push**

```powershell
git add backend/app/schemas/diagnosis.py backend/app/services/strategy_backtest.py backend/tests/test_strategy_backtest.py frontend/src/lib/types.ts frontend/src/components/screeners/ScreenerPanels.tsx frontend/src/App.tsx frontend/src/App.test.tsx docs/superpowers/specs/2026-07-11-backtest-stability-assessment-design.md docs/superpowers/plans/2026-07-11-backtest-stability-assessment-plan.md
git commit -m "feat: add backtest stability assessment"
git push origin local-codex-progress
```
