from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.diagnosis import (
    AlertItem,
    DataConnectorHealth,
    DataRefreshJob,
    DataRefreshJobRequest,
    DiagnosisResponse,
    IndustryHeatItem,
    MarketOverview,
    PeerComparisonResponse,
    PriceAlert,
    PriceAlertRequest,
    ResearchNote,
    ResearchNoteRequest,
    RiskExposureItem,
    RankedDiagnosis,
    ReportRecord,
    ReportRequest,
    ScreenCandidate,
    StockSummary,
    StockSnapshot,
    StorageCollectionStat,
    StorageExport,
    StorageImportPreview,
    StorageImportRequest,
    StorageImportResult,
    StorageStatus,
    TimelineEvent,
    TrendSeries,
    WatchlistRequest,
    WatchlistSummary,
    IndustryExposure,
)
from app.services.alerts import AlertEngine
from app.services.data_connectors import DataConnectorHealthService
from app.services.diagnosis import DiagnosisEngine
from app.services.industry_heat import IndustryHeatService
from app.services.notes import ResearchNoteService
from app.services.peers import PeerComparisonService
from app.services.price_alerts import PriceAlertService
from app.services.provider_factory import create_market_data_provider
from app.services.reports import ReportService
from app.services.refresh_jobs import DataRefreshJobService
from app.services.risk_exposure import RiskExposureService
from app.services.screener import ScreenerService
from app.services.storage import SQLiteStateStore, StateStore, create_state_store
from app.services.timeline import TimelineService
from app.services.trend import TrendService


router = APIRouter()
data_provider = create_market_data_provider()
diagnosis_engine = DiagnosisEngine()
report_service = ReportService()
alert_engine = AlertEngine()
trend_service = TrendService()
peer_service = PeerComparisonService(diagnosis_engine)
timeline_service = TimelineService()
note_service = ResearchNoteService()
industry_heat_service = IndustryHeatService()
risk_exposure_service = RiskExposureService()
screener_service = ScreenerService()
price_alert_service = PriceAlertService()
data_connector_health_service = DataConnectorHealthService()
refresh_job_service = DataRefreshJobService()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/stocks", response_model=list[StockSummary])
async def list_stocks() -> list[StockSummary]:
    return data_provider.list_stocks()


@router.get("/market/overview", response_model=MarketOverview)
async def market_overview() -> MarketOverview:
    return data_provider.get_market_overview()


@router.get("/data-sources")
async def data_sources() -> list[dict[str, str]]:
    return data_provider.get_data_sources()


@router.get("/system/data-connectors", response_model=DataConnectorHealth)
async def system_data_connectors() -> DataConnectorHealth:
    return data_connector_health_service.build_health()


@router.get("/system/refresh-jobs", response_model=list[DataRefreshJob])
async def list_refresh_jobs(limit: int = Query(default=10, ge=1, le=50)) -> list[DataRefreshJob]:
    return refresh_job_service.list_jobs(limit=limit)


@router.post("/system/refresh-jobs", response_model=DataRefreshJob, status_code=status.HTTP_201_CREATED)
async def run_refresh_job(request: DataRefreshJobRequest) -> DataRefreshJob:
    return refresh_job_service.run_refresh(provider=data_provider, scope=request.scope)


@router.get("/system/storage", response_model=StorageStatus)
async def system_storage() -> StorageStatus:
    return _storage_status(create_state_store())


@router.get("/system/export", response_model=StorageExport)
async def system_export() -> StorageExport:
    store = create_state_store()
    backend = "sqlite" if isinstance(store, SQLiteStateStore) else "json"
    return StorageExport(
        exported_at=datetime.now(timezone.utc).isoformat(),
        backend=backend,
        watchlist=store.load_watchlist([]),
        reports=store.load_reports(),
        notes=store.load_notes(),
        price_alerts=store.load_price_alerts(),
    )


@router.post("/system/import/preview", response_model=StorageImportPreview)
async def system_import_preview(request: StorageImportRequest) -> StorageImportPreview:
    return _build_import_preview(request)


@router.post("/system/import", response_model=StorageImportResult)
async def system_import(request: StorageImportRequest) -> StorageImportResult:
    preview = _build_import_preview(request)
    if not preview.can_import:
        raise HTTPException(status_code=400, detail="Import payload cannot be applied")

    valid_watchlist = _valid_watchlist_symbols(request.watchlist)[0]
    store = create_state_store()
    store.save_watchlist(valid_watchlist)
    store.save_reports(request.reports[:100])
    store.save_notes(request.notes[:200])
    store.save_price_alerts(request.price_alerts[:200])
    data_provider.replace_watchlist(valid_watchlist)

    return StorageImportResult(
        **preview.model_dump(),
        imported_at=datetime.now(timezone.utc).isoformat(),
        status="imported",
        storage=_storage_status(store),
    )


@router.get("/watchlist", response_model=list[StockSummary])
async def get_watchlist() -> list[StockSummary]:
    return data_provider.get_watchlist()


@router.get("/watchlist/summary", response_model=WatchlistSummary)
async def watchlist_summary(
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
) -> WatchlistSummary:
    stocks = data_provider.get_watchlist()
    ranked: list[RankedDiagnosis] = []
    alerts: list[AlertItem] = []
    exposure: dict[str, int] = {}
    as_of = ""

    for stock in stocks:
        snapshot = data_provider.get_snapshot(stock.symbol)
        if snapshot is None:
            continue
        as_of = snapshot.as_of
        exposure[snapshot.industry] = exposure.get(snapshot.industry, 0) + 1
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        ranked.append(
            RankedDiagnosis(
                symbol=diagnosis.symbol,
                name=diagnosis.name,
                industry=diagnosis.industry,
                rating=diagnosis.rating,
                verdict=diagnosis.verdict,
                total_score=diagnosis.score.total,
                technical_score=diagnosis.score.technical,
                capital_score=diagnosis.score.capital,
                risk_score=diagnosis.score.risk,
                change_pct=stock.change_pct,
                primary_risk=diagnosis.risks[0],
            )
        )
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))

    ranked_sorted = sorted(ranked, key=lambda item: item.total_score, reverse=True)
    high_alerts = [item for item in alerts if item.severity == "high"]
    alert_rank = {"high": 3, "medium": 2, "low": 1}
    alerts_sorted = sorted(alerts, key=lambda item: (alert_rank[item.severity], item.score), reverse=True)

    return WatchlistSummary(
        as_of=as_of,
        stock_count=len(ranked),
        average_score=round(sum(item.total_score for item in ranked) / len(ranked), 1) if ranked else 0,
        strong_count=len([item for item in ranked if item.total_score >= 78]),
        high_alert_count=len(high_alerts),
        top_stock=ranked_sorted[0] if ranked_sorted else None,
        highest_risk_alert=alerts_sorted[0] if alerts_sorted else None,
        industry_exposure=[
            IndustryExposure(industry=industry, count=count)
            for industry, count in sorted(exposure.items(), key=lambda item: item[1], reverse=True)
        ],
    )


@router.post("/watchlist", response_model=list[StockSummary], status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(request: WatchlistRequest) -> list[StockSummary]:
    if not data_provider.add_to_watchlist(request.symbol):
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    return data_provider.get_watchlist()


@router.delete("/watchlist/{symbol}", response_model=list[StockSummary])
async def remove_from_watchlist(symbol: str) -> list[StockSummary]:
    data_provider.remove_from_watchlist(symbol)
    return data_provider.get_watchlist()


@router.get("/reports", response_model=list[ReportRecord])
async def list_reports(limit: int = Query(default=20, ge=1, le=100)) -> list[ReportRecord]:
    return report_service.list_reports(limit=limit)


@router.post("/reports", response_model=ReportRecord, status_code=status.HTTP_201_CREATED)
async def create_report(request: ReportRequest) -> ReportRecord:
    snapshot = data_provider.get_snapshot(request.symbol)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=request.horizon)
    return report_service.save_report(diagnosis)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: str) -> None:
    if not report_service.delete_report(report_id):
        raise HTTPException(status_code=404, detail="Report not found")


@router.get("/notes", response_model=list[ResearchNote])
async def list_notes(
    symbol: str | None = Query(default=None, min_length=1, max_length=12),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[ResearchNote]:
    return note_service.list_notes(symbol=symbol, limit=limit)


@router.post("/notes", response_model=ResearchNote, status_code=status.HTTP_201_CREATED)
async def add_note(request: ResearchNoteRequest) -> ResearchNote:
    if data_provider.get_snapshot(request.symbol) is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    return note_service.add_note(symbol=request.symbol, body=request.body)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str) -> None:
    if not note_service.delete_note(note_id):
        raise HTTPException(status_code=404, detail="Note not found")


@router.get("/price-alerts", response_model=list[PriceAlert])
async def list_price_alerts(
    symbol: str | None = Query(default=None, min_length=1, max_length=12),
) -> list[PriceAlert]:
    snapshots = {snapshot.symbol: snapshot for snapshot in _all_snapshots()}
    return price_alert_service.list_alerts(snapshots=snapshots, symbol=symbol)


@router.post("/price-alerts", response_model=PriceAlert, status_code=status.HTTP_201_CREATED)
async def add_price_alert(request: PriceAlertRequest) -> PriceAlert:
    snapshot = data_provider.get_snapshot(request.symbol)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    return price_alert_service.add_alert(
        snapshot=snapshot,
        target_price=request.target_price,
        direction=request.direction,
        label=request.label,
    )


@router.delete("/price-alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_price_alert(alert_id: str) -> None:
    if not price_alert_service.delete_alert(alert_id):
        raise HTTPException(status_code=404, detail="Price alert not found")


@router.get("/rankings", response_model=list[RankedDiagnosis])
async def rankings(
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
    sort: str = Query(default="total", pattern="^(total|technical|capital|risk|change)$"),
    limit: int = Query(default=10, ge=1, le=50),
) -> list[RankedDiagnosis]:
    ranked = _ranked_diagnoses(horizon)
    sort_key = {
        "total": lambda item: item.total_score,
        "technical": lambda item: item.technical_score,
        "capital": lambda item: item.capital_score,
        "risk": lambda item: item.risk_score,
        "change": lambda item: item.change_pct,
    }[sort]
    return sorted(ranked, key=sort_key, reverse=True)[:limit]


@router.get("/industries/heat", response_model=list[IndustryHeatItem])
async def industry_heat(
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
) -> list[IndustryHeatItem]:
    snapshots = _all_snapshots()
    ranked = _ranked_diagnoses(horizon)
    alerts: list[AlertItem] = []
    for snapshot in snapshots:
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        alerts.extend(alert_engine.build_alerts(snapshot, diagnosis))
    return industry_heat_service.build_heatmap(snapshots=snapshots, ranked=ranked, alerts=alerts)


@router.get("/alerts", response_model=list[AlertItem])
async def alerts(
    scope: str = Query(default="watchlist", pattern="^(watchlist|all)$"),
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[AlertItem]:
    stocks = data_provider.get_watchlist() if scope == "watchlist" else data_provider.list_stocks()
    items: list[AlertItem] = []
    for stock in stocks:
        snapshot = data_provider.get_snapshot(stock.symbol)
        if snapshot is None:
            continue
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        items.extend(alert_engine.build_alerts(snapshot, diagnosis))

    severity_rank = {"high": 3, "medium": 2, "low": 1}
    return sorted(items, key=lambda item: (severity_rank[item.severity], item.score), reverse=True)[:limit]


@router.get("/risk/exposure", response_model=list[RiskExposureItem])
async def risk_exposure(
    scope: str = Query(default="watchlist", pattern="^(watchlist|all)$"),
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
) -> list[RiskExposureItem]:
    stocks = data_provider.get_watchlist() if scope == "watchlist" else data_provider.list_stocks()
    items: list[AlertItem] = []
    for stock in stocks:
        snapshot = data_provider.get_snapshot(stock.symbol)
        if snapshot is None:
            continue
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        items.extend(alert_engine.build_alerts(snapshot, diagnosis))
    return risk_exposure_service.summarize(items)


@router.get("/screeners/{preset}", response_model=list[ScreenCandidate])
async def screener(
    preset: str,
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
    limit: int = Query(default=12, ge=1, le=50),
) -> list[ScreenCandidate]:
    if preset not in {"strong", "value", "capital-risk"}:
        raise HTTPException(status_code=404, detail="Screener preset not found")
    snapshots = _all_snapshots()
    diagnoses = [diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon) for snapshot in snapshots]
    return screener_service.screen(snapshots=snapshots, diagnoses=diagnoses, preset=preset)[:limit]


@router.get("/timeline", response_model=list[TimelineEvent])
async def timeline(
    scope: str = Query(default="watchlist", pattern="^(watchlist|all)$"),
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TimelineEvent]:
    stocks = data_provider.get_watchlist() if scope == "watchlist" else data_provider.list_stocks()
    events: list[TimelineEvent] = []
    for stock in stocks:
        snapshot = data_provider.get_snapshot(stock.symbol)
        if snapshot is None:
            continue
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        stock_alerts = alert_engine.build_alerts(snapshot, diagnosis)
        events.extend(timeline_service.build_events(snapshot, diagnosis, stock_alerts))

    severity_rank = {"high": 3, "medium": 2, "low": 1}
    return sorted(events, key=lambda item: (-severity_rank[item.severity], item.due_date, item.symbol))[:limit]


@router.get("/trend/{symbol}", response_model=TrendSeries)
async def trend_series(
    symbol: str,
    days: int = Query(default=30, ge=5, le=60),
) -> TrendSeries:
    snapshot = data_provider.get_snapshot(symbol)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    return trend_service.build_series(snapshot=snapshot, days=days)


@router.get("/peers/{symbol}", response_model=PeerComparisonResponse)
async def peer_comparison(
    symbol: str,
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
    limit: int = Query(default=6, ge=2, le=20),
) -> PeerComparisonResponse:
    snapshot = data_provider.get_snapshot(symbol)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    candidates = [
        candidate
        for stock in data_provider.list_stocks()
        if (candidate := data_provider.get_snapshot(stock.symbol)) is not None
    ]
    return peer_service.compare(target=snapshot, candidates=candidates, horizon=horizon, limit=limit)


@router.get("/diagnosis/{symbol}", response_model=DiagnosisResponse)
async def diagnose_stock(
    symbol: str,
    horizon: str = Query(default="swing", pattern="^(intraday|swing|position)$"),
) -> DiagnosisResponse:
    snapshot = data_provider.get_snapshot(symbol)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Stock symbol not found")
    return diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)


def _all_snapshots() -> list[StockSnapshot]:
    return [
        snapshot
        for stock in data_provider.list_stocks()
        if (snapshot := data_provider.get_snapshot(stock.symbol)) is not None
    ]


def _ranked_diagnoses(horizon: str) -> list[RankedDiagnosis]:
    ranked: list[RankedDiagnosis] = []
    for stock in data_provider.list_stocks():
        snapshot = data_provider.get_snapshot(stock.symbol)
        if snapshot is None:
            continue
        diagnosis = diagnosis_engine.diagnose(snapshot=snapshot, horizon=horizon)
        ranked.append(
            RankedDiagnosis(
                symbol=diagnosis.symbol,
                name=diagnosis.name,
                industry=diagnosis.industry,
                rating=diagnosis.rating,
                verdict=diagnosis.verdict,
                total_score=diagnosis.score.total,
                technical_score=diagnosis.score.technical,
                capital_score=diagnosis.score.capital,
                risk_score=diagnosis.score.risk,
                change_pct=stock.change_pct,
                primary_risk=diagnosis.risks[0],
            )
        )
    return ranked


def _storage_status(store: StateStore) -> StorageStatus:
    collections = [
        StorageCollectionStat(key="watchlist", label="自选股", count=len(store.load_watchlist([]))),
        StorageCollectionStat(key="reports", label="诊断报告", count=len(store.load_reports())),
        StorageCollectionStat(key="notes", label="研究笔记", count=len(store.load_notes())),
        StorageCollectionStat(key="price_alerts", label="价位提醒", count=len(store.load_price_alerts())),
    ]
    backend = "sqlite" if isinstance(store, SQLiteStateStore) else "json"
    return StorageStatus(
        backend=backend,
        status="online",
        path=str(store.path),
        collections=collections,
        total_records=sum(item.count for item in collections),
        migration_hint="可通过 STOCK_DOCTOR_STATE_BACKEND=sqlite 切换到 SQLite 持久化。",
    )


def _build_import_preview(request: StorageImportRequest) -> StorageImportPreview:
    valid_watchlist, unknown_watchlist = _valid_watchlist_symbols(request.watchlist)
    capped_reports = request.reports[:100]
    capped_notes = request.notes[:200]
    capped_alerts = request.price_alerts[:200]
    skipped_records = (
        len(request.watchlist)
        - len(valid_watchlist)
        + len(request.reports)
        - len(capped_reports)
        + len(request.notes)
        - len(capped_notes)
        + len(request.price_alerts)
        - len(capped_alerts)
    )
    warnings = []
    if unknown_watchlist:
        warnings.append(f"已忽略当前样例库暂不支持的自选股：{', '.join(unknown_watchlist[:8])}")
    if len(request.reports) > len(capped_reports):
        warnings.append("诊断报告超过 100 条，导入时只保留最新 100 条。")
    if len(request.notes) > len(capped_notes):
        warnings.append("研究笔记超过 200 条，导入时只保留最新 200 条。")
    if len(request.price_alerts) > len(capped_alerts):
        warnings.append("价位提醒超过 200 条，导入时只保留最新 200 条。")

    collections = [
        StorageCollectionStat(key="watchlist", label="自选股", count=len(valid_watchlist)),
        StorageCollectionStat(key="reports", label="诊断报告", count=len(capped_reports)),
        StorageCollectionStat(key="notes", label="研究笔记", count=len(capped_notes)),
        StorageCollectionStat(key="price_alerts", label="价位提醒", count=len(capped_alerts)),
    ]
    total_records = sum(item.count for item in collections)
    return StorageImportPreview(
        mode=request.mode,
        can_import=total_records > 0,
        collections=collections,
        total_records=total_records,
        warnings=warnings,
        skipped_records=skipped_records,
    )


def _valid_watchlist_symbols(symbols: list[str]) -> tuple[list[str], list[str]]:
    valid = []
    unknown = []
    for symbol in symbols:
        normalized = symbol.strip().upper()
        if not normalized:
            continue
        if data_provider.get_snapshot(normalized) is None:
            if normalized not in unknown:
                unknown.append(normalized)
            continue
        if normalized not in valid:
            valid.append(normalized)
    return valid, unknown
