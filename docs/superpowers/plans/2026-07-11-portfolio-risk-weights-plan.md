# 组合风险权重模拟 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional simulated position weights to portfolio risk so users can compare equal-weight and custom-weight risk.

**Architecture:** Extend the existing portfolio risk report model and service to accept optional weights. Parse weights in the API route and add frontend inputs in the existing `RiskExposurePanel`.

**Tech Stack:** FastAPI, Pydantic, pytest, React, TypeScript, Vitest, Testing Library.

## Global Constraints

- Default behavior without `weights` must remain equal-weight.
- Do not persist simulated weights.
- Do not add new dependencies.
- Label the UI as simulated position weights.

---

### Task 1: Backend Weighted Report

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/portfolio_risk.py`
- Test: `backend/tests/test_portfolio_risk.py`

**Interfaces:**
- Consumes: `position_weights: dict[str, float] | None`
- Produces: weighted `PortfolioRiskReport`

- [ ] Write a failing test that passes `position_weights={"600519": 80, "300750": 20}` and asserts `weight_mode == "custom"`, `total_position_weight == 100`, `positions`, and weighted concentration.
- [ ] Add `PortfolioPositionWeight`, `weight_mode`, `total_position_weight`, `positions`, and `position_weight_pct`.
- [ ] Normalize valid positive weights and fall back to equal weights when absent or invalid.
- [ ] Use normalized weights for average scores and industry concentration.
- [ ] Run `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_risk.py -q`.

### Task 2: API Weights Query

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `weights=600519:80,300750:20`
- Produces: `PortfolioRiskReport.weight_mode == "custom"`

- [ ] Add failing API test for `/api/v1/risk/portfolio?weights=600519:80,300750:20`.
- [ ] Implement `_parse_position_weights`.
- [ ] Pass parsed weights to `portfolio_risk_service.build`.
- [ ] Run the focused API test.

### Task 3: Frontend Weight Inputs

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `watchlist`, `portfolioWeights`
- Produces: simulated weight inputs and weighted portfolio request

- [ ] Add frontend report fields to types.
- [ ] Update `fetchPortfolioRisk` to accept optional weights.
- [ ] Add `portfolioWeights` state in `App.tsx` and pass it to the fetch helper.
- [ ] Add inputs to `RiskExposurePanel`.
- [ ] Add App test that changes one input and expects the weighted URL plus “自定义权重”.
- [ ] Run focused frontend test.

### Task 4: Verification And Notes

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with a temp state path.
- [ ] Update `项目说明.md`.
