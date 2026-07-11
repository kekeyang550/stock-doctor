# Strategy Backtest Recommendation Reason Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add human-readable recommendation reasons to strategy backtest period and preset comparisons.

**Architecture:** Backend owns the recommendation explanation because it also owns the recommendation sort order. Frontend treats `recommendation_reason` as display text and only hides it when absent.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest.

## Global Constraints

- Do not change existing recommendation sorting.
- Do not introduce new numeric indicators.
- Recommendation reason must mention the current sample metrics and avoid investment promises.
- Render the reason only when the API returns a non-empty value.

---

### Task 1: Backend Contract and Service

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Produces: `StrategyBacktestComparison.recommendation_reason: str | None`
- Produces: `StrategyBacktestPresetComparison.recommendation_reason: str | None`

- [ ] **Step 1: Write failing service assertions**

Add assertions in the existing comparison tests:

```python
assert comparison.recommendation_reason
assert "收益回撤比" in comparison.recommendation_reason
```

- [ ] **Step 2: Run focused service tests**

Run:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q
```

Expected: FAIL because the comparison schemas do not yet expose `recommendation_reason`.

- [ ] **Step 3: Add schema fields**

Add:

```python
recommendation_reason: str | None = None
```

to `StrategyBacktestComparison` and `StrategyBacktestPresetComparison`.

- [ ] **Step 4: Add service helpers**

Add:

```python
def _period_recommendation_reason(self, recommended: StrategyBacktestPeriodSummary | None) -> str | None:
    if recommended is None:
        return None
    return (
        f"推荐 {recommended.holding_days} 日，因为收益回撤比 {recommended.return_drawdown_ratio:.2f}，"
        f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%，"
        f"胜率 {recommended.win_rate:.1f}%。"
    )

def _preset_recommendation_reason(self, recommended: StrategyBacktestPresetSummary | None) -> str | None:
    if recommended is None:
        return None
    return (
        f"推荐 {recommended.label}，因为收益回撤比 {recommended.return_drawdown_ratio:.2f}，"
        f"平均收益 {recommended.average_return_pct:.2f}%，最大回撤 {recommended.max_drawdown_pct:.2f}%，"
        f"胜率 {recommended.win_rate:.1f}%，交易 {recommended.trade_count} 笔。"
    )
```

- [ ] **Step 5: Populate response fields**

Pass the helper output into `StrategyBacktestComparison(...)` and `StrategyBacktestPresetComparison(...)`.

- [ ] **Step 6: Re-run focused service tests**

Expected: PASS.

### Task 2: Backend API Coverage

**Files:**
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Verifies API JSON includes `recommendation_reason`.

- [ ] **Step 1: Add API assertions**

In the period and preset endpoint tests, assert:

```python
assert "收益回撤比" in payload["recommendation_reason"]
```

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
- Consumes: `comparison.recommendation_reason`
- Consumes: `presetComparison.recommendation_reason`

- [ ] **Step 1: Write failing frontend assertions**

Add mock fields and assert the strategy backtest panel renders:

```typescript
expect(within(backtestPanel).getAllByText('推荐依据').length).toBeGreaterThan(0)
expect(within(backtestPanel).getByText(/收益回撤比/)).toBeInTheDocument()
```

For HTML export, assert the exported HTML includes the preset recommendation reason.

- [ ] **Step 2: Run focused frontend tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "推荐依据|exports a readable HTML"
```

Expected: FAIL until UI renders the field.

- [ ] **Step 3: Add type fields**

Add `recommendation_reason: string | null` to both comparison types.

- [ ] **Step 4: Render reasons**

In both comparison headers, render:

```tsx
{comparison.recommendation_reason ? (
  <small className="backtest-recommendation-reason">
    <b>推荐依据</b>{comparison.recommendation_reason}
  </small>
) : null}
```

- [ ] **Step 5: Include the preset reason in HTML export**

Add a paragraph in the strategy backtest section:

```typescript
<p><strong>策略推荐依据：</strong>${escapeHtml(strategyPresetComparison.recommendation_reason ?? "")}</p>
```

- [ ] **Step 6: Re-run focused frontend tests**

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
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-recommendation-reason-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [ ] **Step 2: Update project note**

Record the feature, docs, and verification counts.

- [ ] **Step 3: Commit and push**

Commit `feat: explain backtest recommendations` and push `local-codex-progress`.
