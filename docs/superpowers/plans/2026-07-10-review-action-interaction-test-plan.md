# 复盘行动状态交互保护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为复盘行动状态更新补充行级更新中状态和前端交互测试，避免用户重复点击同一行动状态。

**Architecture:** `App.tsx` 持有 `updatingReviewActionId`，传给 `DiagnosisWorkspace` 和内部复盘行动行。正在更新的行动行禁用状态按钮并显示“更新中”。现有 PATCH API 不变。

**Tech Stack:** React + TypeScript + Vitest + Testing Library。

## Global Constraints

- 不新增依赖。
- 不改后端 API。
- 不改复盘行动 schema。
- 先写失败测试，再写实现。

---

### Task 1: 复盘行动更新中状态测试和实现

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/diagnosis/DiagnosisPanels.tsx`

**Interfaces:**
- Consumes: `updateReviewActionStatus(symbol, horizon, actionId, status)`
- Produces: `DiagnosisWorkspace` prop `updatingReviewActionId: string | null`

- [ ] **Step 1: Write failing test**

Add a test that clicks the first review action's “完成” button, expects the row controls to become disabled and show “更新中”，then resolves PATCH and confirms the row becomes “完成”.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because review action rows have no updating state yet.

- [ ] **Step 3: Implement minimal state**

Add `updatingReviewActionId` state in `App.tsx`, set it around `updateReviewActionStatus(...)`, and pass it into `DiagnosisWorkspace`.

Inside `ReviewActionRow`, disable buttons when `item.id === updatingActionId` and render `更新中`.

- [ ] **Step 4: Run test to verify it passes**

Run the same Vitest command. Expected: PASS.

### Task 2: Verification and project note

**Files:**
- Modify: `项目说明.md`

- [ ] **Step 1: Run frontend tests and build**

Run: `cd frontend; npm test -- --run`

Run: `cd frontend; npm run build`

- [ ] **Step 2: Run backend tests**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-review-action-interaction.json'; .\.venv\Scripts\python.exe -m pytest`

- [ ] **Step 3: Browser check**

Open `http://127.0.0.1:30080/` and confirm “复盘行动” still renders.

- [ ] **Step 4: Update project note**

Record this interaction protection and verification results in `项目说明.md`.
