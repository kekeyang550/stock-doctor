# Mock Cache Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default Mock provider expose cache telemetry so the data trust panel is informative without AKShare.

**Architecture:** Add lightweight in-memory counters and `get_cache_status()` to `MockMarketDataProvider`; health service already consumes optional provider telemetry.

**Tech Stack:** FastAPI, Python, Pytest.

## Constraints

- Do not change mock data values.
- Do not add TTL expiry to Mock.
- Keep AKShare behavior unchanged.

---

### Task 1: Backend Tests

**Files:**
- Modify: `backend/tests/test_provider_factory.py`
- Modify: `backend/tests/test_data_connectors.py`

- [x] **Step 1: Write failing provider test**

Assert Mock provider reports stock list, snapshot, and history buckets with hit counters.

- [x] **Step 2: Write failing endpoint test**

Assert default `/system/data-connectors` returns `cache_status`.

### Task 2: Provider Implementation

**Files:**
- Modify: `backend/app/services/market_data.py`

- [x] **Step 1: Add counters**

Track stock list, snapshot, and history accesses.

- [x] **Step 2: Add `get_cache_status()`**

Return provider cache buckets in the existing schema-compatible dict shape.

- [x] **Step 3: Re-run focused backend tests**

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
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-mock-cache-telemetry-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Browser verification**

Open `http://127.0.0.1:30080/` and confirm the data trust panel shows cache buckets and no console errors.

- [x] **Step 3: Update project note**

Record scope and verification output.

- [x] **Step 4: Commit and push**

Commit `feat: expose mock cache telemetry` and push `local-codex-progress`.
