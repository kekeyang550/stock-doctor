# 刷新任务交互保护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为数据刷新按钮补充刷新中状态和前端交互测试，防止重复触发刷新任务，并确认完成后页面状态更新。

**Architecture:** `App.tsx` 持有当前运行中的刷新 scope，传给 `DataConnectorPanel`。系统面板根据 `refreshingScope` 禁用刷新按钮并显示“刷新中”。现有 API 不变。

**Tech Stack:** React + TypeScript + Vitest + Testing Library。

## Global Constraints

- 不新增依赖。
- 不改后端 API。
- 不改刷新任务数据结构。
- 先写失败测试，再写实现。

---

### Task 1: 刷新中状态测试和实现

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/system/SystemPanels.tsx`

**Interfaces:**
- Consumes: `runRefreshJob(scope)` existing API helper
- Produces: `DataConnectorPanel` prop `refreshingScope: 'all' | 'watchlist' | null`

- [ ] **Step 1: Write failing test**

Add a test that clicks “刷新全部”，expects the button to become disabled and show “刷新中”，then resolves the POST and confirms the new job message appears.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because the button is not disabled and no “刷新中” label exists.

- [ ] **Step 3: Implement minimal state**

Add `refreshingScope` state in `App.tsx` and set it around `runRefreshJob(scope)`.

Pass `refreshingScope` into `DataConnectorPanel` and disable both refresh buttons while non-null.

- [ ] **Step 4: Run test to verify it passes**

Run the same Vitest command. Expected: PASS.

### Task 2: Full verification and project note

**Files:**
- Modify: `项目说明.md`

- [ ] **Step 1: Run frontend tests and build**

Run: `cd frontend; npm test -- --run`

Run: `cd frontend; npm run build`

- [ ] **Step 2: Run backend tests**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-refresh-interaction.json'; .\.venv\Scripts\python.exe -m pytest`

- [ ] **Step 3: Browser check**

Open `http://127.0.0.1:30080/` and confirm the data connector panel still renders.

- [ ] **Step 4: Update project note**

Record the refresh interaction protection and verification results in `项目说明.md`.
