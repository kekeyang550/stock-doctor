# Report Cache Telemetry Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include provider cache telemetry in the HTML research report.

**Architecture:** Extend existing report HTML builder with defensive cache status reads and a cache bucket section.

**Tech Stack:** React, TypeScript, Vitest.

## Constraints

- Keep old payload compatibility.
- Escape all exported values.
- Do not alter backend report payloads.

---

### Task 1: HTML Export Coverage

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Write failing test**

Assert HTML export contains cache hit total and cache bucket values.

- [x] **Step 2: Implement report HTML section**

Add cache telemetry metrics and bucket rows under “数据可信度”.

- [x] **Step 3: Re-run focused frontend test**

Expected after implementation: PASS.

### Task 2: Verification and Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-report-cache-telemetry-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record scope and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: export cache telemetry in reports` and push `local-codex-progress`.
