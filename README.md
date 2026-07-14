# Stock Doctor

A-share stock diagnosis MVP with a FastAPI backend and React/Vite frontend.

## Project Layout

- `backend/`: FastAPI API, diagnosis services, persistence layer, tests
- `frontend/`: React workspace UI, API client, component tests

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
python -m pytest
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

## Frontend

```powershell
cd frontend
npm install
npm test -- --run
npm run build
npm run dev -- --host 127.0.0.1 --port 30080
```

Open `http://127.0.0.1:30080/`.

## Local State

Runtime state is intentionally ignored by Git:

- `backend/data/state.json`
- `backend/data/state.sqlite3`

Use the app's system storage export/import feature to back up and restore watchlist, reports, notes, and price alerts.

The default storage backend is JSON. To use SQLite:

```powershell
$env:STOCK_DOCTOR_STATE_BACKEND = "sqlite"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

## Data Providers

The default market data provider is the built-in mock provider. The app includes a connector health panel for staged real-data rollout.

To trial live quote and historical K-line data:

```powershell
cd backend
$env:STOCK_DOCTOR_DATA_PROVIDER = "eastmoney"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

The EastMoney adapter fetches A-share quotes, index rows, daily K-line history, quote-detail valuation fields, and best-effort fund-flow rows directly. It keeps mock data as a fallback and marks currently conservative fields such as growth or unavailable capital-flow details in the data trust panel.
When EastMoney throttles or disconnects, the adapter automatically falls back to Tencent quote/K-line endpoints for the current watchlist symbols.
Tencent quote detail is also used as a valuation fallback for PE, PB, and turnover when EastMoney quote-detail endpoints disconnect.
Sina money-flow rows are used as a secondary capital-flow fallback when the EastMoney fund-flow endpoint is temporarily unavailable, and the data trust panel marks this with `sina-capital-flow`.
The stock search API can also resolve a direct six-digit A-share code through the live quote fallback path, so users can type a code such as `600036`, add it to the watchlist, and run diagnosis even when it is not already in the default candidate pool.
If a local TongHuaShun stock-name table is available, the search API also uses it as a code/name index. This allows name queries such as `招商银行` to resolve to `600036` before fetching the live quote:

```powershell
$env:STOCK_DOCTOR_THS_STOCKNAME_PATHS = "D:\同花顺软件\同花顺\stockname\stockname_16_0.txt;D:\同花顺软件\同花顺\stockname\stockname_32_0.txt"
```

If a local TongDaXin `vipdoc` directory is available, it is used as a local daily K-line reference and fallback source:

```powershell
$env:STOCK_DOCTOR_TDX_VIPDOC_PATH = "E:\new_tdx64\vipdoc"
```

The data trust panel reports TongDaXin availability, latest local trading day, and the latest cross-check against the active historical K-line source.

To trial AKShare after installing the package:

```powershell
cd backend
pip install akshare
$env:STOCK_DOCTOR_DATA_PROVIDER = "akshare"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

The AKShare adapter remains available as an optional aggregation path and keeps the mock provider as a fallback while real A-share fields are normalized.

Tushare Pro is available as an optional finance/basic-info enhancement. The app reports whether the package/token prerequisites are ready without exposing the token value:

```powershell
$env:STOCK_DOCTOR_TUSHARE_TOKEN = "<your-token>"
```

Install `tushare` in the backend environment when you are ready to connect the finance/basic-info normalization layer. `STOCK_DOCTOR_DATA_PROVIDER=tushare` is accepted and safe to start today; the adapter can enrich stock name/industry, PE/PB/ROE/revenue growth/profit growth/EPS/gross margin/debt-to-assets, operating cash flow per share, cash-flow-to-profit, current ratio, quick ratio, and adjusted daily price history from Tushare Pro when package and token are present. Stock lists, quotes, and any failed Tushare calls continue to use the Mock fallback, and connector health reports the latest failed probe step without returning token values.

The workspace also includes a manual refresh job panel. Refresh jobs record provider, scope, status, duration, and covered stock counts so the same history can later back scheduled real-data updates.

The connector panel also shows data freshness: latest successful refresh time, refresh age, covered stock count, coverage rate, and the recommended next action.

The system area includes a runtime configuration panel backed by `/api/v1/system/runtime-config`. It shows the active provider, provider options, request timeout, cache TTL, freshness threshold, and local TongDaXin/TongHuaShun path availability. These settings are read-only in the UI; update environment variables and restart the backend to change them.
The same panel shows whether optional secret-backed integrations such as Tushare Pro have their environment variables configured, but it never returns secret values.

Optional runtime knobs for real-data trials:

```powershell
$env:STOCK_DOCTOR_DATA_REQUEST_TIMEOUT_SECONDS = "8"
$env:STOCK_DOCTOR_DATA_CACHE_TTL_SECONDS = "300"
$env:STOCK_DOCTOR_DATA_FRESHNESS_STALE_AFTER_MINUTES = "30"
$env:STOCK_DOCTOR_TDX_VIPDOC_PATH = "E:\new_tdx64\vipdoc"
```

These values are returned by `/api/v1/system/data-connectors` and `/api/v1/system/runtime-config`, then displayed in the data trust/runtime panels so the current real-data operating assumptions are visible before diagnosis or backtest decisions.

JSON, HTML, and Markdown research exports include connector health, cache telemetry, stock-level data quality checks, runtime settings, and local path status so reports remain auditable outside the app. HTML and Markdown exports also include a conclusion page and fixed risk disclosure; the HTML export includes a printable cover and page-break styles, and the app toolbar can open the printable report directly for browser "print to PDF" workflows. Saved report history entries can also be exported as JSON, HTML, or Markdown archives with the saved diagnosis and data-quality snapshot.
