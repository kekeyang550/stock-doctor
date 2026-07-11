# 策略股票池解释增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为策略股票池候选结果增加命中规则、正面证据和失效风险解释，并在前端展示。

**Architecture:** 复用现有 `/api/v1/screeners/{preset}` 与 `ScreenCandidate`，在 schema 上追加兼容字段。`ScreenerService` 负责统一生成解释，前端 `ScreenerPanel` 做紧凑展示。

**Tech Stack:** FastAPI + Pydantic 后端，React + TypeScript 前端，pytest 与 Vitest 测试。

## Global Constraints

- 所有新增和修改文件保留在 `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor` 项目内。
- 不新增依赖。
- 不改评分模型。
- 不新增 API 路径。
- 每个行为变化先写失败测试，再写实现。

---

### Task 1: 后端 schema 和服务解释字段

**Files:**
- Modify: `backend/tests/test_screener.py`
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/screener.py`

**Interfaces:**
- Consumes: `ScreenerService.screen(snapshots, diagnoses, preset) -> list[ScreenCandidate]`
- Produces: `ScreenCandidate.rule_tags: list[str]`、`positive_evidence: str`、`invalidation_risk: str`

- [ ] **Step 1: Write the failing test**

Add assertions:

```python
breakout = service.screen(snapshots, diagnoses, preset="breakout-volume")
candidate = next(item for item in breakout if item.symbol == "600519")

assert "站上均线" in candidate.rule_tags
assert "技术分" in candidate.positive_evidence
assert "MA20" in candidate.invalidation_risk
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-screener-explanation.json'; .\.venv\Scripts\python.exe -m pytest tests\test_screener.py -q`

Expected: FAIL because `ScreenCandidate` has no `rule_tags` attribute.

- [ ] **Step 3: Write minimal implementation**

Add fields to `ScreenCandidate`:

```python
rule_tags: list[str] = Field(default_factory=list)
positive_evidence: str = ""
invalidation_risk: str = ""
```

Update `ScreenerService` to create an internal explanation object and pass all fields into `ScreenCandidate`.

- [ ] **Step 4: Run test to verify it passes**

Run the same pytest command. Expected: PASS.

### Task 2: API response includes explanation fields

**Files:**
- Modify: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `GET /api/v1/screeners/breakout-volume`
- Produces: JSON fields `rule_tags`、`positive_evidence`、`invalidation_risk`

- [ ] **Step 1: Write the failing test**

Add:

```python
def test_screener_endpoint_returns_explanation_fields():
    response = client.get("/api/v1/screeners/breakout-volume")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert {"rule_tags", "positive_evidence", "invalidation_risk"}.issubset(payload[0].keys())
    assert payload[0]["rule_tags"]
```

- [ ] **Step 2: Run test**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-api-screener-explanation.json'; .\.venv\Scripts\python.exe -m pytest tests\test_api.py::test_screener_endpoint_returns_explanation_fields -q`

Expected: PASS after Task 1 because FastAPI serializes the updated schema.

### Task 3: 前端 type 和展示

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `ScreenCandidate` with optional explanation fields
- Produces: visible labels `命中规则`、`正面证据`、`失效风险`

- [ ] **Step 1: Write the failing test**

Add fields to the App test fixture and assert:

```ts
expect(within(screenerPanel).getByText('命中规则')).toBeInTheDocument()
expect(within(screenerPanel).getByText('站上均线')).toBeInTheDocument()
expect(within(screenerPanel).getByText('正面证据')).toBeInTheDocument()
expect(within(screenerPanel).getByText('失效风险')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: FAIL because the panel does not render explanation rows yet.

- [ ] **Step 3: Write minimal implementation**

Update `ScreenCandidate` type and render compact rows when fields are present.

- [ ] **Step 4: Run test to verify it passes**

Run the same Vitest command. Expected: PASS.

### Task 4: Final verification and project note

**Files:**
- Modify: `项目说明.md`

- [ ] **Step 1: Run backend full tests**

Run: `cd backend; $env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-explanation.json'; .\.venv\Scripts\python.exe -m pytest`

- [ ] **Step 2: Run frontend tests and build**

Run: `cd frontend; npm test -- --run`

Run: `cd frontend; npm run build`

- [ ] **Step 3: Update project note**

Record the explanation enhancement and verification results in `项目说明.md`.
