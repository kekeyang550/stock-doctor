import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScoreGauge } from './components/ScoreGauge'
import { StockList } from './components/StockList'
import {
  addWatchlistSymbol,
  createNote,
  createPriceAlert,
  createReport,
  deleteNote,
  deletePriceAlert,
  deleteReport,
  fetchAlerts,
  fetchDataSources,
  fetchDiagnosis,
  fetchIndustryHeat,
  fetchMarketOverview,
  fetchNotes,
  fetchPeerComparison,
  fetchPriceAlerts,
  fetchRankings,
  fetchReports,
  fetchRiskExposure,
  fetchScreener,
  fetchStocks,
  fetchStorageExport,
  fetchStorageStatus,
  fetchTimeline,
  fetchTrend,
  fetchWatchlist,
  fetchWatchlistSummary,
  importStorage,
  previewStorageImport,
  removeWatchlistSymbol,
} from './lib/api'
import type {
  AlertItem,
  ChecklistItem,
  DataSource,
  Diagnosis,
  EvidenceItem,
  IndustryHeatItem,
  MarketOverview,
  PeerComparison,
  PeerComparisonItem,
  PriceAlert,
  RankedDiagnosis,
  ResearchNote,
  ReportRecord,
  RiskExposureItem,
  ScreenCandidate,
  StockSummary,
  StorageImportPayload,
  StorageImportPreview,
  StorageStatus,
  TimelineEvent,
  TrendSeries,
  WatchlistSummary,
} from './lib/types'
import './styles.css'

const horizonOptions = [
  { value: 'swing', label: '波段' },
  { value: 'position', label: '中线' },
  { value: 'intraday', label: '短线' },
]

const rankingSortOptions = [
  { value: 'total', label: '综合' },
  { value: 'technical', label: '技术' },
  { value: 'capital', label: '资金' },
  { value: 'risk', label: '风控' },
  { value: 'change', label: '涨幅' },
]

const screenerPresets = [
  { value: 'strong', label: '强势关注' },
  { value: 'value', label: '低估值观察' },
  { value: 'capital-risk', label: '资金承压' },
]

export default function App() {
  const [stocks, setStocks] = useState<StockSummary[]>([])
  const [watchlist, setWatchlist] = useState<StockSummary[]>([])
  const [overview, setOverview] = useState<MarketOverview | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const [storageImportPayload, setStorageImportPayload] = useState<StorageImportPayload | null>(null)
  const [storageImportPreview, setStorageImportPreview] = useState<StorageImportPreview | null>(null)
  const [storageImportName, setStorageImportName] = useState('')
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([])
  const [rankings, setRankings] = useState<RankedDiagnosis[]>([])
  const [screenCandidates, setScreenCandidates] = useState<ScreenCandidate[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [watchlistSummary, setWatchlistSummary] = useState<WatchlistSummary | null>(null)
  const [industryHeat, setIndustryHeat] = useState<IndustryHeatItem[]>([])
  const [riskExposure, setRiskExposure] = useState<RiskExposureItem[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [trend, setTrend] = useState<TrendSeries | null>(null)
  const [peers, setPeers] = useState<PeerComparison | null>(null)
  const [rankingSort, setRankingSort] = useState('total')
  const [screenerPreset, setScreenerPreset] = useState('strong')
  const [selectedSymbol, setSelectedSymbol] = useState('600519')
  const [horizon, setHorizon] = useState('swing')
  const [query, setQuery] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [priceAlertDraft, setPriceAlertDraft] = useState('')
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStocks = useCallback(async () => {
    const [items, watchItems, market, sources, storage, savedReports] = await Promise.all([
      fetchStocks(),
      fetchWatchlist(),
      fetchMarketOverview(),
      fetchDataSources(),
      fetchStorageStatus(),
      fetchReports(),
    ])
    setStocks(items)
    setWatchlist(watchItems)
    setOverview(market)
    setDataSources(sources)
    setStorageStatus(storage)
    setReports(savedReports)
    if (!items.some((item) => item.symbol === selectedSymbol) && items[0]) {
      setSelectedSymbol(items[0].symbol)
    }
  }, [selectedSymbol])

  const loadDiagnosis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchDiagnosis(selectedSymbol, horizon)
      setDiagnosis(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, horizon])

  useEffect(() => {
    loadStocks().catch((err) => setError(err instanceof Error ? err.message : '股票列表加载失败'))
  }, [loadStocks])

  useEffect(() => {
    loadDiagnosis()
  }, [loadDiagnosis])

  useEffect(() => {
    fetchRankings(horizon, rankingSort)
      .then(setRankings)
      .catch((err) => setError(err instanceof Error ? err.message : '排行加载失败'))
  }, [horizon, rankingSort])

  useEffect(() => {
    fetchScreener(screenerPreset, horizon)
      .then(setScreenCandidates)
      .catch((err) => setError(err instanceof Error ? err.message : '策略股票池加载失败'))
  }, [horizon, screenerPreset])

  useEffect(() => {
    fetchAlerts(horizon)
      .then(setAlerts)
      .catch((err) => setError(err instanceof Error ? err.message : '预警加载失败'))
  }, [horizon, watchlist])

  useEffect(() => {
    fetchWatchlistSummary(horizon)
      .then(setWatchlistSummary)
      .catch((err) => setError(err instanceof Error ? err.message : '组合体检加载失败'))
  }, [horizon, watchlist])

  useEffect(() => {
    fetchIndustryHeat(horizon)
      .then(setIndustryHeat)
      .catch((err) => setError(err instanceof Error ? err.message : '行业热力加载失败'))
  }, [horizon])

  useEffect(() => {
    fetchTimeline(horizon)
      .then(setTimeline)
      .catch((err) => setError(err instanceof Error ? err.message : '跟踪时间线加载失败'))
  }, [horizon, watchlist])

  useEffect(() => {
    fetchRiskExposure(horizon)
      .then(setRiskExposure)
      .catch((err) => setError(err instanceof Error ? err.message : '风险敞口加载失败'))
  }, [horizon, watchlist])

  useEffect(() => {
    fetchTrend(selectedSymbol)
      .then(setTrend)
      .catch((err) => setError(err instanceof Error ? err.message : '走势加载失败'))
  }, [selectedSymbol])

  useEffect(() => {
    fetchPeerComparison(selectedSymbol, horizon)
      .then(setPeers)
      .catch((err) => setError(err instanceof Error ? err.message : '同业对比加载失败'))
  }, [selectedSymbol, horizon])

  useEffect(() => {
    fetchNotes(selectedSymbol)
      .then(setNotes)
      .catch((err) => setError(err instanceof Error ? err.message : '研究笔记加载失败'))
  }, [selectedSymbol])

  useEffect(() => {
    fetchPriceAlerts(selectedSymbol)
      .then(setPriceAlerts)
      .catch((err) => setError(err instanceof Error ? err.message : '价位提醒加载失败'))
  }, [selectedSymbol])

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.symbol === selectedSymbol),
    [selectedSymbol, stocks],
  )

  const isInWatchlist = watchlist.some((stock) => stock.symbol === selectedSymbol)

  const toggleWatchlist = useCallback(async () => {
    setError(null)
    try {
      const nextWatchlist = isInWatchlist
        ? await removeWatchlistSymbol(selectedSymbol)
        : await addWatchlistSymbol(selectedSymbol)
      setWatchlist(nextWatchlist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '自选股更新失败')
    }
  }, [isInWatchlist, selectedSymbol])

  const saveCurrentReport = useCallback(async () => {
    setError(null)
    try {
      const report = await createReport(selectedSymbol, horizon)
      setReports((items) => [report, ...items.filter((item) => item.id !== report.id)].slice(0, 20))
    } catch (err) {
      setError(err instanceof Error ? err.message : '报告保存失败')
    }
  }, [horizon, selectedSymbol])

  const removeReport = useCallback(async (reportId: string) => {
    setError(null)
    try {
      await deleteReport(reportId)
      setReports((items) => items.filter((item) => item.id !== reportId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '报告删除失败')
    }
  }, [])

  const saveNote = useCallback(async () => {
    const body = noteDraft.trim()
    if (!body) return
    setError(null)
    try {
      const note = await createNote(selectedSymbol, body)
      setNotes((items) => [note, ...items])
      setNoteDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '研究笔记保存失败')
    }
  }, [noteDraft, selectedSymbol])

  const removeNote = useCallback(async (noteId: string) => {
    setError(null)
    try {
      await deleteNote(noteId)
      setNotes((items) => items.filter((item) => item.id !== noteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '研究笔记删除失败')
    }
  }, [])

  const savePriceAlert = useCallback(async (targetPrice: number, direction: PriceAlert['direction'], label: string) => {
    setError(null)
    try {
      const alert = await createPriceAlert(selectedSymbol, targetPrice, direction, label)
      setPriceAlerts((items) => [alert, ...items])
      setPriceAlertDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '价位提醒保存失败')
    }
  }, [selectedSymbol])

  const saveCustomPriceAlert = useCallback(async () => {
    const targetPrice = Number(priceAlertDraft)
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return
    const direction: PriceAlert['direction'] = selectedStock && targetPrice >= selectedStock.last_price ? 'above' : 'below'
    await savePriceAlert(targetPrice, direction, '自定义价位')
  }, [priceAlertDraft, savePriceAlert, selectedStock])

  const removePriceAlert = useCallback(async (alertId: string) => {
    setError(null)
    try {
      await deletePriceAlert(alertId)
      setPriceAlerts((items) => items.filter((item) => item.id !== alertId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '价位提醒删除失败')
    }
  }, [])

  const exportStorage = useCallback(async () => {
    setError(null)
    try {
      const snapshot = await fetchStorageExport()
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `stock-doctor-state-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据导出失败')
    }
  }, [])

  const previewStorageFile = useCallback(async (file: File) => {
    setError(null)
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const payload = buildStorageImportPayload(parsed)
      const preview = await previewStorageImport(payload)
      setStorageImportPayload(payload)
      setStorageImportPreview(preview)
      setStorageImportName(file.name)
    } catch (err) {
      setStorageImportPayload(null)
      setStorageImportPreview(null)
      setStorageImportName('')
      setError(err instanceof Error ? err.message : '导入预检失败')
    }
  }, [])

  const applyStorageImport = useCallback(async () => {
    if (!storageImportPayload) return
    setError(null)
    try {
      const result = await importStorage(storageImportPayload)
      setStorageStatus(result.storage)
      await loadStocks()
      const [nextNotes, nextPriceAlerts] = await Promise.all([
        fetchNotes(selectedSymbol),
        fetchPriceAlerts(selectedSymbol),
      ])
      setNotes(nextNotes)
      setPriceAlerts(nextPriceAlerts)
      setStorageImportPreview(null)
      setStorageImportPayload(null)
      setStorageImportName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据导入失败')
    }
  }, [loadStocks, selectedSymbol, storageImportPayload])

  return (
    <main className="app-shell">
      <StockList
        stocks={stocks}
        watchlist={watchlist}
        selectedSymbol={selectedSymbol}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelectedSymbol}
      />
      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">诊断工作台</span>
            <h2>{diagnosis?.name ?? selectedStock?.name ?? '加载中'} <small>{selectedSymbol}</small></h2>
          </div>
          <div className="toolbar">
            <button className={isInWatchlist ? 'watch-button active' : 'watch-button'} type="button" onClick={toggleWatchlist}>
              <Star size={16} />
              <span>{isInWatchlist ? '已自选' : '加自选'}</span>
            </button>
            <button className="watch-button" type="button" onClick={saveCurrentReport}>
              <Save size={16} />
              <span>存报告</span>
            </button>
            <div className="segments" role="tablist" aria-label="周期">
              {horizonOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={horizon === option.value ? 'selected' : ''}
                  onClick={() => setHorizon(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button className="icon-button" type="button" onClick={loadDiagnosis} title="刷新诊断" aria-label="刷新诊断">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="state-panel">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        ) : null}

        <WatchlistSummaryPanel summary={watchlistSummary} onSelect={setSelectedSymbol} />

        <IndustryHeatPanel items={industryHeat} onSelect={setSelectedSymbol} />

        <TimelinePanel events={timeline} onSelect={setSelectedSymbol} />

        <RiskExposurePanel items={riskExposure} onSelect={setSelectedSymbol} />

        <SystemStoragePanel
          status={storageStatus}
          importFileName={storageImportName}
          importPreview={storageImportPreview}
          onExport={exportStorage}
          onPreviewImport={previewStorageFile}
          onApplyImport={applyStorageImport}
        />

        {loading || !diagnosis ? (
          <div className="state-panel">
            <RefreshCw className="spin" size={20} />
            <span>正在生成诊断...</span>
          </div>
        ) : (
          <DiagnosisWorkspace diagnosis={diagnosis} overview={overview} dataSources={dataSources} trend={trend} peers={peers} />
        )}
        <PriceAlertsPanel
          alerts={priceAlerts}
          diagnosis={diagnosis}
          draft={priceAlertDraft}
          onDraftChange={setPriceAlertDraft}
          onSavePreset={savePriceAlert}
          onSaveCustom={saveCustomPriceAlert}
          onDelete={removePriceAlert}
        />
        <AlertCenter alerts={alerts} onSelect={setSelectedSymbol} />
        <RankingPanel
          rankings={rankings}
          sort={rankingSort}
          onSortChange={setRankingSort}
          onSelect={setSelectedSymbol}
        />
        <ScreenerPanel
          candidates={screenCandidates}
          preset={screenerPreset}
          onPresetChange={setScreenerPreset}
          onSelect={setSelectedSymbol}
        />
        <ResearchNotesPanel
          notes={notes}
          draft={noteDraft}
          onDraftChange={setNoteDraft}
          onSave={saveNote}
          onDelete={removeNote}
        />
        <ReportHistory reports={reports} onSelect={setSelectedSymbol} onDelete={removeReport} />
      </section>
    </main>
  )
}

function buildStorageImportPayload(value: unknown): StorageImportPayload {
  if (!value || typeof value !== 'object') {
    throw new Error('备份文件格式不正确')
  }
  const record = value as Partial<StorageImportPayload>
  return {
    watchlist: Array.isArray(record.watchlist) ? record.watchlist.map(String) : [],
    reports: Array.isArray(record.reports) ? record.reports : [],
    notes: Array.isArray(record.notes) ? record.notes : [],
    price_alerts: Array.isArray(record.price_alerts) ? record.price_alerts : [],
  }
}

function SystemStoragePanel({
  status,
  importFileName,
  importPreview,
  onExport,
  onPreviewImport,
  onApplyImport,
}: {
  status: StorageStatus | null
  importFileName: string
  importPreview: StorageImportPreview | null
  onExport: () => void
  onPreviewImport: (file: File) => void
  onApplyImport: () => void
}) {
  return (
    <section className="panel storage-panel">
      <div className="panel-title split-title">
        <span>
          <Database size={18} />
          <h3>系统存储</h3>
        </span>
        <div className="title-actions">
          <small>{status ? status.status : '加载中'}</small>
          <button type="button" onClick={onExport} disabled={!status}>
            <Download size={15} />
            <span>导出</span>
          </button>
          <label className="file-action">
            <Upload size={15} />
            <span>预检</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onPreviewImport(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
      {status ? (
        <>
          <div className="storage-head">
            <span>
              <strong>{status.backend.toUpperCase()}</strong>
              <small>{status.path}</small>
            </span>
            <b>{status.total_records}</b>
          </div>
          <div className="storage-grid">
            {status.collections.map((item) => (
              <div key={item.key} className="storage-stat">
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <p>{status.migration_hint}</p>
          {importPreview ? (
            <div className="import-preview">
              <div className="import-preview-head">
                <span>
                  <strong>{importFileName}</strong>
                  <small>{importPreview.total_records} 条记录 · 跳过 {importPreview.skipped_records}</small>
                </span>
                <button type="button" onClick={onApplyImport} disabled={!importPreview.can_import}>
                  <Upload size={15} />
                  <span>导入</span>
                </button>
              </div>
              <div className="storage-grid compact">
                {importPreview.collections.map((item) => (
                  <div key={item.key} className="storage-stat">
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
              {importPreview.warnings.length ? (
                <ul className="import-warnings">
                  {importPreview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty-text">正在检查本地存储...</p>
      )}
    </section>
  )
}

function WatchlistSummaryPanel({
  summary,
  onSelect,
}: {
  summary: WatchlistSummary | null
  onSelect: (symbol: string) => void
}) {
  return (
    <section className="panel portfolio-panel">
      <div className="panel-title split-title">
        <span>
          <ShieldAlert size={18} />
          <h3>自选股体检</h3>
        </span>
        <small>{summary?.as_of || '加载中'}</small>
      </div>
      {summary ? (
        <>
          <div className="portfolio-metrics">
            <SummaryMetric label="自选数量" value={summary.stock_count} />
            <SummaryMetric label="平均评分" value={summary.average_score.toFixed(1)} />
            <SummaryMetric label="强势候选" value={summary.strong_count} />
            <SummaryMetric label="高优先预警" value={summary.high_alert_count} />
          </div>
          <div className="portfolio-details">
            {summary.top_stock ? (
              <button type="button" onClick={() => onSelect(summary.top_stock!.symbol)}>
                <span>最强候选</span>
                <strong>{summary.top_stock.name}</strong>
                <small>{summary.top_stock.total_score} 分 · {summary.top_stock.rating}</small>
              </button>
            ) : null}
            {summary.highest_risk_alert ? (
              <button type="button" onClick={() => onSelect(summary.highest_risk_alert!.symbol)}>
                <span>最高风险</span>
                <strong>{summary.highest_risk_alert.title}</strong>
                <small>{summary.highest_risk_alert.name} · {summary.highest_risk_alert.evidence}</small>
              </button>
            ) : null}
            <div className="industry-strip">
              {summary.industry_exposure.map((item) => (
                <span key={item.industry}>{item.industry} {item.count}</span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="empty-text">正在汇总自选股...</p>
      )}
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function IndustryHeatPanel({ items, onSelect }: { items: IndustryHeatItem[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel industry-heat-panel">
      <div className="panel-title split-title">
        <span>
          <BarChart3 size={18} />
          <h3>行业热力</h3>
        </span>
        <small>{items.length ? `${items.length} 个行业` : '加载中'}</small>
      </div>
      {items.length === 0 ? (
        <p className="empty-text">正在计算行业热力...</p>
      ) : (
        <div className="industry-heat-list">
          {items.map((item) => (
            <button type="button" key={item.industry} className={`industry-heat-row ${item.heat_level}`} onClick={() => onSelect(item.top_symbol)}>
              <span>
                <strong>{item.industry}</strong>
                <small>{item.stock_count} 只 · 高优先预警 {item.high_alert_count}</small>
              </span>
              <span className="heat-meter" aria-label={`${item.industry} 热力 ${item.average_score.toFixed(1)}`}>
                <i style={{ width: `${Math.max(8, Math.min(item.average_score, 100))}%` }} />
              </span>
              <b>{item.average_score.toFixed(1)}</b>
              <em className={item.average_change_pct >= 0 ? 'up' : 'down'}>
                {item.average_change_pct >= 0 ? '+' : ''}{item.average_change_pct.toFixed(2)}%
              </em>
              <small>{item.top_name} {item.top_score}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function TimelinePanel({ events, onSelect }: { events: TimelineEvent[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel timeline-panel">
      <div className="panel-title split-title">
        <span>
          <CalendarClock size={18} />
          <h3>跟踪时间线</h3>
        </span>
        <small>{events.length ? `${events.length} 项待跟踪` : '暂无事件'}</small>
      </div>
      {events.length === 0 ? (
        <p className="empty-text">当前自选股暂无待跟踪事件</p>
      ) : (
        <div className="timeline-list">
          {events.map((event) => (
            <button
              type="button"
              key={event.id}
              className={`timeline-row ${event.severity}`}
              onClick={() => onSelect(event.symbol)}
            >
              <span className="timeline-date">{formatShortDate(event.due_date)}</span>
              <span className="timeline-main">
                <b>{event.title}</b>
                <small>{event.name} · {event.category} · {event.trigger}</small>
              </span>
              <em>{timelineStatusLabel(event.status)}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function RiskExposurePanel({ items, onSelect }: { items: RiskExposureItem[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel exposure-panel">
      <div className="panel-title split-title">
        <span>
          <ShieldAlert size={18} />
          <h3>风险敞口</h3>
        </span>
        <small>{items.length ? `${items.length} 类风险` : '暂无风险'}</small>
      </div>
      {items.length === 0 ? (
        <p className="empty-text">当前自选股暂无聚合风险</p>
      ) : (
        <div className="exposure-list">
          {items.map((item) => (
            <button type="button" key={item.category} className="exposure-row" onClick={() => onSelect(item.top_symbol)}>
              <strong>{item.category}</strong>
              <span>
                <b>{item.event_count} 项</b>
                <small>高 {item.high_count} / 中 {item.medium_count} / 低 {item.low_count}</small>
              </span>
              <em>{item.severity_score}</em>
              <small>{item.top_name} · {item.top_title}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function timelineStatusLabel(status: TimelineEvent['status']) {
  return status === 'open' ? '处理' : '观察'
}

function AlertCenter({ alerts, onSelect }: { alerts: AlertItem[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel alert-center">
      <div className="panel-title">
        <BellRing size={18} />
        <h3>预警中心</h3>
      </div>
      {alerts.length === 0 ? (
        <p className="empty-text">当前自选股暂无预警</p>
      ) : (
        <div className="alert-list">
          {alerts.map((alert) => (
            <button
              type="button"
              key={alert.id}
              className={`alert-row ${alert.severity}`}
              onClick={() => onSelect(alert.symbol)}
            >
              <strong>{severityLabel(alert.severity)}</strong>
              <span>
                <b>{alert.title}</b>
                <small>{alert.name} · {alert.category} · {alert.evidence}</small>
              </span>
              <em>{alert.score}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function severityLabel(severity: AlertItem['severity']) {
  if (severity === 'high') return '高'
  if (severity === 'medium') return '中'
  return '低'
}

function RankingPanel({
  rankings,
  sort,
  onSortChange,
  onSelect,
}: {
  rankings: RankedDiagnosis[]
  sort: string
  onSortChange: (sort: string) => void
  onSelect: (symbol: string) => void
}) {
  return (
    <section className="panel ranking-panel">
      <div className="panel-title split-title">
        <span>
          <BarChart3 size={18} />
          <h3>机会排行</h3>
        </span>
        <div className="mini-segments" aria-label="排行排序">
          {rankingSortOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={sort === option.value ? 'selected' : ''}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ranking-list">
        {rankings.map((item) => (
          <button type="button" key={item.symbol} className="ranking-row" onClick={() => onSelect(item.symbol)}>
            <strong>{item.total_score}</strong>
            <span>
              <b>{item.name}</b>
              <small>{item.symbol} · {item.industry} · {item.rating}</small>
            </span>
            <em className={item.change_pct >= 0 ? 'up' : 'down'}>
              {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
            </em>
          </button>
        ))}
      </div>
    </section>
  )
}

function PriceAlertsPanel({
  alerts,
  diagnosis,
  draft,
  onDraftChange,
  onSavePreset,
  onSaveCustom,
  onDelete,
}: {
  alerts: PriceAlert[]
  diagnosis: Diagnosis | null
  draft: string
  onDraftChange: (value: string) => void
  onSavePreset: (targetPrice: number, direction: PriceAlert['direction'], label: string) => void
  onSaveCustom: () => void
  onDelete: (alertId: string) => void
}) {
  const levels = diagnosis?.key_levels
  return (
    <section className="panel price-alert-panel">
      <div className="panel-title split-title">
        <span>
          <BellRing size={18} />
          <h3>价位提醒</h3>
        </span>
        <small>{alerts.length} 条</small>
      </div>
      {levels ? (
        <div className="price-alert-presets">
          <button type="button" onClick={() => onSavePreset(levels.risk_line, 'below', '风控线')}>
            风控 {levels.risk_line.toFixed(2)}
          </button>
          <button type="button" onClick={() => onSavePreset(levels.support, 'below', '支撑位')}>
            支撑 {levels.support.toFixed(2)}
          </button>
          <button type="button" onClick={() => onSavePreset(levels.pressure, 'above', '压力位')}>
            压力 {levels.pressure.toFixed(2)}
          </button>
        </div>
      ) : null}
      <div className="price-alert-editor">
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          inputMode="decimal"
          placeholder="自定义价位"
        />
        <button type="button" onClick={onSaveCustom} disabled={!draft.trim()}>
          <Save size={16} />
          <span>保存</span>
        </button>
      </div>
      {alerts.length === 0 ? (
        <p className="empty-text">暂无价位提醒</p>
      ) : (
        <div className="price-alert-list">
          {alerts.map((alert) => (
            <article key={alert.id} className={`price-alert-row ${alert.status}`}>
              <span>
                <strong>{alert.label}</strong>
                <small>{directionLabel(alert.direction)} {alert.target_price.toFixed(2)} · 现价 {alert.last_price.toFixed(2)}</small>
              </span>
              <em>{alert.status === 'triggered' ? '触发' : `${alert.distance_pct.toFixed(2)}%`}</em>
              <button type="button" className="delete-button" onClick={() => onDelete(alert.id)} aria-label="删除价位提醒">
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function directionLabel(direction: PriceAlert['direction']) {
  return direction === 'above' ? '上穿' : '下破'
}

function ScreenerPanel({
  candidates,
  preset,
  onPresetChange,
  onSelect,
}: {
  candidates: ScreenCandidate[]
  preset: string
  onPresetChange: (preset: string) => void
  onSelect: (symbol: string) => void
}) {
  return (
    <section className="panel screener-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>策略股票池</h3>
        </span>
        <div className="mini-segments" aria-label="股票池策略">
          {screenerPresets.map((option) => (
            <button
              type="button"
              key={option.value}
              className={preset === option.value ? 'selected' : ''}
              onClick={() => onPresetChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {candidates.length === 0 ? (
        <p className="empty-text">当前策略暂无候选</p>
      ) : (
        <div className="screener-list">
          {candidates.map((item) => (
            <button type="button" key={`${item.preset}-${item.symbol}`} className="screener-row" onClick={() => onSelect(item.symbol)}>
              <strong>{item.total_score}</strong>
              <span>
                <b>{item.name}</b>
                <small>{item.symbol} · {item.industry} · {item.rating}</small>
              </span>
              <em className={item.change_pct >= 0 ? 'up' : 'down'}>
                {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
              </em>
              <p>{item.reason}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ResearchNotesPanel({
  notes,
  draft,
  onDraftChange,
  onSave,
  onDelete,
}: {
  notes: ResearchNote[]
  draft: string
  onDraftChange: (value: string) => void
  onSave: () => void
  onDelete: (noteId: string) => void
}) {
  return (
    <section className="panel notes-panel">
      <div className="panel-title split-title">
        <span>
          <FileText size={18} />
          <h3>研究笔记</h3>
        </span>
        <small>{notes.length} 条</small>
      </div>
      <div className="note-editor">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="记录复盘、观察点或待验证假设"
          rows={3}
        />
        <button type="button" onClick={onSave} disabled={!draft.trim()}>
          <Save size={16} />
          <span>保存</span>
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="empty-text">暂无研究笔记</p>
      ) : (
        <div className="note-list">
          {notes.map((note) => (
            <article key={note.id} className="note-row">
              <div>
                <p>{note.body}</p>
                <small>{formatReportTime(note.created_at)}</small>
              </div>
              <button type="button" className="delete-button" onClick={() => onDelete(note.id)} aria-label="删除研究笔记">
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ReportHistory({
  reports,
  onSelect,
  onDelete,
}: {
  reports: ReportRecord[]
  onSelect: (symbol: string) => void
  onDelete: (reportId: string) => void
}) {
  return (
    <section className="panel history-panel">
      <div className="panel-title">
        <FileText size={18} />
        <h3>报告历史</h3>
      </div>
      {reports.length === 0 ? (
        <p className="empty-text">暂无已保存报告</p>
      ) : (
        <div className="history-list">
          {reports.map((report) => (
            <article key={report.id} className="history-row">
              <button type="button" onClick={() => onSelect(report.diagnosis.symbol)}>
                <strong>{report.diagnosis.name}</strong>
                <span>{report.diagnosis.symbol} · {report.diagnosis.rating} · {report.diagnosis.score.total} 分</span>
                <small>{formatReportTime(report.generated_at)}</small>
              </button>
              <button type="button" className="delete-button" onClick={() => onDelete(report.id)} aria-label={`删除 ${report.diagnosis.name} 报告`}>
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function formatReportTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DiagnosisWorkspace({
  diagnosis,
  overview,
  dataSources,
  trend,
  peers,
}: {
  diagnosis: Diagnosis
  overview: MarketOverview | null
  dataSources: DataSource[]
  trend: TrendSeries | null
  peers: PeerComparison | null
}) {
  return (
    <div className="diagnosis-layout">
      <section className="summary-band">
        <div>
          <span className="eyebrow">{diagnosis.industry} · {diagnosis.as_of}</span>
          <h3>{diagnosis.rating}</h3>
          <p>{diagnosis.verdict}</p>
        </div>
        <strong>{diagnosis.score.total}</strong>
      </section>

      <ScoreGauge score={diagnosis.score} />

      {overview ? (
        <section className="panel market-panel">
          <div className="panel-title">
            <BarChart3 size={18} />
            <h3>市场概览</h3>
          </div>
          <div className="market-index">
            <strong>{overview.index_name}</strong>
            <span>{overview.index_level.toFixed(2)}</span>
            <em className={overview.index_change_pct >= 0 ? 'up' : 'down'}>
              {overview.index_change_pct >= 0 ? '+' : ''}{overview.index_change_pct.toFixed(2)}%
            </em>
          </div>
          <div className="breadth">
            <span>上涨 {overview.advancing}</span>
            <span>下跌 {overview.declining}</span>
          </div>
          <div className="tag-row">
            {overview.hot_industries.map((industry) => (
              <span key={industry}>{industry}</span>
            ))}
          </div>
        </section>
      ) : null}

      <TrendPanel trend={trend} />

      <ChecklistPanel items={diagnosis.checklist} />

      <PeerPanel peers={peers} />

      <section className="panel report-panel">
        <div className="panel-title">
          <FileText size={18} />
          <h3>AI 诊断摘要</h3>
        </div>
        <p>{diagnosis.summary}</p>
        <small>{diagnosis.disclaimer}</small>
      </section>

      <section className="panel levels-panel">
        <div className="panel-title">
          <BarChart3 size={18} />
          <h3>关键价位</h3>
        </div>
        <div className="levels-grid">
          <Level label="支撑" value={diagnosis.key_levels.support} />
          <Level label="中枢" value={diagnosis.key_levels.pivot} />
          <Level label="压力" value={diagnosis.key_levels.pressure} />
          <Level label="风控" value={diagnosis.key_levels.risk_line} />
        </div>
      </section>

      <section className="panel evidence-panel">
        <div className="panel-title">
          <CheckCircle2 size={18} />
          <h3>证据链</h3>
        </div>
        <div className="evidence-list">
          {diagnosis.evidence.map((item) => (
            <EvidenceRow key={`${item.label}-${item.value}`} item={item} />
          ))}
        </div>
      </section>

      <section className="panel risk-panel">
        <div className="panel-title">
          <ShieldAlert size={18} />
          <h3>风险提示</h3>
        </div>
        <ul>
          {diagnosis.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </section>

      <section className="panel source-panel">
        <div className="panel-title">
          <Database size={18} />
          <h3>数据源状态</h3>
        </div>
        <div className="source-list">
          {dataSources.map((source) => (
            <div key={source.name} className="source-row">
              <strong>{source.name}</strong>
              <span>{source.role}</span>
              <em>{source.status}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ChecklistPanel({ items }: { items: ChecklistItem[] }) {
  return (
    <section className="panel checklist-panel">
      <div className="panel-title">
        <ListChecks size={18} />
        <h3>操作清单</h3>
      </div>
      <div className="checklist-list">
        {items.map((item) => (
          <article key={item.id} className={`checklist-item ${item.priority}`}>
            <div>
              <strong>{item.title}</strong>
              <span>{priorityLabel(item.priority)}</span>
            </div>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function priorityLabel(priority: ChecklistItem['priority']) {
  if (priority === 'high') return '高优先'
  if (priority === 'medium') return '观察'
  return '低优先'
}

function PeerPanel({ peers }: { peers: PeerComparison | null }) {
  return (
    <section className="panel peer-panel">
      <div className="panel-title split-title">
        <span>
          <BarChart3 size={18} />
          <h3>同业对比</h3>
        </span>
        <small>{peers ? `${peers.industry} · ${peers.sample_size} 个样本` : '加载中'}</small>
      </div>
      {peers ? (
        <div className="peer-table">
          <div className="peer-head">
            <span>标的</span>
            <span>评分</span>
            <span>涨跌</span>
            <span>PE</span>
            <span>ROE</span>
            <span>资金</span>
          </div>
          {peers.items.map((item) => (
            <PeerRow key={item.symbol} item={item} />
          ))}
        </div>
      ) : (
        <p className="empty-text">正在加载同业对比...</p>
      )}
    </section>
  )
}

function PeerRow({ item }: { item: PeerComparisonItem }) {
  const isTarget = item.relative_label === '当前标的'
  return (
    <div className={isTarget ? 'peer-row current' : 'peer-row'}>
      <span>
        <strong>{item.name}</strong>
        <small>{item.symbol} · {item.relative_label}</small>
      </span>
      <b>{item.total_score}</b>
      <em className={item.change_pct >= 0 ? 'up' : 'down'}>
        {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
      </em>
      <em>{item.pe_ttm.toFixed(1)}</em>
      <em>{item.roe.toFixed(1)}%</em>
      <em className={item.main_inflow_million >= 0 ? 'up' : 'down'}>
        {item.main_inflow_million >= 0 ? '+' : ''}{item.main_inflow_million.toFixed(0)}
      </em>
    </div>
  )
}

function TrendPanel({ trend }: { trend: TrendSeries | null }) {
  const linePath = trend ? buildSparklinePath(trend.points.map((point) => point.close)) : ''
  const maPath = trend ? buildSparklinePath(trend.points.map((point) => point.ma20)) : ''
  return (
    <section className="panel trend-panel">
      <div className="panel-title split-title">
        <span>
          <BarChart3 size={18} />
          <h3>走势回放</h3>
        </span>
        <small>{trend ? `${trend.points.length} 日` : '加载中'}</small>
      </div>
      {trend ? (
        <>
          <div className="trend-stats">
            <span className={trend.change_30d_pct >= 0 ? 'up' : 'down'}>
              {trend.change_30d_pct >= 0 ? '+' : ''}{trend.change_30d_pct.toFixed(2)}%
            </span>
            <small>高 {trend.high.toFixed(2)} / 低 {trend.low.toFixed(2)}</small>
          </div>
          <svg className="sparkline" viewBox="0 0 300 120" role="img" aria-label={`${trend.name} 30 日走势`}>
            <path className="spark-grid" d="M0 30H300M0 60H300M0 90H300" />
            <path className="spark-ma" d={maPath} />
            <path className="spark-close" d={linePath} />
          </svg>
          <div className="trend-legend">
            <span><i className="legend-close" />收盘</span>
            <span><i className="legend-ma" />MA20</span>
          </div>
        </>
      ) : (
        <p className="empty-text">正在加载走势...</p>
      )}
    </section>
  )
}

function buildSparklinePath(values: number[]) {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 300
      const y = 105 - ((value - min) / range) * 90
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function Level({ label, value }: { label: string; value: number }) {
  return (
    <div className="level">
      <span>{label}</span>
      <strong>{value.toFixed(2)}</strong>
    </div>
  )
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <article className={`evidence ${item.polarity}`}>
      <div>
        <strong>{item.label}</strong>
        <span>{item.value}</span>
      </div>
      <p>{item.interpretation}</p>
    </article>
  )
}
