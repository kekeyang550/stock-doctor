# Portfolio Risk Contribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add industry exposure and single-stock risk contribution to portfolio risk reports, UI, and HTML export.

**Architecture:** Extend the existing portfolio risk report with two derived arrays. Compute them from snapshots, diagnoses, and normalized weights; render them defensively in the frontend.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Pytest, Vitest.

## Global Constraints

- Do not add correlation or VaR modeling in this increment.
- Do not change portfolio weight input behavior.
- Keep old frontend/backend compatibility by treating new frontend fields as optional.
- Use TDD for backend, panel UI, and HTML export.

---

### Task 1: Backend Report Fields

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/portfolio_risk.py`
- Test: `backend/tests/test_portfolio_risk.py`

**Interfaces:**
- Produces: `PortfolioRiskReport.industry_exposures`
- Produces: `PortfolioRiskReport.risk_contributions`

- [x] **Step 1: Write failing tests**

Assert:

```python
assert report.industry_exposures
assert report.industry_exposures[0].weight_pct > 0
assert report.risk_contributions
assert report.risk_contributions[0].contribution_score >= report.risk_contributions[-1].contribution_score
```

- [x] **Step 2: Run focused backend test**

```bash
cd backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-portfolio-contribution-red-state.json"; .\.venv\Scripts\python.exe -m pytest tests/test_portfolio_risk.py
```

Expected before implementation: FAIL because the fields are missing.

- [x] **Step 3: Implement schema and service**

Add Pydantic models and derive the two arrays from current snapshots, diagnoses, and weights.

- [x] **Step 4: Re-run focused backend test**

Expected after implementation: PASS.

### Task 2: Frontend Panel

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `PortfolioRiskReport.industry_exposures`
- Consumes: `PortfolioRiskReport.risk_contributions`

- [x] **Step 1: Write failing UI assertions**

Assert the panel shows `行业暴露`, `汽车整车 33.3%`, `风险贡献`, and contribution details for 比亚迪.

- [x] **Step 2: Implement UI**

Render two compact lists after the simulated position editor.

- [x] **Step 3: Re-run focused frontend test**

Expected after implementation: PASS.

### Task 3: HTML Export

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `portfolio_risk.industry_exposures`
- Consumes: `portfolio_risk.risk_contributions`

- [x] **Step 1: Write failing HTML assertions**

Assert the exported HTML contains `行业暴露`, `风险贡献`, and representative rows.

- [x] **Step 2: Implement HTML rendering**

Read arrays defensively and render sections in the `组合风险` block.

- [x] **Step 3: Re-run focused tests**

Expected after implementation: PASS.

### Task 4: Verification and Commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [x] **Step 1: Run full verification**

```bash
cd frontend
npm test -- --run
npm run build
cd ../backend
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-portfolio-contribution-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record feature scope, docs, and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: explain portfolio risk contribution` and push `local-codex-progress`.
