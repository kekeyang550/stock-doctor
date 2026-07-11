# Strategy Backtest Parameter Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist strategy backtest parameters in browser localStorage so refreshes keep the user's research assumptions.

**Architecture:** Keep persistence entirely in `frontend/src/App.tsx`. Add small parser/writer helpers near existing report helpers, initialize backtest state from a lazy storage read, and write normalized values whenever parameters change.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, browser `localStorage`.

## Global Constraints

- Do not add backend endpoints.
- Store under `stock-doctor-backtest-parameters-v1`.
- Persist `holding_days`, `fee_bps`, `slippage_bps`, and `limit`.
- Clamp invalid numeric values to the same UI-safe ranges used by the controls.
- Corrupt storage must fall back silently to defaults.

---

### Task 1: App-Level Persistence Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: existing `<App />`, mocked `fetch`, jsdom `localStorage`.
- Produces: failing tests that describe storage read/write/fallback behavior.

- [ ] **Step 1: Write failing tests**

Add tests near the existing strategy backtest parameter tests:

```tsx
it('uses saved strategy backtest parameters on first load', async () => {
  window.localStorage.setItem('stock-doctor-backtest-parameters-v1', JSON.stringify({
    holding_days: 10,
    fee_bps: 8,
    slippage_bps: 12,
    limit: 6,
  }))

  render(<App />)

  const backtestPanel = await waitFor(() => {
    const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
    expect(panel).not.toBeNull()
    return panel as HTMLElement
  })

  expect(within(backtestPanel).getByLabelText('回测手续费 bps')).toHaveValue(8)
  expect(within(backtestPanel).getByLabelText('回测滑点 bps')).toHaveValue(12)
  expect(within(backtestPanel).getByLabelText('回测样本数量')).toHaveValue(6)

  await waitFor(() => {
    const backtestCalls = vi.mocked(fetch).mock.calls.map((call) => String(call[0])).filter((url) => url.includes('/backtests/strategy'))
    expect(backtestCalls.some((url) => url.includes('holding_days=10'))).toBe(true)
    expect(backtestCalls.some((url) => url.includes('fee_bps=8'))).toBe(true)
    expect(backtestCalls.some((url) => url.includes('slippage_bps=12'))).toBe(true)
    expect(backtestCalls.some((url) => url.includes('limit=6'))).toBe(true)
  })
})
```

- [ ] **Step 2: Verify red**

Run:

```bash
npm test -- --run frontend/src/App.test.tsx -t "uses saved strategy backtest parameters"
```

Expected: FAIL because `App.tsx` still initializes parameters from hardcoded defaults.

### Task 2: Storage Helpers and State Initialization

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: browser `window.localStorage`.
- Produces: `readStoredBacktestParameters` and `writeStoredBacktestParameters` helpers.

- [ ] **Step 1: Implement helper constants and parser**

Create a storage key, defaults, a numeric clamp helper, and safe read/write functions. Use lazy `useState(() => readStoredBacktestParameters().fee_bps)` style initialization for all four states.

- [ ] **Step 2: Persist on changes**

Add a `useEffect` that writes `{ holding_days, fee_bps, slippage_bps, limit }` whenever one of those states changes.

- [ ] **Step 3: Verify green**

Run the focused test again:

```bash
npm test -- --run frontend/src/App.test.tsx -t "uses saved strategy backtest parameters"
```

Expected: PASS.

### Task 3: Write-Back and Corrupt Cache Coverage

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: implemented storage helpers through user interactions.
- Produces: coverage for update persistence and invalid storage fallback.

- [ ] **Step 1: Add write-back test**

Change fee, slippage, sample limit, and holding period, then assert `localStorage` stores normalized snake_case values.

- [ ] **Step 2: Add corrupt-cache fallback test**

Store invalid JSON before rendering. Assert the default input values are visible and the default request parameters are used.

- [ ] **Step 3: Verify full App tests**

Run:

```bash
npm test -- --run frontend/src/App.test.tsx
```

Expected: PASS.

### Task 4: Documentation and Verification

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

**Interfaces:**
- Consumes: completed implementation and tests.
- Produces: project note entry for the persistence enhancement.

- [ ] **Step 1: Update project note**

Add a dated entry explaining that strategy backtest parameters now persist locally.

- [ ] **Step 2: Run verification**

Run:

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-parameter-persistence-test-state.json"; python -m pytest
```

Expected: frontend tests pass, frontend build exits 0, backend tests pass.

- [ ] **Step 3: Commit and push**

Stage only actual diff files, commit with `feat: persist backtest parameters`, then push `local-codex-progress`.
