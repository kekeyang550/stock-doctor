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
