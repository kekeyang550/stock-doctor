# Provider Cache TTL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `STOCK_DOCTOR_DATA_CACHE_TTL_SECONDS` control AKShare provider in-memory caches.

**Architecture:** Add timestamped cache entries inside `AkshareMarketDataProvider` for stock lists, snapshots, and raw history rows. Default TTL comes from settings; tests inject a deterministic clock.

**Tech Stack:** FastAPI, Python, Pytest.

## Constraints

- Do not change mock provider semantics.
- Do not introduce external cache services.
- Keep provider constructor backward compatible.

---

### Task 1: Cache TTL Tests

**Files:**
- Modify: `backend/tests/test_provider_factory.py`

- [x] **Step 1: Add stock list TTL test**

Assert repeated calls within TTL hit cache and calls after TTL reload remote rows.

- [x] **Step 2: Add snapshot/history TTL test**

Assert remote snapshot enrichment and direct price history reuse history rows within TTL, then reload after expiry.

### Task 2: Provider Implementation

**Files:**
- Modify: `backend/app/services/akshare_provider.py`

- [x] **Step 1: Add constructor injections**

Support `cache_ttl_seconds` and `clock` while preserving existing call sites.

- [x] **Step 2: Timestamp caches**

Apply TTL checks to stock list, snapshot, and history row caches.

### Task 3: Verification and Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run focused backend tests**

```bash
cd backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-provider-cache-ttl-focused-state.json"; .\.venv\Scripts\python.exe -m pytest tests/test_provider_factory.py
```

- [x] **Step 2: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-provider-cache-ttl-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 3: Update project note**

Record scope and verification output.

- [x] **Step 4: Commit and push**

Commit `feat: honor provider cache ttl` and push `local-codex-progress`.
