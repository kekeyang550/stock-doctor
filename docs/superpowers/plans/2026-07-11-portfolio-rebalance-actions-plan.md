# Portfolio Rebalance Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured rebalance actions to portfolio risk reports, UI, and HTML exports.

**Architecture:** Extend portfolio risk schema and service with derived rebalance actions based on current weights, risk scores, and contribution scores.

**Tech Stack:** FastAPI, Pydantic, React, TypeScript, Pytest, Vitest.

## Constraints

- Do not change portfolio risk score.
- Keep suggestions informational only.
- Keep frontend fields optional for old backend compatibility.

---

### Task 1: Backend Rebalance Actions

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/portfolio_risk.py`
- Test: `backend/tests/test_portfolio_risk.py`

- [x] **Step 1: Write failing backend test**

Assert custom-weight report includes reduce/hold rebalance actions with current and suggested weights.

- [x] **Step 2: Implement schema and service**

Add `PortfolioRebalanceAction` and compute actions from risk contributions.

- [x] **Step 3: Re-run focused backend test**

Expected after implementation: PASS.

### Task 2: Frontend and Export

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

- [x] **Step 1: Write failing frontend/export assertions**

Assert portfolio risk panel and HTML report show `再平衡建议`.

- [x] **Step 2: Render UI and report section**

Add compact action rows under risk contributions and HTML export.

- [x] **Step 3: Re-run focused frontend tests**

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
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-portfolio-rebalance-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

- [x] **Step 2: Update project note**

Record scope and verification output.

- [x] **Step 3: Commit and push**

Commit `feat: suggest portfolio rebalances` and push `local-codex-progress`.
