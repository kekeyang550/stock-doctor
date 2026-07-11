# Data Trust Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing data connector area into a clearer data credibility panel using current frontend data.

**Architecture:** Keep the existing backend contracts. Add a small derived summary inside `DataConnectorPanel` and style it in `system.css`. Cover behavior through `App.test.tsx`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing FastAPI contracts.

## Global Constraints

- Do not add backend fields in this stage.
- Keep UI copy in Chinese.
- Do not commit because Git user identity is not configured.
- Use TDD: add failing frontend tests before production changes.

---

### Task 1: Data Trust Summary

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/system/SystemPanels.tsx`
- Modify: `frontend/src/styles/system.css`

**Interfaces:**
- Consumes: `DataConnectorHealth`, `DataFreshnessStatus`, `DataRefreshJob[]`
- Produces: rendered text in `.data-trust-summary`

- [ ] **Step 1: Write the failing test**

Add assertions to the existing render test:

```tsx
const trustPanel = screen.getByRole('heading', { name: '数据可信度' }).closest('section')!
expect(within(trustPanel).getByText('行情来源')).toBeInTheDocument()
expect(within(trustPanel).getByText('mock')).toBeInTheDocument()
expect(within(trustPanel).getByText('正在使用回退源')).toBeInTheDocument()
expect(within(trustPanel).getByText('缓存可用')).toBeInTheDocument()
expect(within(trustPanel).getByText('最近成功')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because the heading is still `数据连接器` and summary fields do not exist.

- [ ] **Step 3: Implement minimal component rendering**

Add derived rows in `DataConnectorPanel`:

```tsx
const activeConnector = health?.connectors.find((connector) => connector.active) ?? null
const latestJob = jobs[0] ?? null
const usingFallback = health ? health.active_provider === health.fallback_provider : false
```

Render summary cards for source, fallback, cache, last success, latest job.

- [ ] **Step 4: Add focused styles**

Add `.data-trust-summary`, `.data-trust-card`, and status modifier styles to `frontend/src/styles/system.css`.

- [ ] **Step 5: Verify**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx
```

Expected: PASS.

### Task 2: Failed Refresh Visibility

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/system/SystemPanels.tsx`

**Interfaces:**
- Consumes: `DataRefreshJob.status`
- Produces: “最近刷新失败” label when `jobs[0].status === 'failed'`

- [ ] **Step 1: Write failing test**

Add a test that overrides `/system/refresh-jobs` with a failed first job and expects:

```tsx
const trustPanel = await screen.findByRole('heading', { name: '数据可信度' }).then((node) => node.closest('section')!)
expect(within(trustPanel).getByText('最近刷新失败')).toBeInTheDocument()
expect(within(trustPanel).getByText('AKShare 请求超时，已保留上一轮缓存。')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because failed refresh is only visible inside the old refresh list, not in the summary.

- [ ] **Step 3: Implement latest job summary**

Map latest job status:

```tsx
const latestJobLabel = latestJob
  ? latestJob.status === 'success' ? '最近刷新成功' : '最近刷新失败'
  : '暂无刷新记录'
```

- [ ] **Step 4: Verify focused tests**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: PASS.

### Task 3: Full Verification and Docs

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] **Step 1: Run frontend tests**

Run: `cd frontend; npm test -- --run`

Expected: 7+ tests passed.

- [ ] **Step 2: Run frontend build**

Run: `cd frontend; npm run build`

Expected: Vite build succeeds.

- [ ] **Step 3: Run backend tests**

Run from `backend`:

```powershell
$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-data-trust-panel-test-state.json'
.\.venv\Scripts\python.exe -m pytest
```

Expected: 102 tests passed, existing upstream warning allowed.

- [ ] **Step 4: Update project notes**

Append a dated section summarizing the data credibility panel and verification results.
