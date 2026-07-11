# 报告导出 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing JSON report export to include strategy backtest and simulated portfolio weight inputs.

**Architecture:** Keep the current frontend-only Blob export path. Add `strategyBacktest` and `portfolioWeights` to the export payload and update the existing App test.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not add dependencies.
- Do not add server-side report generation.
- Keep existing file naming behavior.
- Preserve existing exported diagnosis, portfolio risk, data quality, and data trust fields.

---

### Task 1: Export Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: current report export button, `strategyBacktest` fixture, simulated weight input
- Produces: failing assertion for v2 fields

- [ ] Update the existing export test to set “模拟仓位 贵州茅台” to `80` before clicking “导出报告”.
- [ ] Change expected `version` from `stock-doctor-report-v1` to `stock-doctor-report-v2`.
- [ ] Assert `exported.strategy_backtest.trade_count === 2`.
- [ ] Assert `exported.portfolio_weight_inputs["600519"] === "80"`.
- [ ] Run `npm test -- --run src/App.test.tsx -t "exports the current research report"` and verify it fails because the payload is still v1/missing fields.

### Task 2: Export Payload

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `strategyBacktest`, `portfolioWeights`
- Produces: JSON payload version `stock-doctor-report-v2`

- [ ] Add `strategy_backtest: strategyBacktest` to the payload.
- [ ] Add `portfolio_weight_inputs: portfolioWeights` to the payload.
- [ ] Change `version` to `stock-doctor-report-v2`.
- [ ] Add `strategyBacktest` and `portfolioWeights` to the `useCallback` dependency list.
- [ ] Run the focused export test and verify it passes.

### Task 3: Verification And Notes

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with a temp state path to ensure no API regressions.
- [ ] Append a project note for report export v2.
