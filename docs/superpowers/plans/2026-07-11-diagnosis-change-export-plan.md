# Diagnosis Change HTML Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render diagnosis change history in the HTML research report.

**Architecture:** Reuse the existing `diagnosis_change` payload field and add a defensive HTML rendering section. No backend changes are required.

**Tech Stack:** React, TypeScript, Vitest.

## Global Constraints

- Do not change backend schemas or endpoints.
- Do not change diagnosis change calculation.
- Escape all user/data text with `escapeHtml()`.
- Render fallback text for missing optional fields.

---

### Task 1: Write HTML Export Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes existing `diagnosis_change` payload.
- Expects HTML text for diagnosis change sections.

- [ ] **Step 1: Add assertions**

Add to the HTML export test:

```typescript
expect(html).toContain('诊断变化')
expect(html).toContain('暂无历史报告，当前诊断作为复盘基线。')
expect(html).toContain('评级轨迹')
expect(html).toContain('风险变化')
expect(html).toContain('关键驱动')
expect(html).toContain('当前诊断已作为后续对比基线。')
```

- [ ] **Step 2: Run focused test**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "exports a readable HTML"
```

Expected: FAIL because HTML export does not render diagnosis change yet.

### Task 2: Implement HTML Section

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Reads: `payload.diagnosis_change`

- [ ] **Step 1: Read payload defensively**

Add:

```typescript
const diagnosisChange = payload.diagnosis_change ?? {}
const ratingTransition = diagnosisChange.rating_transition ?? null
const riskShift = diagnosisChange.risk_shift ?? null
const scoreTrend = Array.isArray(diagnosisChange.score_trend) ? diagnosisChange.score_trend : []
const changeDrivers = Array.isArray(diagnosisChange.key_drivers) ? diagnosisChange.key_drivers : []
const changeItems = Array.isArray(diagnosisChange.changes) ? diagnosisChange.changes : []
```

- [ ] **Step 2: Render section**

Add a `诊断变化` section after `诊断摘要`, including metrics, summary, trend rows, rating transition, risk shift, key drivers, and change details.

- [ ] **Step 3: Re-run focused test**

Expected: PASS.

### Task 3: Verification, Note, Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-diagnosis-change-export-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [ ] **Step 2: Update project note**

Record the feature, docs, and verification counts.

- [ ] **Step 3: Commit and push**

Commit `feat: export diagnosis change details` and push `local-codex-progress`.
