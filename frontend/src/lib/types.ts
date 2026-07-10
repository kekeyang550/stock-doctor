export type StockSummary = {
  symbol: string
  name: string
  industry: string
  last_price: number
  change_pct: number
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
  connectors: DataConnectorStatus[]
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

export type StorageExport = {
  exported_at: string
  backend: string
  watchlist: string[]
  reports: ReportRecord[]
  notes: ResearchNote[]
  price_alerts: PriceAlert[]
}

export type StorageImportPayload = {
  watchlist: string[]
  reports: ReportRecord[]
  notes: ResearchNote[]
  price_alerts: PriceAlert[]
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
  average_score: number
  average_change_pct: number
  high_alert_count: number
  top_symbol: string
  top_name: string
  top_score: number
  heat_level: 'hot' | 'warm' | 'neutral' | 'cool'
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
