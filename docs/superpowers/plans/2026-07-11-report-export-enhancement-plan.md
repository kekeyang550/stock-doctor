# 报告导出增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend JSON research report export containing diagnosis, portfolio risk and data trust context.

**Architecture:** Reuse current App state and browser Blob download. Add a toolbar action and focused Vitest coverage.

**Tech Stack:** React, TypeScript, Vitest, browser Blob APIs.

## Global Constraints

- No new dependencies.
- Do not change persisted report history semantics.
- Keep export as JSON in this stage.
- Use TDD before implementation.

---

### Task 1: Frontend Report Export

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces: `exportCurrentResearchReport(): void`
- Export filename: `stock-doctor-report-{symbol}-{YYYY-MM-DD}.json`

- [ ] Write failing test that clicks “导出报告” and validates Blob JSON content.
- [ ] Run focused test and confirm failure.
- [ ] Implement export state and function.
- [ ] Add toolbar button.
- [ ] Run focused test and confirm pass.

### Task 2: Verification and Notes

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with isolated state path.
- [ ] Update project notes.
