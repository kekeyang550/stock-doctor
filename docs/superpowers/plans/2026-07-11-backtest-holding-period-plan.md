# 策略回测持有周期切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users switch strategy backtest holding period between 3, 5, 10, and 20 days.

**Architecture:** Keep the existing backend endpoint. Add frontend state in `App.tsx`, pass it into `fetchStrategyBacktest`, and render period buttons in `StrategyBacktestPanel`.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

## Global Constraints

- Do not change backend API.
- Do not add dependencies.
- Default holding period remains 5 days.
- Keep existing strategy backtest display and error state.

---

### Task 1: Failing Frontend Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `StrategyBacktestPanel`, `/backtests/strategy`
- Produces: failing expectation for period switch

- [ ] Add a test that clicks the `10日` holding period button.
- [ ] Mock weighted `/backtests/strategy` response when URL includes `holding_days=10`.
- [ ] Assert a fetch URL includes `holding_days=10`.
- [ ] Assert the panel text includes `10 日样例持有` and `600519 · 白酒 · 10 日`.
- [ ] Run focused test and verify it fails because the control does not exist.

### Task 2: Implement Period Switch

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`

**Interfaces:**
- Consumes: `backtestHoldingDays`, `onHoldingDaysChange`
- Produces: reloaded strategy backtest for selected holding period

- [ ] Add `backtestHoldingDays` state in `App.tsx`, default `5`.
- [ ] Use it in `fetchStrategyBacktest(screenerPreset, horizon, backtestHoldingDays)`.
- [ ] Add it to `loadStrategyBacktest` dependencies.
- [ ] Pass `holdingDays` and `onHoldingDaysChange` into `StrategyBacktestPanel`.
- [ ] Render buttons for `[3, 5, 10, 20]`, marking the current value selected.
- [ ] Run focused test and verify it passes.

### Task 3: Verification And Notes

- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Run backend pytest with temp state path.
- [ ] Update `项目说明.md`.
