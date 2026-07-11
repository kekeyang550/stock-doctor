# Review Actions Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export review action plans in both JSON and HTML research reports.

**Architecture:** Reuse the already-loaded frontend `reviewActions` state. No backend API or schema changes are required.

**Tech Stack:** React, TypeScript, Vitest.

## Global Constraints

- Keep the change scoped to report export.
- Do not change review action generation or status update flows.
- Escape all HTML output with `escapeHtml()`.
- Render empty-state text when action items are missing.

---

### Task 1: Write Export Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: JSON assertions**

Assert that exported JSON includes:

```ts
expect(exported.review_actions.pending_count).toBe(2)
expect(exported.review_actions.items.map((item) => item.title)).toContain('验证论证假设 1')
```

- [x] **Step 2: HTML assertions**

Assert that exported HTML includes:

```ts
expect(html).toContain('复盘行动')
expect(html).toContain('待处理')
expect(html).toContain('主力资金流出')
expect(html).toContain('验证论证假设 1')
expect(html).toContain('论证验证')
```

- [x] **Step 3: Run focused test**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "exports the current research report|exports a readable HTML"
```

Expected before implementation: FAIL because `review_actions` and the HTML section are missing.

### Task 2: Implement Export

**Files:**
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Add JSON field**

Add `review_actions: reviewActions` to `buildCurrentResearchReportPayload()`.

- [x] **Step 2: Render HTML section**

Add defensive reads in `buildResearchReportHtml()` and render a “复盘行动” section with summary metrics and action rows.

- [x] **Step 3: Add labels**

Add helper functions for priority and status labels.

- [x] **Step 4: Re-run focused test**

Expected after implementation: PASS.

### Task 3: Verification, Note, Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-review-actions-export-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record the feature, docs, and verification results.

- [x] **Step 3: Commit and push**

Commit `feat: export review actions` and push `local-codex-progress`.
