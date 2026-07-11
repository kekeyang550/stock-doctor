# Strategy Backtest Period Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export strategy backtest period comparison in JSON and HTML research reports.

**Architecture:** Reuse the existing frontend `strategyBacktestComparison` state. JSON payload carries it directly; HTML renderer reads the payload defensively and renders a compact period comparison section.

**Tech Stack:** React, TypeScript, Vitest.

## Global Constraints

- Do not change backend APIs.
- Do not change backtest computation or recommendation sorting.
- Render empty fallback text when period summaries are absent.
- Keep this task scoped to report export.

---

### Task 1: Write Export Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Expects: `payload.strategy_backtest_comparison`
- Expects HTML text: `周期对比`, `周期推荐依据`

- [ ] **Step 1: Add JSON export assertions**

Assert:

```typescript
expect(exported.strategy_backtest_comparison.recommended_holding_days).toBe(10)
expect(exported.strategy_backtest_comparison.recommendation_reason).toContain('收益回撤比 1.86')
```

- [ ] **Step 2: Add HTML export assertions**

Assert:

```typescript
expect(html).toContain('周期对比')
expect(html).toContain('周期推荐依据')
expect(html).toContain('推荐 10 日，因为收益回撤比 1.86')
expect(html).toContain('10 日 · 推荐')
expect(html).toContain('交易 2 · 胜率 100%')
```

- [ ] **Step 3: Run focused export tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "exports a research report package|exports a readable HTML"
```

Expected: FAIL because export does not yet include period comparison.

### Task 2: Implement JSON and HTML Export

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `strategy_backtest_comparison` in report payload.

- [ ] **Step 1: Add payload field**

Add:

```typescript
strategy_backtest_comparison: strategyBacktestComparison,
```

and include `strategyBacktestComparison` in the `useCallback` dependency list.

- [ ] **Step 2: Read period comparison in HTML builder**

Add:

```typescript
const strategyBacktestComparison = payload.strategy_backtest_comparison ?? {}
const periodSummaries = Array.isArray(strategyBacktestComparison.periods) ? strategyBacktestComparison.periods : []
```

- [ ] **Step 3: Render period comparison section**

Render:

```typescript
<h3>周期对比</h3>
<p>${escapeHtml(strategyBacktestComparison.summary ?? "")}</p>
${strategyBacktestComparison.recommendation_reason ? `<p><strong>周期推荐依据：</strong>${escapeHtml(strategyBacktestComparison.recommendation_reason)}</p>` : ""}
```

Map `periodSummaries` to row cards with holding days, recommendation flag, trade count, win rate, average return, max drawdown, return/drawdown ratio, price source, and history count.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS.

### Task 3: Verification, Note, Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-period-export-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [ ] **Step 2: Update project note**

Record the feature, docs, and verification counts.

- [ ] **Step 3: Commit and push**

Commit `feat: export backtest period comparison` and push `local-codex-progress`.
