# 策略回测样本可信度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为单策略回测新增样本可信度评分、等级和说明，并在页面与 HTML 报告中展示。

**Architecture:** 后端 `StrategyBacktestService.run()` 基于已有回测字段计算 `sample_confidence_*`，写入 `StrategyBacktestReport`。前端 `StrategyBacktestPanel` 在价格来源卡片展示可信度，`buildResearchReportHtml()` 同步导出。

**Tech Stack:** Python 3.12、FastAPI/Pydantic、pytest、React、TypeScript、Vitest、Vite。

## Global Constraints

- 不新增第三方依赖。
- 不改变候选筛选、交易构造、收益计算、周期推荐或策略推荐逻辑。
- 前端新增字段必须可选，兼容旧 payload。
- 中文文案保持简洁，适合投资研究原型，不给自动交易承诺。

---

### Task 1: 后端样本可信度模型和计算

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Modify: `backend/app/services/strategy_backtest.py`
- Test: `backend/tests/test_strategy_backtest.py`

**Interfaces:**
- Consumes: `trade_count`, `price_source`, `history_bar_count`, `fallback_reason`
- Produces: `sample_confidence_score: int`, `sample_confidence_label: str`, `sample_confidence_notes: list[str]`

- [ ] **Step 1: Write the failing test**

在 `test_strategy_backtest_reports_returns_and_drawdown` 中加入：

```python
assert 0 <= report.sample_confidence_score <= 100
assert report.sample_confidence_label in {"高", "中", "低"}
assert report.sample_confidence_notes
assert any("样本" in note or "行情" in note or "fallback" in note for note in report.sample_confidence_notes)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-sample-confidence-red.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown -q
```

Expected: FAIL because `StrategyBacktestReport` does not yet expose `sample_confidence_score`.

- [ ] **Step 3: Add schema fields**

Add to `StrategyBacktestReport`:

```python
sample_confidence_score: int = 0
sample_confidence_label: str = "暂无评估"
sample_confidence_notes: list[str] = Field(default_factory=list)
```

- [ ] **Step 4: Add service helpers and response fields**

Add helpers in `StrategyBacktestService`:

```python
def _sample_confidence_score(self, trade_count: int, price_source: str, history_bar_count: int, fallback_reason: str | None) -> int:
    sample_score = 40 if trade_count >= 8 else 30 if trade_count >= 5 else 20 if trade_count >= 3 else 10 if trade_count > 0 else 0
    source_score = 35 if price_source == "historical-kline" else 15
    coverage_score = 15 if history_bar_count >= 40 else 8 if history_bar_count > 0 else 0
    fallback_score = 10 if fallback_reason is None else 0
    return max(0, min(100, sample_score + source_score + coverage_score + fallback_score))

def _sample_confidence_label(self, score: int) -> str:
    if score >= 75:
        return "高"
    if score >= 50:
        return "中"
    return "低"

def _sample_confidence_notes(self, trade_count: int, price_source: str, history_bar_count: int, fallback_reason: str | None) -> list[str]:
    ...
```

In `run()`, compute `price_source` and `fallback_reason` once, then pass the three new fields into `StrategyBacktestReport`.

- [ ] **Step 5: Run focused backend test**

Run:

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-sample-confidence-green.json"; .\.venv\Scripts\python.exe -m pytest tests/test_strategy_backtest.py::test_strategy_backtest_reports_returns_and_drawdown -q
```

Expected: 1 passed.

### Task 2: 前端面板和报告导出

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `sample_confidence_score?: number`, `sample_confidence_label?: string`, `sample_confidence_notes?: string[]`
- Produces: visible panel text and HTML report text.

- [ ] **Step 1: Write failing frontend assertions**

In fixture `strategyBacktest`, add:

```ts
sample_confidence_score: 76,
sample_confidence_label: '高',
sample_confidence_notes: ['回测交易 8 笔，样本量较充足。', '使用历史 K 线样本，行情口径更接近真实路径。'],
```

In panel assertions add:

```ts
expect(within(backtestPanel).getByText('样本可信度')).toBeInTheDocument()
expect(within(backtestPanel).getByText('可信等级')).toBeInTheDocument()
expect(within(backtestPanel).getByText('可信度说明')).toBeInTheDocument()
expect(within(backtestPanel).getByText('76')).toBeInTheDocument()
```

In HTML assertions add:

```ts
expect(html).toContain('样本可信度')
expect(html).toContain('可信等级')
expect(html).toContain('可信度说明')
expect(html).toContain('行情口径更接近真实路径')
```

- [ ] **Step 2: Run frontend test to verify it fails**

Run:

```powershell
npm test -- --run src/App.test.tsx
```

Expected: FAIL because panel/export do not yet render the new fields.

- [ ] **Step 3: Add frontend types**

Add optional fields to `StrategyBacktestReport`.

- [ ] **Step 4: Render panel fields**

In `StrategyBacktestPanel`, derive:

```ts
const sampleConfidenceNotes = Array.isArray(report?.sample_confidence_notes) ? report.sample_confidence_notes : []
```

Render in the lineage card:

```tsx
<span>
  <small>样本可信度</small>
  <strong>{report.sample_confidence_score ?? 0}</strong>
</span>
<span>
  <small>可信等级</small>
  <strong>{report.sample_confidence_label ?? '暂无评估'}</strong>
</span>
```

Render notes:

```tsx
{sampleConfidenceNotes.length ? (
  <em>{`可信度说明：${sampleConfidenceNotes.slice(0, 2).join(' · ')}`}</em>
) : (
  <em>{report.fallback_reason ?? '未发生 fallback'}</em>
)}
```

- [ ] **Step 5: Render HTML report fields**

In `buildResearchReportHtml()`, derive `sampleConfidenceNotes` and add metrics plus note rows under strategy backtest.

- [ ] **Step 6: Run focused frontend test**

Run:

```powershell
npm test -- --run src/App.test.tsx
```

Expected: 32 passed.

### Task 3: Full verification, docs, commit

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] **Step 1: Run full backend tests**

```powershell
$env:STOCK_DOCTOR_STATE_PATH="$env:TEMP\stock-doctor-backtest-sample-confidence-test-state.json"; .\.venv\Scripts\python.exe -m pytest
```

Expected: 124 passed, one known upstream deprecation warning is acceptable.

- [ ] **Step 2: Run full frontend tests**

```powershell
npm test -- --run
```

Expected: 32 passed.

- [ ] **Step 3: Run frontend build**

```powershell
npm run build
```

Expected: build exits 0.

- [ ] **Step 4: Browser verification**

Open `http://127.0.0.1:30080/` and verify:

- body is not blank
- text contains “策略回测”
- text contains “样本可信度”
- text contains “可信等级”
- text contains “可信度说明”
- console has no `error` logs

- [ ] **Step 5: Update project notes**

Append a `2026-07-11 策略回测样本可信度` section to project notes with implementation and verification results.

- [ ] **Step 6: Commit and push**

```powershell
git add backend/app/schemas/diagnosis.py backend/app/services/strategy_backtest.py backend/tests/test_strategy_backtest.py frontend/src/lib/types.ts frontend/src/components/screeners/ScreenerPanels.tsx frontend/src/App.tsx frontend/src/App.test.tsx docs/superpowers/specs/2026-07-11-backtest-sample-confidence-design.md docs/superpowers/plans/2026-07-11-backtest-sample-confidence-plan.md
git commit -m "feat: add backtest sample confidence"
git push origin local-codex-progress
```

## Self-Review

- Spec coverage: all spec requirements map to Tasks 1-3.
- Placeholder scan: no TBD/TODO remains.
- Type consistency: backend and frontend use `sample_confidence_score`, `sample_confidence_label`, `sample_confidence_notes`.
