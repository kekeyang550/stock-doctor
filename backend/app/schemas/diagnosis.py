from typing import Any

from pydantic import BaseModel, Field


class StockSummary(BaseModel):
    symbol: str
    name: str
    industry: str
    last_price: float
    change_pct: float


class WatchlistRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)


class ReportRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    horizon: str = Field(default="swing", pattern="^(intraday|swing|position)$")


class ResearchNoteRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    body: str = Field(min_length=1, max_length=1000)


class PriceAlertRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    target_price: float = Field(gt=0)
    direction: str = Field(pattern="^(above|below)$")
    label: str = Field(min_length=1, max_length=40)


class MarketOverview(BaseModel):
    as_of: str
    index_name: str
    index_level: float
    index_change_pct: float
    advancing: int
    declining: int
    hot_industries: list[str]
    risk_notes: list[str]


class TechnicalSnapshot(BaseModel):
    ma5: float
    ma20: float
    ma60: float
    rsi14: float = Field(ge=0, le=100)
    macd: float
    volume_ratio: float


class FundamentalSnapshot(BaseModel):
    pe_ttm: float
    pb: float
    roe: float
    revenue_growth: float
    profit_growth: float
    industry_pe_percentile: float = Field(ge=0, le=100)


class CapitalSnapshot(BaseModel):
    main_inflow_million: float
    northbound_inflow_million: float
    turnover_rate: float


class RiskSnapshot(BaseModel):
    pledge_ratio: float
    unlock_days: int | None = None
    st_flag: bool = False
    limit_up_streak: int = 0


class StockSnapshot(StockSummary):
    as_of: str
    technical: TechnicalSnapshot
    fundamental: FundamentalSnapshot
    capital: CapitalSnapshot
    risk: RiskSnapshot


class ScoreBreakdown(BaseModel):
    technical: int
    valuation: int
    capital: int
    risk: int
    total: int


class EvidenceItem(BaseModel):
    label: str
    value: str
    interpretation: str
    polarity: str = Field(pattern="^(positive|neutral|negative)$")


class ChecklistItem(BaseModel):
    id: str
    title: str
    detail: str
    status: str = Field(pattern="^(pending|watch|done)$")
    priority: str = Field(pattern="^(high|medium|low)$")


class DiagnosisResponse(BaseModel):
    symbol: str
    name: str
    industry: str
    as_of: str
    horizon: str
    verdict: str
    rating: str
    score: ScoreBreakdown
    key_levels: dict[str, float]
    evidence: list[EvidenceItem]
    checklist: list[ChecklistItem]
    risks: list[str]
    summary: str
    disclaimer: str


class ReportRecord(BaseModel):
    id: str
    generated_at: str
    diagnosis: DiagnosisResponse


class ResearchNote(BaseModel):
    id: str
    symbol: str
    body: str
    created_at: str


class PriceAlert(BaseModel):
    id: str
    symbol: str
    name: str
    target_price: float
    direction: str = Field(pattern="^(above|below)$")
    label: str
    last_price: float
    distance_pct: float
    status: str = Field(pattern="^(triggered|watching)$")
    created_at: str


class RankedDiagnosis(BaseModel):
    symbol: str
    name: str
    industry: str
    rating: str
    verdict: str
    total_score: int
    technical_score: int
    capital_score: int
    risk_score: int
    change_pct: float
    primary_risk: str


class ScreenCandidate(BaseModel):
    symbol: str
    name: str
    industry: str
    preset: str
    total_score: int
    change_pct: float
    rating: str
    reason: str
    risk_note: str


class AlertItem(BaseModel):
    id: str
    symbol: str
    name: str
    industry: str
    severity: str = Field(pattern="^(high|medium|low)$")
    category: str
    title: str
    message: str
    evidence: str
    score: int
    as_of: str


class TimelineEvent(BaseModel):
    id: str
    symbol: str
    name: str
    industry: str
    event_date: str
    due_date: str
    severity: str = Field(pattern="^(high|medium|low)$")
    category: str
    title: str
    detail: str
    trigger: str
    status: str = Field(pattern="^(open|watching)$")


class IndustryExposure(BaseModel):
    industry: str
    count: int


class WatchlistSummary(BaseModel):
    as_of: str
    stock_count: int
    average_score: float
    strong_count: int
    high_alert_count: int
    top_stock: RankedDiagnosis | None
    highest_risk_alert: AlertItem | None
    industry_exposure: list[IndustryExposure]


class IndustryHeatItem(BaseModel):
    industry: str
    stock_count: int
    average_score: float
    average_change_pct: float
    high_alert_count: int
    top_symbol: str
    top_name: str
    top_score: int
    heat_level: str = Field(pattern="^(hot|warm|neutral|cool)$")


class RiskExposureItem(BaseModel):
    category: str
    event_count: int
    high_count: int
    medium_count: int
    low_count: int
    severity_score: int
    top_symbol: str
    top_name: str
    top_title: str


class TrendPoint(BaseModel):
    date: str
    close: float
    ma5: float
    ma20: float
    volume_ratio: float


class TrendSeries(BaseModel):
    symbol: str
    name: str
    as_of: str
    points: list[TrendPoint]
    change_30d_pct: float
    high: float
    low: float


class PeerComparisonItem(BaseModel):
    symbol: str
    name: str
    industry: str
    total_score: int
    change_pct: float
    pe_ttm: float
    roe: float
    main_inflow_million: float
    relative_label: str


class PeerComparisonResponse(BaseModel):
    symbol: str
    name: str
    industry: str
    sample_size: int
    items: list[PeerComparisonItem]


class StorageCollectionStat(BaseModel):
    key: str
    label: str
    count: int


class StorageStatus(BaseModel):
    backend: str
    status: str
    path: str
    collections: list[StorageCollectionStat]
    total_records: int
    migration_hint: str


class StorageExport(BaseModel):
    exported_at: str
    backend: str
    watchlist: list[str]
    reports: list[dict[str, Any]]
    notes: list[dict[str, Any]]
    price_alerts: list[dict[str, Any]]
