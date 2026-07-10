import type {
  AlertItem,
  DataConnectorHealth,
  DataFreshnessStatus,
  DataQualityReport,
  DataRefreshJob,
  DataSource,
  Diagnosis,
  IndustryHeatItem,
  MarketOverview,
  PeerComparison,
  PriceAlert,
  RankedDiagnosis,
  ResearchNote,
  ReportRecord,
  RiskExposureItem,
  ScreenCandidate,
  StockSummary,
  StorageExport,
  StorageImportPayload,
  StorageImportPreview,
  StorageImportResult,
  StorageStatus,
  SystemReadiness,
  TimelineEvent,
  TrendSeries,
  WatchlistSummary,
} from './types'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }
  return response.json() as Promise<T>
}

export function fetchStocks(): Promise<StockSummary[]> {
  return getJson<StockSummary[]>('/api/v1/stocks')
}

export function fetchMarketOverview(): Promise<MarketOverview> {
  return getJson<MarketOverview>('/api/v1/market/overview')
}

export function fetchIndustryHeat(horizon: string): Promise<IndustryHeatItem[]> {
  return getJson<IndustryHeatItem[]>(`/api/v1/industries/heat?horizon=${horizon}`)
}

export function fetchDataSources(): Promise<DataSource[]> {
  return getJson<DataSource[]>('/api/v1/data-sources')
}

export function fetchDataQuality(symbol: string): Promise<DataQualityReport> {
  return getJson<DataQualityReport>(`/api/v1/data-quality/${symbol}`)
}

export function fetchDataConnectorHealth(): Promise<DataConnectorHealth> {
  return getJson<DataConnectorHealth>('/api/v1/system/data-connectors')
}

export function fetchRefreshJobs(): Promise<DataRefreshJob[]> {
  return getJson<DataRefreshJob[]>('/api/v1/system/refresh-jobs?limit=5')
}

export function fetchDataFreshness(): Promise<DataFreshnessStatus> {
  return getJson<DataFreshnessStatus>('/api/v1/system/freshness')
}

export async function runRefreshJob(scope: 'all' | 'watchlist'): Promise<DataRefreshJob> {
  const response = await fetch('/api/v1/system/refresh-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  })
  if (!response.ok) {
    throw new Error(`刷新任务失败：${response.status}`)
  }
  return response.json() as Promise<DataRefreshJob>
}

export function fetchStorageStatus(): Promise<StorageStatus> {
  return getJson<StorageStatus>('/api/v1/system/storage')
}

export function fetchSystemReadiness(): Promise<SystemReadiness> {
  return getJson<SystemReadiness>('/api/v1/system/readiness')
}

export function fetchStorageExport(): Promise<StorageExport> {
  return getJson<StorageExport>('/api/v1/system/export')
}

export async function previewStorageImport(payload: StorageImportPayload): Promise<StorageImportPreview> {
  const response = await fetch('/api/v1/system/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`导入预检失败：${response.status}`)
  }
  return response.json() as Promise<StorageImportPreview>
}

export async function importStorage(payload: StorageImportPayload): Promise<StorageImportResult> {
  const response = await fetch('/api/v1/system/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`导入失败：${response.status}`)
  }
  return response.json() as Promise<StorageImportResult>
}

export function fetchWatchlist(): Promise<StockSummary[]> {
  return getJson<StockSummary[]>('/api/v1/watchlist')
}

export function fetchWatchlistSummary(horizon: string): Promise<WatchlistSummary> {
  return getJson<WatchlistSummary>(`/api/v1/watchlist/summary?horizon=${horizon}`)
}

export async function addWatchlistSymbol(symbol: string): Promise<StockSummary[]> {
  const response = await fetch('/api/v1/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  })
  if (!response.ok) {
    throw new Error(`加入自选失败：${response.status}`)
  }
  return response.json() as Promise<StockSummary[]>
}

export async function removeWatchlistSymbol(symbol: string): Promise<StockSummary[]> {
  const response = await fetch(`/api/v1/watchlist/${symbol}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`移出自选失败：${response.status}`)
  }
  return response.json() as Promise<StockSummary[]>
}

export function fetchDiagnosis(symbol: string, horizon: string): Promise<Diagnosis> {
  return getJson<Diagnosis>(`/api/v1/diagnosis/${symbol}?horizon=${horizon}`)
}

export function fetchReports(): Promise<ReportRecord[]> {
  return getJson<ReportRecord[]>('/api/v1/reports')
}

export function fetchNotes(symbol: string): Promise<ResearchNote[]> {
  return getJson<ResearchNote[]>(`/api/v1/notes?symbol=${symbol}&limit=20`)
}

export function fetchPriceAlerts(symbol: string): Promise<PriceAlert[]> {
  return getJson<PriceAlert[]>(`/api/v1/price-alerts?symbol=${symbol}`)
}

export async function createPriceAlert(
  symbol: string,
  targetPrice: number,
  direction: PriceAlert['direction'],
  label: string,
): Promise<PriceAlert> {
  const response = await fetch('/api/v1/price-alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, target_price: targetPrice, direction, label }),
  })
  if (!response.ok) {
    throw new Error(`保存价位提醒失败：${response.status}`)
  }
  return response.json() as Promise<PriceAlert>
}

export async function deletePriceAlert(alertId: string): Promise<void> {
  const response = await fetch(`/api/v1/price-alerts/${alertId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`删除价位提醒失败：${response.status}`)
  }
}

export async function createNote(symbol: string, body: string): Promise<ResearchNote> {
  const response = await fetch('/api/v1/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, body }),
  })
  if (!response.ok) {
    throw new Error(`保存笔记失败：${response.status}`)
  }
  return response.json() as Promise<ResearchNote>
}

export async function deleteNote(noteId: string): Promise<void> {
  const response = await fetch(`/api/v1/notes/${noteId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`删除笔记失败：${response.status}`)
  }
}

export function fetchRankings(horizon: string, sort: string): Promise<RankedDiagnosis[]> {
  return getJson<RankedDiagnosis[]>(`/api/v1/rankings?horizon=${horizon}&sort=${sort}&limit=8`)
}

export function fetchScreener(preset: string, horizon: string): Promise<ScreenCandidate[]> {
  return getJson<ScreenCandidate[]>(`/api/v1/screeners/${preset}?horizon=${horizon}&limit=8`)
}

export function fetchAlerts(horizon: string, scope = 'watchlist'): Promise<AlertItem[]> {
  return getJson<AlertItem[]>(`/api/v1/alerts?horizon=${horizon}&scope=${scope}&limit=12`)
}

export function fetchRiskExposure(horizon: string, scope = 'watchlist'): Promise<RiskExposureItem[]> {
  return getJson<RiskExposureItem[]>(`/api/v1/risk/exposure?horizon=${horizon}&scope=${scope}`)
}

export function fetchTimeline(horizon: string, scope = 'watchlist'): Promise<TimelineEvent[]> {
  return getJson<TimelineEvent[]>(`/api/v1/timeline?horizon=${horizon}&scope=${scope}&limit=12`)
}

export function fetchTrend(symbol: string): Promise<TrendSeries> {
  return getJson<TrendSeries>(`/api/v1/trend/${symbol}?days=30`)
}

export function fetchPeerComparison(symbol: string, horizon: string): Promise<PeerComparison> {
  return getJson<PeerComparison>(`/api/v1/peers/${symbol}?horizon=${horizon}&limit=6`)
}

export async function createReport(symbol: string, horizon: string): Promise<ReportRecord> {
  const response = await fetch('/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, horizon }),
  })
  if (!response.ok) {
    throw new Error(`保存报告失败：${response.status}`)
  }
  return response.json() as Promise<ReportRecord>
}

export async function deleteReport(reportId: string): Promise<void> {
  const response = await fetch(`/api/v1/reports/${reportId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`删除报告失败：${response.status}`)
  }
}
