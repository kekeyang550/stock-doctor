# Data Runtime Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make real-data runtime assumptions visible through backend health payloads and the frontend data trust panel.

**Architecture:** Add configuration fields to `Settings`, expose them through `DataConnectorHealth.runtime_config`, use the freshness threshold in `DataRefreshJobService`, and render the values in `DataConnectorPanel`.

**Tech Stack:** FastAPI, Pydantic Settings, React, TypeScript, Vitest, Pytest.

## Global Constraints

- Keep backwards compatibility with old frontend/backend payloads by making frontend `runtime_config` optional.
- Do not change AKShare field mapping.
- Do not add a scheduler in this increment.
- Use TDD: backend and frontend tests must fail before implementation and pass after.

---

### Task 1: Backend Runtime Config Contract

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/data_connectors.py`
- Test: `backend/tests/test_data_connectors.py`

**Interfaces:**
- Produces: `DataConnectorHealth.runtime_config`

- [x] **Step 1: Write failing tests**

Assert health service and endpoint return `request_timeout_seconds`, `cache_ttl_seconds`, and `freshness_stale_after_minutes`.

- [x] **Step 2: Run focused tests**

```bash
cd backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-runtime-config-red-state.json"; .\.venv\Scripts\python.exe -m pytest tests/test_data_connectors.py
```

Expected before implementation: FAIL because `runtime_config` is missing.

- [x] **Step 3: Implement config and schema**

Add settings fields and a `DataConnectorRuntimeConfig` model. Return it from `DataConnectorHealthService.build_health()`.

- [x] **Step 4: Re-run focused tests**

Expected after implementation: PASS.

### Task 2: Freshness Threshold Uses Config

**Files:**
- Modify: `backend/app/services/refresh_jobs.py`
- Test: `backend/tests/test_refresh_jobs.py`

**Interfaces:**
- Consumes: `settings.data_freshness_stale_after_minutes`
- Produces: configured `DataFreshnessStatus.stale_after_minutes`

- [x] **Step 1: Write failing test**

Monkeypatch `settings.data_freshness_stale_after_minutes = 12` and assert `build_freshness()` returns `stale_after_minutes == 12`.

- [x] **Step 2: Implement default threshold**

Make `stale_after_minutes` optional and default to `settings.data_freshness_stale_after_minutes`.

- [x] **Step 3: Re-run focused tests**

Expected after implementation: PASS.

### Task 3: Frontend Data Trust Display

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/system/SystemPanels.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `DataConnectorHealth.runtime_config`

- [x] **Step 1: Write failing test**

Assert the data trust panel shows `请求超时`, `8 秒`, `缓存 TTL`, `300 秒`, `过期阈值`, and `30 分钟`.

- [x] **Step 2: Implement UI cards**

Render runtime config cards in `DataConnectorPanel`, with fallback values for old responses.

- [x] **Step 3: Re-run focused test**

Expected after implementation: PASS.

### Task 4: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Document env vars**

Add runtime knobs to README.

- [x] **Step 2: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-data-runtime-config-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 3: Commit and push**

Commit `feat: surface data runtime config` and push `local-codex-progress`.
