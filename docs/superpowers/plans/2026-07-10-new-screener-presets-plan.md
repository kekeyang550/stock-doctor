# 新增策略股票池预设 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Stock Doctor 增加“放量突破 / 资金回流 / 风险回避”三个策略股票池预设，并在 API 与前端入口中可见。

**Architecture:** 继续复用现有 `ScreenerService.screen()` 和 `/api/v1/screeners/{preset}`，不新增并行接口。筛选逻辑仍返回现有 `ScreenCandidate`，通过 `reason` 给出命中原因，通过 `risk_note` 保留诊断引擎的风险提示。

**Tech Stack:** FastAPI + Pydantic 后端，Vitest + React Testing Library 前端，pytest 后端测试。

## Global Constraints

- 所有新增文件保留在 `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor` 项目内。
- 后端行为先写失败测试，再写实现。
- 前端只补策略入口，不做视觉重构。
- 不引入新依赖。

---

### Task 1: 后端筛选服务支持新预设

**Files:**
- Modify: `backend/tests/test_screener.py`
- Modify: `backend/app/services/screener.py`

**Interfaces:**
- Consumes: `ScreenerService.screen(snapshots, diagnoses, preset) -> list[ScreenCandidate]`
- Produces: 新 preset 字符串 `breakout-volume`、`capital-return`、`risk-avoidance`

- [ ] **Step 1: Write the failing test**

新增测试覆盖三类预设：

```python
def test_screener_returns_candidates_for_new_presets():
    provider = MockMarketDataProvider()
    snapshots = [snapshot for stock in provider.list_stocks() if (snapshot := provider.get_snapshot(stock.symbol))]
    diagnoses = [DiagnosisEngine().diagnose(snapshot, horizon="swing") for snapshot in snapshots]
    service = ScreenerService()

    breakout = service.screen(snapshots, diagnoses, preset="breakout-volume")
    capital_return = service.screen(snapshots, diagnoses, preset="capital-return")
    risk_avoidance = service.screen(snapshots, diagnoses, preset="risk-avoidance")

    assert any(item.symbol == "600519" for item in breakout)
    assert any(item.symbol == "600519" for item in capital_return)
    assert any(item.symbol == "300750" for item in risk_avoidance)
    assert any(item.symbol == "002594" for item in risk_avoidance)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-screener-new.json'; .\.venv\Scripts\python.exe -m pytest tests\test_screener.py -q`

Expected: FAIL because the new presets return empty lists.

- [ ] **Step 3: Write minimal implementation**

Implement `_match_reason()` branches:

```python
if preset == "breakout-volume":
    above_key_averages = snapshot.last_price > snapshot.technical.ma5 and snapshot.last_price > snapshot.technical.ma20
    volume_expanding = snapshot.technical.volume_ratio >= 1.1
    momentum_positive = snapshot.change_pct > 0 and diagnosis.score.technical >= 70
    if above_key_averages and volume_expanding and momentum_positive and not snapshot.risk.st_flag:
        return f"价格站上 MA5/MA20，量比 {snapshot.technical.volume_ratio:.2f}，技术分 {diagnosis.score.technical}。"
```

Also add `capital-return` and `risk-avoidance` with similarly explicit reason strings.

- [ ] **Step 4: Run test to verify it passes**

Run the same pytest command. Expected: PASS.

### Task 2: API 放行新预设

**Files:**
- Modify: `backend/tests/test_api.py`
- Modify: `backend/app/api/routes.py`

**Interfaces:**
- Consumes: `GET /api/v1/screeners/{preset}`
- Produces: HTTP 200 for the three new preset ids

- [ ] **Step 1: Write the failing test**

Add:

```python
def test_screener_endpoint_accepts_new_presets():
    for preset in ["breakout-volume", "capital-return", "risk-avoidance"]:
        response = client.get(f"/api/v1/screeners/{preset}")

        assert response.status_code == 200
        assert all(item["preset"] == preset for item in response.json())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-api-new-screeners.json'; .\.venv\Scripts\python.exe -m pytest tests\test_api.py::test_screener_endpoint_accepts_new_presets -q`

Expected: FAIL with 404 for the first new preset.

- [ ] **Step 3: Write minimal implementation**

Extend the allowed preset set in `routes.py` to include `breakout-volume`、`capital-return`、`risk-avoidance`。

- [ ] **Step 4: Run test to verify it passes**

Run the same pytest command. Expected: PASS.

### Task 3: 前端显示新策略入口

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`

**Interfaces:**
- Consumes: `ScreenerPanel` local `screenerPresets`
- Produces: 三个新按钮文案 `放量突破`、`资金回流`、`风险回避`

- [ ] **Step 1: Write the failing test**

In the existing app render test, inside `screenerPanel` assertions add:

```ts
expect(within(screenerPanel).getByText('放量突破')).toBeInTheDocument()
expect(within(screenerPanel).getByText('资金回流')).toBeInTheDocument()
expect(within(screenerPanel).getByText('风险回避')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because the labels are missing.

- [ ] **Step 3: Write minimal implementation**

Append the three preset objects to `screenerPresets`:

```ts
{ value: 'breakout-volume', label: '放量突破' },
{ value: 'capital-return', label: '资金回流' },
{ value: 'risk-avoidance', label: '风险回避' },
```

- [ ] **Step 4: Run test to verify it passes**

Run the same Vitest command. Expected: PASS.

### Task 4: Final verification and project note

**Files:**
- Modify: `项目说明.md`

- [ ] **Step 1: Run backend full tests**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-phase3.json'; .\.venv\Scripts\python.exe -m pytest`

- [ ] **Step 2: Run frontend tests and build**

Run: `cd frontend; npm test -- --run`

Run: `cd frontend; npm run build`

- [ ] **Step 3: Update project note**

Record Phase 3 completion and verification commands in `项目说明.md`.
