# Cache Telemetry Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface provider cache telemetry in data connector health and the frontend data trust panel.

**Architecture:** Add cache status schemas, provider optional telemetry method, health service passthrough, frontend types and cards.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Pytest, Vitest.

## Constraints

- Keep telemetry optional for older/non-cache providers.
- Do not add hit/miss counters in this increment.
- Keep UI compact inside existing DataConnectorPanel.

---

### Task 1: Backend Cache Status

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/akshare_provider.py`
- Modify: `backend/app/services/data_connectors.py`
- Test: `backend/tests/test_data_connectors.py`
- Test: `backend/tests/test_provider_factory.py`

- [x] **Step 1: Write failing backend tests**

Assert health service returns cache buckets and AKShare provider reports warm cache entries.

- [x] **Step 2: Implement schemas and provider telemetry**

Add optional cache status to connector health.

- [x] **Step 3: Re-run focused backend tests**

Expected after implementation: PASS.

### Task 2: Frontend Data Trust Cards

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/system/SystemPanels.tsx`
- Test: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing UI test**

Assert data trust panel shows cache bucket labels and counts.

- [x] **Step 2: Render cache telemetry cards**

Add compact cache bucket cards below runtime config cards.

- [x] **Step 3: Re-run focused frontend test**

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
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-cache-telemetry-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record scope and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: surface provider cache telemetry` and push `local-codex-progress`.
