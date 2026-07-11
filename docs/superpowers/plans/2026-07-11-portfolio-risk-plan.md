# 自选股组合风险第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-stage portfolio risk report for watchlist/all scope and show it in the existing risk panel.

**Architecture:** Add a backend `PortfolioRiskService` that combines snapshots, diagnoses and alerts into a structured `PortfolioRiskReport`. Add a new `/api/v1/risk/portfolio` endpoint and a frontend `fetchPortfolioRisk` call, then upgrade `RiskExposurePanel` to render the report plus the existing category exposure list.

**Tech Stack:** FastAPI, Pydantic models, existing diagnosis/alert services, React, TypeScript, Vitest.

## Global Constraints

- Keep `/api/v1/risk/exposure` response shape unchanged.
- Do not add new runtime dependencies.
- Use transparent heuristic scoring; no fake precision, no trading advice.
- Use TDD: write each failing test before production code.
- Keep all docs and source inside `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor`.

---

### Task 1: Backend Portfolio Risk Service

**Files:**
- Modify: `backend/app/schemas/diagnosis.py`
- Create: `backend/app/services/portfolio_risk.py`
- Test: `backend/tests/test_portfolio_risk.py`

**Interfaces:**
- Consumes: `StockSnapshot`, `Diagnosis`, `AlertItem`, `RiskExposureItem`
- Produces: `PortfolioRiskService().build(scope: str, horizon: str, snapshots: list[StockSnapshot], diagnoses: list[Diagnosis], alerts: list[AlertItem], exposures: list[RiskExposureItem]) -> PortfolioRiskReport`

- [ ] **Step 1: Write the failing service test**

```python
def test_portfolio_risk_report_summarizes_watchlist():
    provider = MockMarketDataProvider()
    diagnosis_engine = DiagnosisEngine()
    alert_engine = AlertEngine()
    exposure_service = RiskExposureService()

    snapshots = []
    diagnoses = []
    alerts = []
    for stock in provider.get_watchlist():
        snapshot = provider.get_snapshot(stock.symbol)
        assert snapshot is not None
        diagnosis = diagnosis_engine.diagnose(snapshot, horizon="swing")
        snapshots.append(snapshot)
        diagnoses.append(diagnosis)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    exposures = exposure_service.summarize(alerts)
    report = PortfolioRiskService().build(
        scope="watchlist",
        horizon="swing",
        snapshots=snapshots,
        diagnoses=diagnoses,
        alerts=alerts,
        exposures=exposures,
    )

    assert report.scope == "watchlist"
    assert report.horizon == "swing"
    assert report.stock_count == 3
    assert report.average_total_score > 0
    assert report.average_risk_score > 0
    assert report.portfolio_risk_score >= 0
    assert report.risk_level in {"low", "medium", "high"}
    assert report.concentration.top_industry
    assert report.distribution.high_count + report.distribution.medium_count + report.distribution.low_count == 3
    assert report.top_drivers
    assert report.suggestions
    assert report.exposures == exposures
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_risk.py -q`

Expected: FAIL because `app.services.portfolio_risk` or portfolio risk schema is missing.

- [ ] **Step 3: Implement models and service**

Add Pydantic models for concentration, distribution, drivers and report. Implement deterministic heuristic scoring from average risk score, high alert count and industry concentration.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_risk.py -q`

Expected: PASS.

### Task 2: Backend API Endpoint

**Files:**
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_api.py`

**Interfaces:**
- Consumes: `PortfolioRiskService.build(...)`
- Produces: `GET /api/v1/risk/portfolio?scope=watchlist&horizon=swing -> PortfolioRiskReport`

- [ ] **Step 1: Write the failing API test**

```python
def test_portfolio_risk_endpoint_returns_report():
    response = client.get("/api/v1/risk/portfolio?scope=watchlist&horizon=swing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "watchlist"
    assert payload["horizon"] == "swing"
    assert payload["stock_count"] >= 1
    assert payload["risk_level"] in {"low", "medium", "high"}
    assert "concentration" in payload
    assert "distribution" in payload
    assert isinstance(payload["top_drivers"], list)
    assert isinstance(payload["suggestions"], list)
    assert isinstance(payload["exposures"], list)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_api.py::test_portfolio_risk_endpoint_returns_report -q`

Expected: FAIL with 404 or missing route.

- [ ] **Step 3: Implement the route**

Instantiate `PortfolioRiskService`, collect snapshots/diagnoses/alerts for the requested scope, summarize exposures with existing `RiskExposureService`, then return the report.

- [ ] **Step 4: Run backend tests**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_risk.py tests/test_api.py::test_portfolio_risk_endpoint_returns_report -q`

Expected: PASS.

### Task 3: Frontend Types, API and Panel

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Modify: `frontend/src/styles/screeners.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: `PortfolioRiskReport`
- Produces: `<RiskExposurePanel report={portfolioRisk} onSelect={setSelectedSymbol} />`

- [ ] **Step 1: Write the failing frontend test**

Assert that the app renders “组合风险”, “风险压力”, “行业集中”, the top industry, risk distribution counts, a suggestion, and the old exposure row.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx -t "portfolio risk"`

Expected: FAIL because frontend does not call `/risk/portfolio` and panel lacks the new copy.

- [ ] **Step 3: Add frontend type and API call**

Add `PortfolioRiskReport`, nested types and `fetchPortfolioRisk(horizon, scope = "watchlist")`.

- [ ] **Step 4: Wire state and render panel**

Replace `riskExposure` state with `portfolioRisk`, load it when `horizon` or `watchlist` changes, and pass it to `RiskExposurePanel`.

- [ ] **Step 5: Upgrade panel and styles**

Render summary cards, concentration/distribution/drivers/suggestions, then render `report.exposures` using the existing exposure row pattern.

- [ ] **Step 6: Run frontend test**

Run: `npm test -- --run src/App.test.tsx -t "portfolio risk"`

Expected: PASS.

### Task 4: Full Verification and Project Notes

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 3: Run backend tests**

Run: `$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-portfolio-risk-test-state.json'; .\.venv\Scripts\python.exe -m pytest`

Expected: all backend tests pass.

- [ ] **Step 4: Update project notes**

Add a `2026-07-11 自选股组合风险第一阶段` section with changed behavior, docs and verification results.
