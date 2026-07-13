from typing import Any

from pydantic import BaseModel, Field


class StockSummary(BaseModel):
    symbol: str
    name: str
    industry: str
    last_price: float
    change_pct: float


class StockSearchResult(StockSummary):
    in_watchlist: bool
    diagnosable: bool
    quality_status: str = Field(pattern="^(pass|warn|fail|unknown)$")
    quality_score: int | None = Field(default=None, ge=0, le=100)
    match_reason: str


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


class HistoricalPriceBar(BaseModel):
    date: str
    close: float
    volume: float = 0


class DataConnectorStatus(BaseModel):
    name: str
    status: str = Field(pattern="^(online|fallback|missing-package|planned|error)$")
    active: bool
    role: str
    package: str | None = None
    package_installed: bool
    configured_provider: str
    latency_ms: int | None = None
    last_checked_at: str
    message: str
    next_action: str


class DataConnectorRuntimeConfig(BaseModel):
    request_timeout_seconds: int
    cache_ttl_seconds: int
    freshness_stale_after_minutes: int


class ProviderCacheBucketStatus(BaseModel):
    key: str
    label: str
    entries: int = Field(ge=0)
    active_entries: int = Field(ge=0)
    expired_entries: int = Field(ge=0)
    nearest_expires_in_seconds: int = Field(ge=0)
    hit_count: int = Field(default=0, ge=0)
    miss_count: int = Field(default=0, ge=0)
    hit_rate_pct: float = Field(default=0, ge=0, le=100)
    status: str = Field(pattern="^(empty|active|partial|expired)$")


class ProviderCacheStatus(BaseModel):
    ttl_seconds: int = Field(ge=0)
    generated_at: str
    buckets: list[ProviderCacheBucketStatus]


class DataConnectorHealth(BaseModel):
    active_provider: str
    fallback_provider: str
    runtime_config: DataConnectorRuntimeConfig
    cache_status: ProviderCacheStatus | None = None
    connectors: list[DataConnectorStatus]


class DataRefreshJob(BaseModel):
    id: str
    provider: str
    status: str = Field(pattern="^(success|failed)$")
    started_at: str
    finished_at: str
    duration_ms: int
    stock_count: int
    watchlist_count: int
    source_count: int
    message: str


class DataRefreshJobRequest(BaseModel):
    scope: str = Field(default="all", pattern="^(all|watchlist)$")


class DataFreshnessStatus(BaseModel):
    status: str = Field(pattern="^(unknown|fresh|stale|expired)$")
    provider: str
    last_success_at: str | None
    age_minutes: int | None
    stale_after_minutes: int
    expected_stock_count: int
    last_stock_count: int
    coverage_pct: float
    message: str
    next_action: str


class SystemReadinessCheck(BaseModel):
    key: str
    label: str
    status: str = Field(pattern="^(pass|warn|fail)$")
    detail: str
    next_action: str


class SystemReadiness(BaseModel):
    status: str = Field(pattern="^(pass|warn|fail)$")
    score: int = Field(ge=0, le=100)
    summary: str
    checks: list[SystemReadinessCheck]


class DataQualityCheck(BaseModel):
    key: str
    label: str
    status: str = Field(pattern="^(pass|warn|fail)$")
    detail: str
    impact: str


class DataQualityReport(BaseModel):
    symbol: str
    name: str
    as_of: str
    status: str = Field(pattern="^(pass|warn|fail)$")
    score: int = Field(ge=0, le=100)
    coverage_pct: float
    issue_count: int
    summary: str
    checks: list[DataQualityCheck]


class DataQualityOverview(BaseModel):
    scope: str = Field(pattern="^(watchlist|all)$")
    stock_count: int
    average_score: float
    pass_count: int
    warn_count: int
    fail_count: int
    lowest_report: DataQualityReport | None
    reports: list[DataQualityReport]


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
    data_sources: list[str] = Field(default_factory=list)
    conservative_fields: list[str] = Field(default_factory=list)


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


class ThesisEvidence(BaseModel):
    label: str
    side: str = Field(pattern="^(bull|bear|neutral)$")
    weight: int = Field(ge=0, le=100)
    detail: str


class DiagnosisThesis(BaseModel):
    symbol: str
    name: str
    horizon: str
    stance: str = Field(pattern="^(bullish|balanced|defensive)$")
    confidence: int = Field(ge=0, le=100)
    bull_case: str
    bear_case: str
    trigger: str
    invalidation: str
    evidence: list[ThesisEvidence]
    next_checks: list[str]


class DiagnosisChangeItem(BaseModel):
    key: str
    label: str
    direction: str = Field(pattern="^(up|down|flat|changed)$")
    detail: str


class DiagnosisScoreTrendPoint(BaseModel):
    label: str
    generated_at: str
    total: int
    technical: int
    valuation: int
    capital: int
    risk: int
    rating: str


class DiagnosisRatingTransition(BaseModel):
    previous: str | None
    current: str
    changed: bool
    detail: str


class DiagnosisRiskShift(BaseModel):
    direction: str = Field(pattern="^(improved|worsened|flat|baseline)$")
    delta: int
    label: str
    detail: str


class DiagnosisChangeDriver(BaseModel):
    metric: str
    label: str
    delta: int
    direction: str = Field(pattern="^(up|down|flat|changed)$")
    detail: str


class DiagnosisTrendInsight(BaseModel):
    sample_count: int
    score_direction: str = Field(pattern="^(up|down|flat|mixed|baseline)$")
    risk_direction: str = Field(pattern="^(improved|worsened|flat|mixed|baseline)$")
    rating_change_count: int
    total_high: int
    total_low: int
    risk_high: int
    risk_low: int
    summary: str


class DiagnosisChangeReport(BaseModel):
    symbol: str
    name: str
    status: str = Field(pattern="^(baseline|improved|weakened|changed|flat)$")
    current_generated_at: str
    previous_generated_at: str | None
    score_delta: int
    technical_delta: int
    valuation_delta: int
    capital_delta: int
    risk_delta: int
    rating_changed: bool
    previous_rating: str | None
    current_rating: str
    summary: str
    changes: list[DiagnosisChangeItem]
    score_trend: list[DiagnosisScoreTrendPoint]
    rating_transition: DiagnosisRatingTransition
    risk_shift: DiagnosisRiskShift
    key_drivers: list[DiagnosisChangeDriver]
    trend_insight: DiagnosisTrendInsight | None = None


class ReviewActionItem(BaseModel):
    id: str
    title: str
    priority: str = Field(pattern="^(high|medium|low)$")
    category: str
    detail: str
    source: str
    status: str = Field(default="pending", pattern="^(pending|watching|done)$")


class ReviewActionStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|watching|done)$")


class ReviewActionPlan(BaseModel):
    symbol: str
    name: str
    horizon: str
    generated_at: str
    high_count: int
    medium_count: int
    low_count: int
    pending_count: int
    watching_count: int
    done_count: int
    items: list[ReviewActionItem]


class ReviewActionStockSummary(BaseModel):
    symbol: str
    name: str
    industry: str
    item_count: int
    high_count: int
    medium_count: int
    low_count: int
    top_priority: str = Field(pattern="^(high|medium|low)$")
    top_action: str
    top_detail: str


class ReviewActionOverview(BaseModel):
    scope: str = Field(pattern="^(watchlist|all)$")
    horizon: str
    stock_count: int
    high_count: int
    medium_count: int
    low_count: int
    pending_count: int
    watching_count: int
    done_count: int
    summaries: list[ReviewActionStockSummary]


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
    rule_tags: list[str] = Field(default_factory=list)
    positive_evidence: str = ""
    invalidation_risk: str = ""


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
    heat_score: int = Field(ge=0, le=100)
    average_score: float
    average_change_pct: float
    average_main_inflow_million: float
    high_alert_count: int
    top_symbol: str
    top_name: str
    top_score: int
    heat_level: str = Field(pattern="^(hot|warm|neutral|cool)$")
    momentum_label: str


class ConceptHeatItem(BaseModel):
    concept: str
    stock_count: int
    heat_score: int = Field(ge=0, le=100)
    average_change_pct: float
    average_main_inflow_million: float
    top_symbol: str
    top_name: str
    reason: str
    heat_level: str = Field(pattern="^(hot|warm|neutral|cool)$")


class MomentumSignalItem(BaseModel):
    symbol: str
    name: str
    industry: str
    signal_score: int = Field(ge=0, le=100)
    change_pct: float
    volume_ratio: float
    main_inflow_million: float
    signal_level: str = Field(pattern="^(limit-watch|surging|active|cooling)$")
    title: str
    reason: str


class HotspotBrief(BaseModel):
    status: str = Field(pattern="^(hot|warm|neutral|cool)$")
    summary: str
    top_industry: IndustryHeatItem | None
    top_concept: ConceptHeatItem | None
    top_signal: MomentumSignalItem | None
    focus_symbols: list[str]


class HotspotCandidate(BaseModel):
    symbol: str
    name: str
    industry: str
    concept: str
    heat_score: int = Field(ge=0, le=100)
    diagnosis_score: int
    signal_score: int
    change_pct: float
    main_inflow_million: float
    reason: str
    risk_note: str
    next_action: str


class HotspotReviewAction(BaseModel):
    id: str
    symbol: str
    name: str
    concept: str
    priority: str = Field(pattern="^(high|medium|low)$")
    title: str
    detail: str
    trigger: str
    check_window: str
    status: str = Field(default="pending", pattern="^(pending|watching|done)$")


class HotspotReviewPlan(BaseModel):
    horizon: str
    mode: str = Field(pattern="^(balanced|capital|momentum)$")
    generated_at: str
    candidate_count: int
    high_count: int
    medium_count: int
    low_count: int
    pending_count: int
    watching_count: int
    done_count: int
    actions: list[HotspotReviewAction]


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


class PortfolioRiskConcentration(BaseModel):
    top_industry: str
    top_industry_count: int
    top_industry_ratio: float
    industry_count: int


class PortfolioRiskDistribution(BaseModel):
    high_count: int
    medium_count: int
    low_count: int


class PortfolioIndustryExposure(BaseModel):
    industry: str
    stock_count: int
    weight_pct: float
    risk_score: float


class PortfolioRiskContribution(BaseModel):
    symbol: str
    name: str
    industry: str
    weight_pct: float
    risk_score: int
    contribution_score: float


class PortfolioRebalanceAction(BaseModel):
    symbol: str
    name: str
    industry: str
    current_weight_pct: float
    suggested_weight_pct: float
    delta_pct: float
    action: str = Field(pattern="^(reduce|hold|increase)$")
    priority: str = Field(pattern="^(high|medium|low)$")
    reason: str


class PortfolioRiskDriver(BaseModel):
    symbol: str
    name: str
    industry: str
    risk_score: int
    total_score: int
    alert_count: int
    primary_risk: str
    position_weight_pct: float = 0


class PortfolioPositionWeight(BaseModel):
    symbol: str
    name: str
    industry: str
    weight_pct: float


class PortfolioRiskReport(BaseModel):
    scope: str = Field(pattern="^(watchlist|all)$")
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    stock_count: int
    weight_mode: str = Field(default="equal", pattern="^(equal|custom)$")
    total_position_weight: float = 0
    average_total_score: float
    average_risk_score: float
    portfolio_risk_score: int
    risk_level: str = Field(pattern="^(low|medium|high)$")
    risk_label: str
    summary: str
    concentration: PortfolioRiskConcentration
    industry_exposures: list[PortfolioIndustryExposure] = Field(default_factory=list)
    distribution: PortfolioRiskDistribution
    risk_contributions: list[PortfolioRiskContribution] = Field(default_factory=list)
    rebalance_actions: list[PortfolioRebalanceAction] = Field(default_factory=list)
    top_drivers: list[PortfolioRiskDriver]
    suggestions: list[str]
    exposures: list[RiskExposureItem]
    positions: list[PortfolioPositionWeight] = Field(default_factory=list)


class StrategyBacktestTrade(BaseModel):
    symbol: str
    name: str
    industry: str
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    gross_return_pct: float = 0
    cost_pct: float = 0
    return_pct: float
    max_drawdown_pct: float
    holding_days: int
    price_source: str = Field(default="synthetic-trend", pattern="^(historical-kline|synthetic-trend)$")
    history_bar_count: int = 0
    history_last_date: str | None = None
    fallback_reason: str | None = None
    rule_tags: list[str]
    signal_reason: str


class StrategyBacktestCurvePoint(BaseModel):
    step: int
    label: str
    equity_pct: float
    drawdown_pct: float
    trade_return_pct: float = 0
    symbol: str | None = None
    name: str | None = None


class StrategyBacktestReport(BaseModel):
    preset: str
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    holding_days: int
    price_source: str = Field(default="synthetic-trend", pattern="^(historical-kline|synthetic-trend)$")
    history_bar_count: int = 0
    history_last_date: str | None = None
    fallback_reason: str | None = None
    fee_bps: float = 5
    slippage_bps: float = 10
    round_trip_cost_pct: float = 0.3
    sample_size: int
    match_count: int
    trade_count: int
    win_rate: float = Field(ge=0, le=100)
    average_return_pct: float
    best_return_pct: float
    worst_return_pct: float
    positive_trade_count: int = 0
    negative_trade_count: int = 0
    flat_trade_count: int = 0
    return_median_pct: float = 0
    return_p25_pct: float = 0
    return_p75_pct: float = 0
    max_drawdown_pct: float
    return_drawdown_ratio: float = 0
    return_volatility_pct: float = 0
    max_consecutive_loss_count: int = 0
    best_path_gain_pct: float = 0
    worst_path_loss_pct: float = 0
    stability_score: int = 0
    stability_label: str = "暂无评估"
    stability_notes: list[str] = Field(default_factory=list)
    sample_confidence_score: int = 0
    sample_confidence_label: str = "暂无评估"
    sample_confidence_notes: list[str] = Field(default_factory=list)
    summary: str
    rule_notes: list[str]
    equity_curve: list[StrategyBacktestCurvePoint] = Field(default_factory=list)
    trades: list[StrategyBacktestTrade]


class StrategyBacktestPeriodSummary(BaseModel):
    holding_days: int
    price_source: str = Field(default="synthetic-trend", pattern="^(historical-kline|synthetic-trend)$")
    history_bar_count: int = 0
    history_last_date: str | None = None
    fallback_reason: str | None = None
    trade_count: int
    win_rate: float = Field(ge=0, le=100)
    average_return_pct: float
    max_drawdown_pct: float
    return_drawdown_ratio: float = 0


class StrategyBacktestComparison(BaseModel):
    preset: str
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    sample_size: int
    match_count: int
    recommended_holding_days: int | None
    periods: list[StrategyBacktestPeriodSummary]
    recommendation_reason: str | None = None
    summary: str


class StrategyBacktestPresetSummary(BaseModel):
    preset: str
    label: str
    holding_days: int
    price_source: str = Field(default="synthetic-trend", pattern="^(historical-kline|synthetic-trend)$")
    history_bar_count: int = 0
    history_last_date: str | None = None
    fallback_reason: str | None = None
    match_count: int
    trade_count: int
    win_rate: float = Field(ge=0, le=100)
    average_return_pct: float
    max_drawdown_pct: float
    return_drawdown_ratio: float = 0


class StrategyBacktestPresetComparison(BaseModel):
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    holding_days: int
    sample_size: int
    recommended_preset: str | None
    presets: list[StrategyBacktestPresetSummary]
    recommendation_reason: str | None = None
    summary: str


class StrategyBacktestHistoryItem(BaseModel):
    id: str
    created_at: str
    preset: str
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    holding_days: int
    limit: int
    fee_bps: float
    slippage_bps: float
    price_source: str = Field(default="synthetic-trend", pattern="^(historical-kline|synthetic-trend)$")
    sample_confidence_score: int = 0
    sample_confidence_label: str = "暂无评估"
    stability_score: int = 0
    stability_label: str = "暂无评估"
    trade_count: int
    win_rate: float = Field(ge=0, le=100)
    average_return_pct: float
    max_drawdown_pct: float
    return_drawdown_ratio: float = 0


class StrategyBacktestHistoryComparison(BaseModel):
    preset: str
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    items: list[StrategyBacktestHistoryItem]
    latest: StrategyBacktestHistoryItem | None = None
    previous: StrategyBacktestHistoryItem | None = None
    average_return_delta: float = 0
    max_drawdown_delta: float = 0
    stability_score_delta: int = 0
    sample_confidence_delta: int = 0
    summary: str


class StrategyBacktestAction(BaseModel):
    id: str
    priority: str = Field(pattern="^(high|medium|low)$")
    category: str
    title: str
    detail: str
    trigger: str
    metric: str
    status: str = Field(default="pending", pattern="^(pending|watching|done)$")


class StrategyBacktestActionPlan(BaseModel):
    preset: str
    horizon: str = Field(pattern="^(intraday|swing|position)$")
    generated_at: str
    action_count: int
    high_count: int
    medium_count: int
    low_count: int
    pending_count: int
    watching_count: int
    done_count: int
    actions: list[StrategyBacktestAction]


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
    review_action_statuses: list[dict[str, Any]]
    strategy_backtests: list[dict[str, Any]]


class StorageImportRequest(BaseModel):
    mode: str = Field(default="replace", pattern="^replace$")
    watchlist: list[str] = Field(default_factory=list)
    reports: list[dict[str, Any]] = Field(default_factory=list)
    notes: list[dict[str, Any]] = Field(default_factory=list)
    price_alerts: list[dict[str, Any]] = Field(default_factory=list)
    review_action_statuses: list[dict[str, Any]] = Field(default_factory=list)
    strategy_backtests: list[dict[str, Any]] = Field(default_factory=list)


class StorageImportPreview(BaseModel):
    mode: str
    can_import: bool
    collections: list[StorageCollectionStat]
    total_records: int
    warnings: list[str]
    skipped_records: int


class StorageImportResult(StorageImportPreview):
    imported_at: str
    status: str
    storage: StorageStatus
