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

To trial AKShare after installing the package:

```powershell
cd backend
pip install akshare
$env:STOCK_DOCTOR_DATA_PROVIDER = "akshare"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

The AKShare adapter keeps the mock provider as a fallback while real A-share fields are normalized.

The workspace also includes a manual refresh job panel. Refresh jobs record provider, scope, status, duration, and covered stock counts so the same history can later back scheduled real-data updates.

The connector panel also shows data freshness: latest successful refresh time, refresh age, covered stock count, coverage rate, and the recommended next action.
