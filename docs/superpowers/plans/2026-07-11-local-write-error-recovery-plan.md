# Local Write Error Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add panel-level failure feedback for write/storage operations while preserving user input and current data.

**Architecture:** `App.tsx` owns three local error strings and passes them to existing panels. Panels render the existing `.panel-state.error-state` block. Backend APIs remain unchanged.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing CSS.

## Global Constraints

- Keep all user-facing copy in Chinese.
- Do not add backend APIs or dependencies.
- Preserve current top-level error banner.
- Use TDD for behavior changes.

---

### Task 1: Failing Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Expected panel copy: `研究笔记操作失败`, `价位提醒操作失败`, `系统存储操作失败`.

- [ ] **Step 1: Write failing tests**

Add tests that simulate failed note save, failed price-alert delete, failed import preview, and failed import apply.

- [ ] **Step 2: Run focused tests**

Run `npm test -- --run src/App.test.tsx -t "local failure"` and confirm tests fail because panel-level errors do not exist yet.

### Task 2: App State

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Add `noteError: string | null`, `priceAlertError: string | null`, `storageError: string | null`.
- Pass those values into `ResearchNotesPanel`, `PriceAlertsPanel`, `SystemStoragePanel`.

- [ ] **Step 1: Clear errors on operation start**

Clear the matching local error before each save/delete/export/preview/import operation.

- [ ] **Step 2: Set errors on catch**

Set the matching local error to the caught message while preserving existing top-level `setError`.

### Task 3: Panel Rendering

**Files:**
- Modify: `frontend/src/components/research/ResearchPanels.tsx`
- Modify: `frontend/src/components/system/SystemPanels.tsx`

**Interfaces:**
- `ResearchNotesPanel` gains `error: string | null`.
- `PriceAlertsPanel` gains `error: string | null`.
- `SystemStoragePanel` gains `error: string | null`.

- [ ] **Step 1: Render error blocks**

Render compact `.panel-state.error-state` blocks under the panel controls.

- [ ] **Step 2: Verify**

Run focused tests, full frontend tests, frontend build, and backend tests. Update `项目说明.md`.
