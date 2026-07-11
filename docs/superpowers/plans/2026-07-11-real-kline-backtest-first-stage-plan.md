# 真实历史 K 线回测第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让策略回测优先使用 provider 历史日线，并在前端展示回测价格来源。

**Architecture:** 新增 `HistoricalPriceBar` schema 和 provider 协议方法，Mock/AKShare provider 分别实现历史日线输出。`StrategyBacktestService` 接收可选 provider，优先把历史日线转成回测价格点，失败时回退到原有 `TrendService` 合成序列。

**Tech Stack:** FastAPI、Pydantic、pytest、React、TypeScript、Vitest。

## Global Constraints

- 不引入新依赖。
- 不改变现有 `/api/v1/backtests/strategy` 查询参数。
- AKShare 历史日线第一阶段固定使用 `period="daily"` 和 `adjust="qfq"`。
- 历史日线异常或不足时必须回退到现有样例趋势。
- 所有新增说明文档使用中文。

---

### Task 1: Provider 历史日线接口

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/providers.py`
- Modify: `backend/app/services/market_data.py`
- Modify: `backend/app/services/akshare_provider.py`
- Test: `backend/tests/test_provider_factory.py`

**Interfaces:**
- Produces: `HistoricalPriceBar(date: str, close: float, volume: float = 0)`.
- Produces: `MarketDataProvider.get_price_history(symbol: str, days: int = 60) -> list[HistoricalPriceBar]`.

- [ ] **Step 1: Write failing provider tests**

Add tests for Mock provider and AKShare provider history parsing.

- [ ] **Step 2: Run provider tests to verify failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_provider_factory.py -q`

Expected: failure because `get_price_history` or `HistoricalPriceBar` does not exist.

- [ ] **Step 3: Implement provider history**

Add schema, protocol method, Mock deterministic history generation, and AKShare public `get_price_history()`.

- [ ] **Step 4: Run provider tests to verify pass**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_provider_factory.py -q`

Expected: pass.

### Task 2: 回测服务优先使用历史日线

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_strategy_backtest.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Produces: `StrategyBacktestReport.price_source`.
- Produces: `StrategyBacktestPeriodSummary.price_source`.
- Consumes: `MarketDataProvider.get_price_history()`.

- [ ] **Step 1: Write failing service test**

Add a fake provider with known historical closes. Assert report uses `historical-kline` and trade prices match provider bars.

- [ ] **Step 2: Run service test to verify failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py -q`

Expected: failure because service does not accept/use provider history.

- [ ] **Step 3: Implement service history path**

Add `market_data_provider` constructor parameter, convert `HistoricalPriceBar` to `TrendPoint`, track price source, and preserve fallback.

- [ ] **Step 4: Add route injection and API assertion**

Pass global `data_provider` into `StrategyBacktestService` and assert API payload includes `price_source`.

- [ ] **Step 5: Run backend tests**

Run: `.\.venv\Scripts\python.exe -m pytest`

Expected: all backend tests pass.

### Task 3: 前端价格来源展示

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`

**Interfaces:**
- Consumes: `StrategyBacktestReport.price_source`.

- [ ] **Step 1: Write failing frontend test**

Update fixture to include `price_source: "historical-kline"` and assert the strategy backtest panel shows “价格来源” and “历史K线”。

- [ ] **Step 2: Run frontend focused test**

Run: `npm test -- --run src/App.test.tsx -t "strategy backtest summary"`

Expected: failure because UI does not display source.

- [ ] **Step 3: Implement UI**

Add source label rendering in `StrategyBacktestPanel` and small CSS.

- [ ] **Step 4: Run frontend tests and build**

Run: `npm test -- --run` and `npm run build`.

Expected: pass.

### Task 4: Docs, verification, commit

**Files:**
- Modify: `C:/Users/Administrator/Desktop/workspace/project_0010_stock-doctor/项目说明.md`

- [ ] **Step 1: Update project notes**

Append “2026-07-11 真实历史 K 线回测第一阶段” with verification results.

- [ ] **Step 2: Run final verification**

Run backend tests, frontend tests, and frontend build fresh.

- [ ] **Step 3: Commit and push**

Commit feature on `local-codex-progress` and push to `origin/local-codex-progress`.
