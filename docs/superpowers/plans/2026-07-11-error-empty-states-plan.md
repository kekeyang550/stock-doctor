# Error and Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve frontend feedback for diagnosis failures, screener failures, hotspot candidate failures, and no-candidate empty states.

**Architecture:** Keep all changes in the frontend. `App.tsx` owns request error state and retry callbacks; panel components render local error/empty UI from props.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing CSS modules.

## Global Constraints

- Do not add backend APIs.
- Keep copy in Chinese.
- Follow existing panel and button patterns.
- Use TDD: write failing tests before production changes.

---

### Task 1: Diagnosis Failure State

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `diagnosisError: string | null`
- Produces: main content fallback with retry button calling `loadDiagnosis`

- [ ] **Step 1: Write failing test**

Add a test that makes `/diagnosis/600519` reject with `new Error('行情接口超时')`, then expects the page to show `行情数据加载失败`, `行情接口超时`, and a `重试诊断` button instead of endless loading.

- [ ] **Step 2: Verify red**

Run `npm test -- --run src/App.test.tsx -t "shows a diagnosis failure state"` and confirm it fails because the UI still shows loading or lacks the failure copy.

- [ ] **Step 3: Implement**

Add `diagnosisError` state, set it on `loadDiagnosis` catch, clear it before new loads, and render a `state-panel error-state` with retry when `!loading && diagnosisError`.

- [ ] **Step 4: Verify green**

Run the focused test and confirm it passes.

### Task 2: Screener and Hotspot Panel Errors

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/components/hotspots/HotspotPanels.tsx`

**Interfaces:**
- `ScreenerPanel` gains `error: string | null` and `onRetry: () => void`.
- `HotspotCandidatesPanel` gains `error: string | null` and `onRetry: () => void`.

- [ ] **Step 1: Write failing tests**

Add tests that reject `/screeners` and `/hotspots/candidates`, then assert panel-level error copy and retry buttons.

- [ ] **Step 2: Verify red**

Run focused tests and confirm failures are due to missing panel-level error UI.

- [ ] **Step 3: Implement**

Add `screenerError` and `hotspotCandidatesError` state in `App.tsx`; extract `loadScreenerCandidates` and `loadHotspotCandidates` callbacks; pass errors and retry handlers into panels.

- [ ] **Step 4: Verify green**

Run focused tests and confirm they pass.

### Task 3: No-Candidate Empty States

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/components/hotspots/HotspotPanels.tsx`

**Interfaces:**
- Empty state copy includes `当前策略没有候选股票` and `当前热点模式没有候选股票`.

- [ ] **Step 1: Write failing test**

Mock both candidate endpoints to return `[]`; assert the richer empty-state copy and next-step guidance.

- [ ] **Step 2: Verify red**

Run focused test and confirm old copy fails.

- [ ] **Step 3: Implement**

Replace one-line empty text with compact empty-state blocks.

- [ ] **Step 4: Verify green and full suite**

Run focused tests, full frontend tests, frontend build, and backend tests. Update `项目说明.md`.
