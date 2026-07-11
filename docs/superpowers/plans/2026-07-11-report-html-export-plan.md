# HTML 报告导出雏形 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend-only HTML export that renders the current v2 research report payload into a readable standalone HTML file.

**Architecture:** Extract current report payload creation into a shared callback in `App.tsx`. Use it for JSON export and HTML export. Add a local HTML formatter function in `App.tsx`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, browser Blob download.

## Global Constraints

- Do not add dependencies.
- Do not add backend report generation.
- Reuse the existing v2 payload fields.
- Keep the JSON export behavior intact.

---

### Task 1: Failing HTML Export Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: topbar toolbar and report Blob download
- Produces: failing expectation for `导出HTML`

- [ ] Add a test that clicks `导出HTML`.
- [ ] Capture Blob parts and assert the generated HTML includes `<!doctype html>`, `贵州茅台`, `组合风险`, `策略回测`, and `数据可信度`.
- [ ] Assert filename is `stock-doctor-report-600519-2026-07-11.html`.
- [ ] Run focused test and verify it fails because the button does not exist.

### Task 2: Implement HTML Export

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: existing report state and v2 payload
- Produces: `.html` Blob download

- [ ] Extract v2 payload creation into `buildCurrentResearchReportPayload`.
- [ ] Keep JSON export using this payload.
- [ ] Add `exportCurrentResearchReportHtml`.
- [ ] Add `buildResearchReportHtml` and HTML escaping helpers.
- [ ] Add topbar button labelled `导出HTML`.
- [ ] Run focused test and verify it passes.

### Task 3: Verification And Notes

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with temp state path.
- [ ] Update `项目说明.md`.
