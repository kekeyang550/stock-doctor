# 诊断历史对比增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance diagnosis history comparison so users can clearly see score trend, rating transition, risk change and key drivers.

**Architecture:** Extend the existing `DiagnosisChangeReport` without removing old fields. Keep the existing endpoint and panel, adding new structured fields and rendering sections.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Vitest.

## Global Constraints

- Keep `/api/v1/diagnosis-change/{symbol}` path unchanged.
- Keep existing `score_delta`, `*_delta`, `changes`, `rating_changed` fields unchanged.
- No new dependencies.
- Use TDD before implementation.

---

### Task 1: Backend Report Fields

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/diagnosis_change.py`
- Test: `backend/tests/test_diagnosis_change.py`

**Interfaces:**
- Produces: `score_trend`, `rating_transition`, `risk_shift`, `key_drivers` on `DiagnosisChangeReport`

- [ ] Write failing tests for baseline and previous-report comparison.
- [ ] Run focused backend test and confirm failure.
- [ ] Add Pydantic models and service builders.
- [ ] Run focused backend test and confirm pass.

### Task 2: Frontend Types and Panel

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/diagnosis/DiagnosisPanels.tsx`
- Modify: `frontend/src/styles/diagnosis.css`
- Modify: `frontend/src/styles/responsive.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: enhanced `DiagnosisChangeReport`
- Produces: enhanced “诊断变化” panel sections

- [ ] Extend test fixture with new fields.
- [ ] Write failing UI test assertions for trend, rating, risk and drivers.
- [ ] Run focused frontend test and confirm failure.
- [ ] Add TypeScript types and panel sections.
- [ ] Add CSS.
- [ ] Run focused frontend test and confirm pass.

### Task 3: Verification and Notes

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with isolated state path.
- [ ] Update project notes with scope and verification.
