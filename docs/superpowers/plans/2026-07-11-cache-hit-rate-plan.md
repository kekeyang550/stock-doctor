# Cache Hit Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hit/miss counts and hit-rate telemetry to provider cache status, UI, and HTML export.

**Architecture:** Extend cache bucket schema and provider counters; render optional fields defensively.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Pytest, Vitest.

## Constraints

- Keep fields backward compatible in frontend.
- Do not persist counters.
- Do not change cache expiry semantics.

---

### Task 1: Backend Telemetry

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/akshare_provider.py`
- Test: `backend/tests/test_provider_factory.py`

- [x] **Step 1: Write failing backend test**

Assert stock list/history cache hits and misses produce hit-rate values.

- [x] **Step 2: Implement counters and schema fields**

Track hits/misses per cache bucket.

- [x] **Step 3: Re-run focused backend test**

Expected after implementation: PASS.

### Task 2: Frontend and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/system/SystemPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing frontend/export assertions**

Assert cache hit-rate text appears in the panel and HTML report.

- [x] **Step 2: Render hit-rate details**

Add hit/miss/rate to cards and export rows.

- [x] **Step 3: Re-run focused frontend tests**

Expected after implementation: PASS.

### Task 3: Verification and Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-cache-hit-rate-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record scope and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: track provider cache hit rates` and push `local-codex-progress`.
