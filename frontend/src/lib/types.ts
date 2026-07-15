export type StockSummary = {
  symbol: string
  name: string
  industry: string
  last_price: number
  change_pct: number
}

export type StockSearchResult = StockSummary & {
  in_watchlist: boolean
  diagnosable: boolean
  quality_status: 'pass' | 'warn' | 'fail' | 'unknown'
  quality_score: number | null
  match_reason: string
}

export type MarketOverview = {
  as_of: string
  index_name: string
  index_level: number
  index_change_pct: number
  advancing: number
  declining: number
  hot_industries: string[]
  risk_notes: string[]
}

export type DataSource = {
  name: string
  status: string
  role: string
}

export type DataConnectorStatus = {
  name: string
  status: 'online' | 'fallback' | 'missing-package' | 'planned' | 'error'
  active: boolean
  role: string
  package: string | null
  package_installed: boolean
  configured_provider: string
  latency_ms: number | null
  last_checked_at: string
  message: string
  next_action: string
}

export type DataConnectorHealth = {
  active_provider: string
  fallback_provider: string
  runtime_config?: {
    request_timeout_seconds: number
    cache_ttl_seconds: number
    freshness_stale_after_minutes: number
  }
  cache_status?: {
    ttl_seconds: number
    generated_at: string
    buckets: ProviderCacheBucketStatus[]
  } | null
  connectors: DataConnectorStatus[]
}

export type RuntimePathSetting = {
  key: string
  label: string
  env_var: string
  value: string
  configured: boolean
  exists: boolean | null
  resolved_value?: string | null
  resolution_note?: string | null
}

export type RuntimeSecretSetting = {
  key: string
  label: string
  env_var: string
  configured: boolean
}

export type DataRuntimeSettings = {
  active_provider: string
  provider_options: string[]
  request_timeout_seconds: number
  cache_ttl_seconds: number
  freshness_stale_after_minutes: number
  paths: RuntimePathSetting[]
  secrets: RuntimeSecretSetting[]
  restart_required: boolean
}

export type TushareProbeStep = {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail' | 'skip'
  detail: string
  duration_ms?: number | null
  row_count?: number | null
}

export type TushareProbeResult = {
  symbol: string
  generated_at: string
  status: 'pass' | 'warn' | 'fail'
  package_installed: boolean
  token_configured: boolean
  duration_ms?: number | null
  message: string
  next_action: string
  steps: TushareProbeStep[]
}

export type TdxProbeCandidate = {
  path: string
  selected: boolean
  exists: boolean
  sample_count: number
  row_count: number
  latest_date: string | null
  stale: boolean
  note: string
}

export type TdxProbeResult = {
  configured_path: string
  resolved_path: string
  generated_at: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  next_action: string
  candidates: TdxProbeCandidate[]
}

export type ProviderCacheBucketStatus = {
  key: string
  label: string
  entries: number
  active_entries: number
  expired_entries: number
  nearest_expires_in_seconds: number
  hit_count?: number
  miss_count?: number
  hit_rate_pct?: number
  status: 'empty' | 'active' | 'partial' | 'expired'
}

export type DataRefreshJob = {
  id: string
  provider: string
  status: 'success' | 'failed'
  started_at: string
  finished_at: string
  duration_ms: number
  stock_count: number
  watchlist_count: number
  source_count: number
  message: string
}

export type DataFreshnessStatus = {
  status: 'unknown' | 'fresh' | 'stale' | 'expired'
  provider: string
  last_success_at: string | null
  age_minutes: number | null
  stale_after_minutes: number
  expected_stock_count: number
  last_stock_count: number
  coverage_pct: number
  message: string
  next_action: string
}

export type StorageCollectionStat = {
  key: string
  label: string
  count: number
}

export type StorageStatus = {
  backend: string
  status: string
  path: string
  collections: StorageCollectionStat[]
  total_records: number
  migration_hint: string
}

export type SystemReadinessCheck = {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  next_action: string
}

export type SystemReadiness = {
  status: 'pass' | 'warn' | 'fail'
  score: number
  summary: string
  checks: SystemReadinessCheck[]
}

export type DataQualityCheck = {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  impact: string
}

export type DataQualityReport = {
  symbol: string
  name: string
  as_of: string
  status: 'pass' | 'warn' | 'fail'
  score: number
  coverage_pct: number
  issue_count: number
  summary: string
  checks: DataQualityCheck[]
}

export type DataQualityOverview = {
  scope: 'watchlist' | 'all'
  stock_count: number
  average_score: number
  pass_count: number
  warn_count: number
  fail_count: number
  runtime_warn_count?: number
  fallback_warn_count?: number
  generic_warn_count?: number
  lowest_report: DataQualityReport | null
  reports: DataQualityReport[]
}

export type StorageExport = {
  exported_at: string
  backend: string
  watchlist: string[]
  reports: ReportRecord[]
  notes: ResearchNote[]
  price_alerts: PriceAlert[]
  review_action_statuses: Record<string, unknown>[]
  strategy_backtests: Record<string, unknown>[]
}

export type StorageImportPayload = {
  watchlist: string[]
  reports: ReportRecord[]
  notes: ResearchNote[]
  price_alerts: PriceAlert[]
  review_action_statuses: Record<string, unknown>[]
  strategy_backtests: Record<string, unknown>[]
}

export type StorageImportPreview = {
  mode: string
  can_import: boolean
  collections: StorageCollectionStat[]
  total_records: number
  warnings: string[]
  skipped_records: number
}

export type StorageImportResult = StorageImportPreview & {
  imported_at: string
  status: string
  storage: StorageStatus
}

export type ScoreBreakdown = {
  technical: number
  valuation: number
  capital: number
  risk: number
  total: number
}

export type EvidenceItem = {
  label: string
  value: string
  interpretation: string
  polarity: 'positive' | 'neutral' | 'negative'
}

export type ThesisEvidence = {
  label: string
  side: 'bull' | 'bear' | 'neutral'
  weight: number
  detail: string
}

export type DiagnosisThesis = {
  symbol: string
  name: string
  horizon: string
  stance: 'bullish' | 'balanced' | 'defensive'
  confidence: number
  bull_case: string
  bear_case: string
  trigger: string
  invalidation: string
  evidence: ThesisEvidence[]
  next_checks: string[]
}

export type DiagnosisChangeItem = {
  key: string
  label: string
  direction: 'up' | 'down' | 'flat' | 'changed'
  detail: string
}

export type DiagnosisScoreTrendPoint = {
  label: string
  generated_at: string
  total: number
  technical: number
  valuation: number
  capital: number
  risk: number
  rating: string
  quality_score?: number | null
  quality_status?: DataQualityReport['status'] | null
}

export type DiagnosisRatingTransition = {
  previous: string | null
  current: string
  changed: boolean
  detail: string
}

export type DiagnosisRiskShift = {
  direction: 'improved' | 'worsened' | 'flat' | 'baseline'
  delta: number
  label: string
  detail: string
}

export type DiagnosisChangeDriver = {
  metric: string
  label: string
  delta: number
  direction: 'up' | 'down' | 'flat' | 'changed'
  detail: string
}

export type DiagnosisTrendInsight = {
  sample_count: number
  score_direction: 'up' | 'down' | 'flat' | 'mixed' | 'baseline'
  risk_direction: 'improved' | 'worsened' | 'flat' | 'mixed' | 'baseline'
  rating_change_count: number
  total_high: number
  total_low: number
  risk_high: number
  risk_low: number
  summary: string
}

export type DiagnosisChangeReport = {
  symbol: string
  name: string
  status: 'baseline' | 'improved' | 'weakened' | 'changed' | 'flat'
  current_generated_at: string
  previous_generated_at: string | null
  score_delta: number
  technical_delta: number
  valuation_delta: number
  capital_delta: number
  risk_delta: number
  rating_changed: boolean
  previous_rating: string | null
  current_rating: string
  summary: string
  changes: DiagnosisChangeItem[]
  score_trend: DiagnosisScoreTrendPoint[]
  rating_transition: DiagnosisRatingTransition
  risk_shift: DiagnosisRiskShift
  key_drivers: DiagnosisChangeDriver[]
  trend_insight?: DiagnosisTrendInsight | null
}

export type ReviewActionItem = {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  category: string
  detail: string
  source: string
  status: 'pending' | 'watching' | 'done'
}

export type ReviewActionPlan = {
  symbol: string
  name: string
  horizon: string
  generated_at: string
  high_count: number
  medium_count: number
  low_count: number
  pending_count: number
  watching_count: number
  done_count: number
  items: ReviewActionItem[]
}

export type ReviewActionStockSummary = {
  symbol: string
  name: string
  industry: string
  item_count: number
  high_count: number
  medium_count: number
  low_count: number
  top_priority: 'high' | 'medium' | 'low'
  top_action: string
  top_detail: string
}

export type ReviewActionOverview = {
  scope: 'watchlist' | 'all'
  horizon: string
  stock_count: number
  high_count: number
  medium_count: number
  low_count: number
  pending_count: number
  watching_count: number
  done_count: number
  summaries: ReviewActionStockSummary[]
}

export type ChecklistItem = {
  id: string
  title: string
  detail: string
  status: 'pending' | 'watch' | 'done'
  priority: 'high' | 'medium' | 'low'
}

export type Diagnosis = {
  symbol: string
  name: string
  industry: string
  as_of: string
  horizon: string
  verdict: string
  rating: string
  score: ScoreBreakdown
  key_levels: Record<'support' | 'pivot' | 'pressure' | 'risk_line', number>
  evidence: EvidenceItem[]
  checklist: ChecklistItem[]
  risks: string[]
  summary: string
  disclaimer: string
}

export type ReportRecord = {
  id: string
  generated_at: string
  diagnosis: Diagnosis
  data_quality?: DataQualityReport | null
}

export type ResearchNote = {
  id: string
  symbol: string
  body: string
  created_at: string
}

export type PriceAlert = {
  id: string
  symbol: string
  name: string
  target_price: number
  direction: 'above' | 'below'
  label: string
  last_price: number
  distance_pct: number
  status: 'triggered' | 'watching'
  created_at: string
}

export type RankedDiagnosis = {
  symbol: string
  name: string
  industry: string
  rating: string
  verdict: string
  total_score: number
  technical_score: number
  capital_score: number
  risk_score: number
  change_pct: number
  primary_risk: string
}

export type ScreenCandidate = {
  symbol: string
  name: string
  industry: string
  preset: string
  total_score: number
  change_pct: number
  rating: string
  reason: string
  risk_note: string
  rule_tags?: string[]
  positive_evidence?: string
  invalidation_risk?: string
}

export type StrategyBacktestTrade = {
  symbol: string
  name: string
  industry: string
  entry_date: string
  exit_date: string
  entry_price: number
  exit_price: number
  gross_return_pct: number
  cost_pct: number
  return_pct: number
  max_drawdown_pct: number
  holding_days: number
  exit_reason: 'holding-period' | 'take-profit' | 'stop-loss' | 'ma20-break' | 'volume-fade' | 'score-weak'
  price_source: 'historical-kline' | 'synthetic-trend'
  history_bar_count: number
  history_last_date: string | null
  fallback_reason: string | null
  diagnosis_exit_score_at_exit?: number | null
  diagnosis_exit_note?: string | null
  rule_tags: string[]
  signal_reason: string
}

export type StrategyBacktestCurvePoint = {
  step: number
  label: string
  equity_pct: number
  drawdown_pct: number
  trade_return_pct: number
  symbol: string | null
  name: string | null
}

export type StrategyBacktestReport = {
  preset: string
  horizon: 'intraday' | 'swing' | 'position'
  holding_days: number
  price_source: 'historical-kline' | 'synthetic-trend'
  history_bar_count: number
  history_last_date: string | null
  fallback_reason: string | null
  fee_bps: number
  slippage_bps: number
  take_profit_pct: number
  stop_loss_pct: number
  exit_on_ma20_break: boolean
  exit_volume_ratio: number
  diagnosis_exit_score: number
  round_trip_cost_pct: number
  sample_size: number
  match_count: number
  trade_count: number
  win_rate: number
  average_return_pct: number
  best_return_pct: number
  worst_return_pct: number
  positive_trade_count?: number
  negative_trade_count?: number
  flat_trade_count?: number
  exit_reason_counts?: Record<StrategyBacktestTrade['exit_reason'], number>
  return_median_pct?: number
  return_p25_pct?: number
  return_p75_pct?: number
  max_drawdown_pct: number
  return_drawdown_ratio: number
  return_volatility_pct?: number
  max_consecutive_loss_count?: number
  best_path_gain_pct?: number
  worst_path_loss_pct?: number
  stability_score?: number
  stability_label?: string
  stability_notes?: string[]
  sample_confidence_score?: number
  sample_confidence_label?: string
  sample_confidence_notes?: string[]
  summary: string
  rule_notes: string[]
  equity_curve?: StrategyBacktestCurvePoint[]
  trades: StrategyBacktestTrade[]
}

export type StrategyBacktestPeriodSummary = {
  holding_days: number
  price_source: 'historical-kline' | 'synthetic-trend'
  history_bar_count: number
  history_last_date: string | null
  fallback_reason: string | null
  trade_count: number
  win_rate: number
  average_return_pct: number
  max_drawdown_pct: number
  return_drawdown_ratio: number
}

export type StrategyBacktestComparison = {
  preset: string
  horizon: 'intraday' | 'swing' | 'position'
  sample_size: number
  match_count: number
  recommended_holding_days: number | null
  periods: StrategyBacktestPeriodSummary[]
  recommendation_reason: string | null
  summary: string
}

export type StrategyBacktestPresetSummary = {
  preset: string
  label: string
  holding_days: number
  price_source: 'historical-kline' | 'synthetic-trend'
  history_bar_count: number
  history_last_date: string | null
  fallback_reason: string | null
  match_count: number
  trade_count: number
  win_rate: number
  average_return_pct: number
  max_drawdown_pct: number
  return_drawdown_ratio: number
}

export type StrategyBacktestPresetComparison = {
  horizon: 'intraday' | 'swing' | 'position'
  holding_days: number
  sample_size: number
  recommended_preset: string | null
  presets: StrategyBacktestPresetSummary[]
  recommendation_reason: string | null
  summary: string
}

export type StrategyBacktestHistoryItem = {
  id: string
  created_at: string
  preset: string
  horizon: 'intraday' | 'swing' | 'position'
  holding_days: number
  limit: number
  fee_bps: number
  slippage_bps: number
  take_profit_pct: number
  stop_loss_pct: number
  exit_on_ma20_break: boolean
  exit_volume_ratio: number
  diagnosis_exit_score: number
  price_source: 'historical-kline' | 'synthetic-trend'
  sample_confidence_score: number
  sample_confidence_label: string
  stability_score: number
  stability_label: string
  trade_count: number
  win_rate: number
  average_return_pct: number
  max_drawdown_pct: number
  return_drawdown_ratio: number
  exit_reason_counts?: Record<StrategyBacktestTrade['exit_reason'], number>
  score_weak_exit_count?: number
  lowest_diagnosis_exit_score?: number | null
}

export type StrategyBacktestHistoryComparison = {
  preset: string
  horizon: 'intraday' | 'swing' | 'position'
  items: StrategyBacktestHistoryItem[]
  latest: StrategyBacktestHistoryItem | null
  previous: StrategyBacktestHistoryItem | null
  average_return_delta: number
  max_drawdown_delta: number
  stability_score_delta: number
  sample_confidence_delta: number
  summary: string
}

export type StrategyBacktestAction = {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  detail: string
  trigger: string
  metric: string
  status: 'pending' | 'watching' | 'done'
}

export type StrategyBacktestActionPlan = {
  preset: string
  horizon: 'intraday' | 'swing' | 'position'
  generated_at: string
  action_count: number
  high_count: number
  medium_count: number
  low_count: number
  pending_count: number
  watching_count: number
  done_count: number
  actions: StrategyBacktestAction[]
}

export type AlertItem = {
  id: string
  symbol: string
  name: string
  industry: string
  severity: 'high' | 'medium' | 'low'
  category: string
  title: string
  message: string
  evidence: string
  score: number
  as_of: string
}

export type TimelineEvent = {
  id: string
  symbol: string
  name: string
  industry: string
  event_date: string
  due_date: string
  severity: 'high' | 'medium' | 'low'
  category: string
  title: string
  detail: string
  trigger: string
  status: 'open' | 'watching'
}

export type RiskExposureItem = {
  category: string
  event_count: number
  high_count: number
  medium_count: number
  low_count: number
  severity_score: number
  top_symbol: string
  top_name: string
  top_title: string
}

export type PortfolioRiskConcentration = {
  top_industry: string
  top_industry_count: number
  top_industry_ratio: number
  industry_count: number
}

export type PortfolioRiskDistribution = {
  high_count: number
  medium_count: number
  low_count: number
}

export type PortfolioIndustryExposure = {
  industry: string
  stock_count: number
  weight_pct: number
  risk_score: number
  concentration_level: 'normal' | 'watch' | 'high'
  concentration_label: string
  suggested_max_weight_pct: number
  excess_weight_pct: number
  excess_market_value: number
}

export type PortfolioRiskContribution = {
  symbol: string
  name: string
  industry: string
  weight_pct: number
  risk_score: number
  contribution_score: number
}

export type PortfolioRebalanceAction = {
  symbol: string
  name: string
  industry: string
  current_weight_pct: number
  suggested_weight_pct: number
  delta_pct: number
  action: 'reduce' | 'hold' | 'increase'
  priority: 'high' | 'medium' | 'low'
  reason: string
}

export type PortfolioRiskDriver = {
  symbol: string
  name: string
  industry: string
  risk_score: number
  total_score: number
  alert_count: number
  primary_risk: string
  position_weight_pct: number
}

export type PortfolioPositionWeight = {
  symbol: string
  name: string
  industry: string
  weight_pct: number
  market_value: number
  shares: number
  cost_price: number
  cost_amount: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
}

export type PortfolioRiskReport = {
  scope: 'watchlist' | 'all'
  horizon: 'intraday' | 'swing' | 'position'
  stock_count: number
  weight_mode: 'equal' | 'custom'
  total_position_weight: number
  total_market_value: number
  cash_amount: number
  average_total_score: number
  average_risk_score: number
  portfolio_risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  risk_label: string
  summary: string
  concentration: PortfolioRiskConcentration
  industry_exposures?: PortfolioIndustryExposure[]
  distribution: PortfolioRiskDistribution
  risk_contributions?: PortfolioRiskContribution[]
  rebalance_actions?: PortfolioRebalanceAction[]
  top_drivers: PortfolioRiskDriver[]
  suggestions: string[]
  exposures: RiskExposureItem[]
  positions: PortfolioPositionWeight[]
}

export type IndustryExposure = {
  industry: string
  count: number
}

export type WatchlistSummary = {
  as_of: string
  stock_count: number
  average_score: number
  strong_count: number
  high_alert_count: number
  top_stock: RankedDiagnosis | null
  highest_risk_alert: AlertItem | null
  industry_exposure: IndustryExposure[]
}

export type IndustryHeatItem = {
  industry: string
  stock_count: number
  heat_score: number
  average_score: number
  average_change_pct: number
  average_main_inflow_million: number
  high_alert_count: number
  top_symbol: string
  top_name: string
  top_score: number
  heat_level: 'hot' | 'warm' | 'neutral' | 'cool'
  momentum_label: string
}

export type ConceptHeatItem = {
  concept: string
  stock_count: number
  heat_score: number
  average_change_pct: number
  average_main_inflow_million: number
  top_symbol: string
  top_name: string
  reason: string
  heat_level: 'hot' | 'warm' | 'neutral' | 'cool'
}

export type MomentumSignalItem = {
  symbol: string
  name: string
  industry: string
  signal_score: number
  change_pct: number
  volume_ratio: number
  main_inflow_million: number
  signal_level: 'limit-watch' | 'surging' | 'active' | 'cooling'
  title: string
  reason: string
}

export type HotspotBrief = {
  status: 'hot' | 'warm' | 'neutral' | 'cool'
  summary: string
  top_industry: IndustryHeatItem | null
  top_concept: ConceptHeatItem | null
  top_signal: MomentumSignalItem | null
  focus_symbols: string[]
}

export type HotspotCandidate = {
  symbol: string
  name: string
  industry: string
  concept: string
  heat_score: number
  diagnosis_score: number
  signal_score: number
  change_pct: number
  main_inflow_million: number
  reason: string
  risk_note: string
  next_action: string
}

export type HotspotReviewAction = {
  id: string
  symbol: string
  name: string
  concept: string
  priority: 'high' | 'medium' | 'low'
  title: string
  detail: string
  trigger: string
  check_window: string
  status: 'pending' | 'watching' | 'done'
}

export type HotspotReviewPlan = {
  horizon: string
  mode: 'balanced' | 'capital' | 'momentum'
  generated_at: string
  candidate_count: number
  high_count: number
  medium_count: number
  low_count: number
  pending_count: number
  watching_count: number
  done_count: number
  actions: HotspotReviewAction[]
}

export type TrendPoint = {
  date: string
  close: number
  ma5: number
  ma20: number
  volume_ratio: number
}

export type TrendSeries = {
  symbol: string
  name: string
  as_of: string
  points: TrendPoint[]
  change_30d_pct: number
  high: number
  low: number
}

export type PeerComparisonItem = {
  symbol: string
  name: string
  industry: string
  total_score: number
  change_pct: number
  pe_ttm: number
  roe: number
  main_inflow_million: number
  relative_label: string
}

export type PeerComparison = {
  symbol: string
  name: string
  industry: string
  sample_size: number
  items: PeerComparisonItem[]
}
