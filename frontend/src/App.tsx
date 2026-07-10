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
  fetchConceptHeat,
  fetchDataConnectorHealth,
  fetchDataFreshness,
  fetchDataQuality,
  fetchDataQualityOverview,
  fetchDataSources,
  fetchDiagnosis,
  fetchDiagnosisChange,
  fetchDiagnosisThesis,
  fetchHotspotBrief,
  fetchHotspotCandidates,
  fetchIndustryHeat,
  fetchMarketOverview,
  fetchMomentumSignals,
  fetchNotes,
  fetchPeerComparison,
  fetchPriceAlerts,
  fetchRankings,
  fetchRefreshJobs,
  fetchReports,
  fetchReviewActionOverview,
  fetchReviewActions,
  fetchRiskExposure,
  fetchScreener,
  fetchStockSearch,
  fetchStocks,
  fetchStorageExport,
  fetchStorageStatus,
  fetchSystemReadiness,
  fetchTimeline,
  fetchTrend,
  fetchWatchlist,
  fetchWatchlistSummary,
  importStorage,
  previewStorageImport,
  removeWatchlistSymbol,
  runRefreshJob,
  updateReviewActionStatus,
} from './lib/api'
import type {
  AlertItem,
  ChecklistItem,
  ConceptHeatItem,
  DataConnectorHealth,
  DataConnectorStatus,
  DataFreshnessStatus,
  DataQualityCheck,
  DataQualityOverview,
  DataQualityReport,
  DataRefreshJob,
  DataSource,
  Diagnosis,
  DiagnosisChangeItem,
  DiagnosisChangeReport,
  DiagnosisThesis,
  EvidenceItem,
  HotspotBrief,
  HotspotCandidate,
  IndustryHeatItem,
  MarketOverview,
  MomentumSignalItem,
  PeerComparison,
  PeerComparisonItem,
  PriceAlert,
  RankedDiagnosis,
  ResearchNote,
  ReportRecord,
  ReviewActionItem,
  ReviewActionOverview,
  ReviewActionPlan,
  ReviewActionStockSummary,
  RiskExposureItem,
  ScreenCandidate,
  StockSearchResult,
  StockSummary,
  StorageImportPayload,
  StorageImportPreview,
  StorageStatus,
  SystemReadiness,
  SystemReadinessCheck,
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
  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>([])
  const [watchlist, setWatchlist] = useState<StockSummary[]>([])
  const [overview, setOverview] = useState<MarketOverview | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [connectorHealth, setConnectorHealth] = useState<DataConnectorHealth | null>(null)
  const [freshness, setFreshness] = useState<DataFreshnessStatus | null>(null)
  const [refreshJobs, setRefreshJobs] = useState<DataRefreshJob[]>([])
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null)
  const [systemReadiness, setSystemReadiness] = useState<SystemReadiness | null>(null)
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
  const [reviewActionOverview, setReviewActionOverview] = useState<ReviewActionOverview | null>(null)
  const [dataQualityOverview, setDataQualityOverview] = useState<DataQualityOverview | null>(null)
  const [hotspotBrief, setHotspotBrief] = useState<HotspotBrief | null>(null)
  const [hotspotCandidates, setHotspotCandidates] = useState<HotspotCandidate[]>([])
  const [industryHeat, setIndustryHeat] = useState<IndustryHeatItem[]>([])
  const [conceptHeat, setConceptHeat] = useState<ConceptHeatItem[]>([])
  const [momentumSignals, setMomentumSignals] = useState<MomentumSignalItem[]>([])
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
  const [diagnosisChange, setDiagnosisChange] = useState<DiagnosisChangeReport | null>(null)
  const [thesis, setThesis] = useState<DiagnosisThesis | null>(null)
  const [reviewActions, setReviewActions] = useState<ReviewActionPlan | null>(null)
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStocks = useCallback(async () => {
    const [items, watchItems, market, sources, connectors, fresh, jobs, storage, readiness, qualityOverview, savedReports, momentum, brief, hotspotPool] = await Promise.all([
      fetchStocks(),
      fetchWatchlist(),
      fetchMarketOverview(),
      fetchDataSources(),
      fetchDataConnectorHealth(),
      fetchDataFreshness(),
      fetchRefreshJobs(),
      fetchStorageStatus(),
      fetchSystemReadiness(),
      fetchDataQualityOverview(),
      fetchReports(),
      fetchMomentumSignals(),
      fetchHotspotBrief(horizon),
      fetchHotspotCandidates(horizon),
    ])
    setStocks(items)
    setWatchlist(watchItems)
    setOverview(market)
    setDataSources(sources)
    setConnectorHealth(connectors)
    setFreshness(fresh)
    setRefreshJobs(jobs)
    setStorageStatus(storage)
    setSystemReadiness(readiness)
    setDataQualityOverview(qualityOverview)
    setReports(savedReports)
    setMomentumSignals(momentum)
    setHotspotBrief(brief)
    setHotspotCandidates(hotspotPool)
    if (!items.some((item) => item.symbol === selectedSymbol) && items[0]) {
      setSelectedSymbol(items[0].symbol)
    }
  }, [selectedSymbol, horizon])

  const loadDiagnosis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [result, quality, thesisResult, changeResult, actionPlan] = await Promise.all([
        fetchDiagnosis(selectedSymbol, horizon),
        fetchDataQuality(selectedSymbol),
        fetchDiagnosisThesis(selectedSymbol, horizon),
        fetchDiagnosisChange(selectedSymbol, horizon),
        fetchReviewActions(selectedSymbol, horizon),
      ])
      setDiagnosis(result)
      setDataQuality(quality)
      setThesis(thesisResult)
      setDiagnosisChange(changeResult)
      setReviewActions(actionPlan)
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
    const queryValue = query.trim()
    fetchStockSearch(queryValue)
      .then(setStockSearchResults)
      .catch((err) => setError(err instanceof Error ? err.message : '股票搜索失败'))
  }, [query, watchlist])

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
    fetchReviewActionOverview(horizon)
      .then(setReviewActionOverview)
      .catch((err) => setError(err instanceof Error ? err.message : '行动总览加载失败'))
  }, [horizon, watchlist])

  useEffect(() => {
    fetchIndustryHeat(horizon)
      .then(setIndustryHeat)
      .catch((err) => setError(err instanceof Error ? err.message : '行业热力加载失败'))
  }, [horizon])

  useEffect(() => {
    fetchConceptHeat(horizon)
      .then(setConceptHeat)
      .catch((err) => setError(err instanceof Error ? err.message : '题材热榜加载失败'))
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

  const addSearchResultToWatchlist = useCallback(async (symbol: string) => {
    setError(null)
    try {
      const nextWatchlist = await addWatchlistSymbol(symbol)
      setWatchlist(nextWatchlist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '自选股更新失败')
    }
  }, [])

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

  const setReviewActionStatus = useCallback(async (actionId: string, status: ReviewActionItem['status']) => {
    setError(null)
    try {
      const nextPlan = await updateReviewActionStatus(selectedSymbol, horizon, actionId, status)
      setReviewActions(nextPlan)
      const overviewResult = await fetchReviewActionOverview(horizon)
      setReviewActionOverview(overviewResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '行动状态更新失败')
    }
  }, [horizon, selectedSymbol])

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
      const readiness = await fetchSystemReadiness()
      setStorageStatus(result.storage)
      setSystemReadiness(readiness)
      await loadStocks()
      const [nextNotes, nextPriceAlerts] = await Promise.all([
        fetchNotes(selectedSymbol),
        fetchPriceAlerts(selectedSymbol),
      ])
      setNotes(nextNotes)
      setPriceAlerts(nextPriceAlerts)
      await loadDiagnosis()
      setStorageImportPreview(null)
      setStorageImportPayload(null)
      setStorageImportName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据导入失败')
    }
  }, [loadDiagnosis, loadStocks, selectedSymbol, storageImportPayload])

  const triggerRefreshJob = useCallback(async (scope: 'all' | 'watchlist') => {
    setError(null)
    try {
      const job = await runRefreshJob(scope)
      const [fresh, readiness] = await Promise.all([fetchDataFreshness(), fetchSystemReadiness()])
      setRefreshJobs((items) => [job, ...items.filter((item) => item.id !== job.id)].slice(0, 5))
      setFreshness(fresh)
      setSystemReadiness(readiness)
      await loadStocks()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新任务失败')
    }
  }, [loadStocks])

  return (
    <main className="app-shell">
      <StockList
        stocks={stocks}
        searchResults={stockSearchResults}
        watchlist={watchlist}
        selectedSymbol={selectedSymbol}
        query={query}
        onQueryChange={setQuery}
        onSelect={setSelectedSymbol}
        onAddToWatchlist={addSearchResultToWatchlist}
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

        <HotspotBriefPanel brief={hotspotBrief} onSelect={setSelectedSymbol} />

        <HotspotCandidatesPanel candidates={hotspotCandidates} onSelect={setSelectedSymbol} />

        <WatchlistSummaryPanel summary={watchlistSummary} onSelect={setSelectedSymbol} />

        <ReviewActionOverviewPanel overview={reviewActionOverview} onSelect={setSelectedSymbol} />

        <DataQualityOverviewPanel overview={dataQualityOverview} onSelect={setSelectedSymbol} />

        <IndustryHeatPanel items={industryHeat} onSelect={setSelectedSymbol} />

        <ConceptHeatPanel items={conceptHeat} onSelect={setSelectedSymbol} />

        <MomentumSignalPanel items={momentumSignals} onSelect={setSelectedSymbol} />

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

        <SystemReadinessPanel readiness={systemReadiness} />

        <DataConnectorPanel health={connectorHealth} freshness={freshness} jobs={refreshJobs} onRun={triggerRefreshJob} />

        {loading || !diagnosis ? (
          <div className="state-panel">
            <RefreshCw className="spin" size={20} />
            <span>正在生成诊断...</span>
          </div>
        ) : (
          <DiagnosisWorkspace
            diagnosis={diagnosis}
            overview={overview}
            dataSources={dataSources}
            trend={trend}
            peers={peers}
            dataQuality={dataQuality}
            thesis={thesis}
            diagnosisChange={diagnosisChange}
            reviewActions={reviewActions}
            onReviewActionStatus={setReviewActionStatus}
          />
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
    review_action_statuses: Array.isArray(record.review_action_statuses) ? record.review_action_statuses : [],
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

function SystemReadinessPanel({ readiness }: { readiness: SystemReadiness | null }) {
  return (
    <section className="panel readiness-panel">
      <div className="panel-title split-title">
        <span>
          <CheckCircle2 size={18} />
          <h3>系统就绪度</h3>
        </span>
        <small className={readiness ? readiness.status : 'warn'}>
          {readiness ? readinessStatusLabel(readiness.status) : '加载中'}
        </small>
      </div>
      {readiness ? (
        <>
          <div className="readiness-head">
            <strong>{readiness.score}</strong>
            <span>{readiness.summary}</span>
          </div>
          <div className="readiness-checks">
            {readiness.checks.map((check) => (
              <ReadinessCheckRow key={check.key} check={check} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在汇总系统就绪状态...</p>
      )}
    </section>
  )
}

function ReadinessCheckRow({ check }: { check: SystemReadinessCheck }) {
  return (
    <article className={`readiness-check ${check.status}`}>
      <div>
        <strong>{check.label}</strong>
        <em>{readinessStatusLabel(check.status)}</em>
      </div>
      <p>{check.detail}</p>
      <small>{check.next_action}</small>
    </article>
  )
}

function readinessStatusLabel(status: SystemReadiness['status']) {
  if (status === 'pass') return '正常'
  if (status === 'warn') return '待完善'
  return '阻断'
}

function DataConnectorPanel({
  health,
  freshness,
  jobs,
  onRun,
}: {
  health: DataConnectorHealth | null
  freshness: DataFreshnessStatus | null
  jobs: DataRefreshJob[]
  onRun: (scope: 'all' | 'watchlist') => void
}) {
  return (
    <section className="panel connector-panel">
      <div className="panel-title split-title">
        <span>
          <Database size={18} />
          <h3>数据连接器</h3>
        </span>
        <small>{health ? `当前 ${health.active_provider}` : '加载中'}</small>
      </div>
      {health ? (
        <>
          <div className="connector-summary">
            <span>回退源</span>
            <strong>{health.fallback_provider}</strong>
            <button type="button" onClick={() => onRun('all')}>
              <RefreshCw size={15} />
              <span>刷新全部</span>
            </button>
            <button type="button" onClick={() => onRun('watchlist')}>
              <RefreshCw size={15} />
              <span>刷新自选</span>
            </button>
          </div>
          <div className="connector-list">
            {health.connectors.map((connector) => (
              <ConnectorRow key={connector.name} connector={connector} />
            ))}
          </div>
          <FreshnessPanel freshness={freshness} />
          <RefreshJobList jobs={jobs} />
        </>
      ) : (
        <p className="empty-text">正在检查数据连接器...</p>
      )}
    </section>
  )
}

function FreshnessPanel({ freshness }: { freshness: DataFreshnessStatus | null }) {
  return (
    <div className="freshness-panel">
      <div className="freshness-title">
        <strong>数据新鲜度</strong>
        <em className={freshness ? freshness.status : 'unknown'}>
          {freshness ? freshnessStatusLabel(freshness.status) : '加载中'}
        </em>
      </div>
      {freshness ? (
        <>
          <div className="freshness-metrics">
            <span>
              <small>覆盖率</small>
              <b>{freshness.coverage_pct.toFixed(1)}%</b>
            </span>
            <span>
              <small>刷新年龄</small>
              <b>{freshness.age_minutes === null ? '--' : `${freshness.age_minutes} 分钟`}</b>
            </span>
            <span>
              <small>覆盖标的</small>
              <b>{freshness.last_stock_count}/{freshness.expected_stock_count}</b>
            </span>
          </div>
          <p>{freshness.message}</p>
          <small>{freshness.next_action}</small>
        </>
      ) : (
        <p className="empty-text">正在计算数据新鲜度...</p>
      )}
    </div>
  )
}

function freshnessStatusLabel(status: DataFreshnessStatus['status']) {
  if (status === 'fresh') return '新鲜'
  if (status === 'stale') return '偏旧'
  if (status === 'expired') return '过期'
  return '未知'
}

function RefreshJobList({ jobs }: { jobs: DataRefreshJob[] }) {
  return (
    <div className="refresh-job-list">
      <div className="refresh-job-title">
        <strong>刷新记录</strong>
        <span>{jobs.length ? `${jobs.length} 条` : '暂无'}</span>
      </div>
      {jobs.length === 0 ? (
        <p className="empty-text">尚未运行刷新任务</p>
      ) : (
        jobs.map((job) => (
          <article key={job.id} className={`refresh-job-row ${job.status}`}>
            <span>
              <strong>{job.provider}</strong>
              <small>{formatReportTime(job.finished_at)} · {job.duration_ms} ms</small>
            </span>
            <em>{job.status === 'success' ? '成功' : '失败'}</em>
            <p>{job.message}</p>
          </article>
        ))
      )}
    </div>
  )
}

function ConnectorRow({ connector }: { connector: DataConnectorStatus }) {
  return (
    <article className={`connector-row ${connector.status}`}>
      <div>
        <strong>{connector.name}</strong>
        <span>{connector.role}</span>
      </div>
      <em>{connector.active ? '启用' : connectorStatusLabel(connector.status)}</em>
      <p>{connector.message}</p>
      <small>{connector.next_action}</small>
    </article>
  )
}

function connectorStatusLabel(status: DataConnectorStatus['status']) {
  if (status === 'online') return '在线'
  if (status === 'fallback') return '备用'
  if (status === 'missing-package') return '缺包'
  if (status === 'planned') return '规划'
  return '异常'
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

function ReviewActionOverviewPanel({
  overview,
  onSelect,
}: {
  overview: ReviewActionOverview | null
  onSelect: (symbol: string) => void
}) {
  return (
    <section className="panel action-overview-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>行动总览</h3>
        </span>
        <small>{overview ? `${overview.stock_count} 只` : '加载中'}</small>
      </div>
      {overview ? (
        <>
          <div className="action-overview-metrics">
            <SummaryMetric label="待处理" value={overview.pending_count} />
            <SummaryMetric label="观察中" value={overview.watching_count} />
            <SummaryMetric label="已完成" value={overview.done_count} />
          </div>
          {overview.summaries.length ? (
            <div className="action-overview-list">
              {overview.summaries.slice(0, 5).map((item) => (
                <ActionOverviewRow key={item.symbol} item={item} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            <p className="empty-text">当前自选股暂无复盘动作</p>
          )}
        </>
      ) : (
        <p className="empty-text">正在汇总自选股行动...</p>
      )}
    </section>
  )
}

function ActionOverviewRow({
  item,
  onSelect,
}: {
  item: ReviewActionStockSummary
  onSelect: (symbol: string) => void
}) {
  return (
    <button type="button" className={`action-overview-row ${item.top_priority}`} onClick={() => onSelect(item.symbol)}>
      <span>
        <strong>{item.name}</strong>
        <small>{item.symbol} · {item.industry || '自选股'} · {item.item_count} 项</small>
      </span>
      <span>
        <b>{item.top_action}</b>
        <small>{item.top_detail}</small>
      </span>
      <em>{priorityLabel(item.top_priority)}</em>
    </button>
  )
}

function DataQualityOverviewPanel({
  overview,
  onSelect,
}: {
  overview: DataQualityOverview | null
  onSelect: (symbol: string) => void
}) {
  return (
    <section className="panel quality-overview-panel">
      <div className="panel-title split-title">
        <span>
          <CheckCircle2 size={18} />
          <h3>数据质量总览</h3>
        </span>
        <small>{overview ? `${overview.stock_count} 只` : '加载中'}</small>
      </div>
      {overview ? (
        <>
          <div className="quality-overview-metrics">
            <SummaryMetric label="平均质量" value={overview.average_score.toFixed(1)} />
            <SummaryMetric label="可靠" value={overview.pass_count} />
            <SummaryMetric label="关注" value={overview.warn_count} />
            <SummaryMetric label="异常" value={overview.fail_count} />
          </div>
          {overview.lowest_report ? (
            <button
              type="button"
              className={`quality-lowest ${overview.lowest_report.status}`}
              onClick={() => onSelect(overview.lowest_report!.symbol)}
            >
              <span>
                <strong>{overview.lowest_report.name}</strong>
                <small>{overview.lowest_report.symbol} · {overview.lowest_report.summary}</small>
              </span>
              <em>{overview.lowest_report.score}</em>
            </button>
          ) : (
            <p className="empty-text">暂无可检查标的</p>
          )}
        </>
      ) : (
        <p className="empty-text">正在汇总自选股数据质量...</p>
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

function HotspotBriefPanel({ brief, onSelect }: { brief: HotspotBrief | null; onSelect: (symbol: string) => void }) {
  return (
    <section className={`panel hotspot-brief-panel ${brief?.status ?? 'neutral'}`}>
      <div className="panel-title split-title">
        <span>
          <BellRing size={18} />
          <h3>热点总览</h3>
        </span>
        <small>{brief ? hotspotStatusLabel(brief.status) : '加载中'}</small>
      </div>
      {brief ? (
        <>
          <p>{brief.summary}</p>
          <div className="hotspot-brief-grid">
            <HotspotBriefMetric label="行业主线" value={brief.top_industry?.industry ?? '--'} score={brief.top_industry?.heat_score} />
            <HotspotBriefMetric label="题材焦点" value={brief.top_concept?.concept ?? '--'} score={brief.top_concept?.heat_score} />
            <HotspotBriefMetric label="异动代表" value={brief.top_signal?.name ?? '--'} score={brief.top_signal?.signal_score} />
          </div>
          {brief.focus_symbols.length ? (
            <div className="hotspot-focus">
              {brief.focus_symbols.map((symbol) => (
                <button type="button" key={symbol} onClick={() => onSelect(symbol)}>
                  {symbol}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty-text">正在提炼热点主线...</p>
      )}
    </section>
  )
}

function HotspotBriefMetric({ label, value, score }: { label: string; value: string; score?: number }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{score ?? '--'}</em>
    </span>
  )
}

function HotspotCandidatesPanel({ candidates, onSelect }: { candidates: HotspotCandidate[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel hotspot-candidates-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>热点选股池</h3>
        </span>
        <small>{candidates.length ? `${candidates.length} 只候选` : '暂无候选'}</small>
      </div>
      {candidates.length === 0 ? (
        <p className="empty-text">当前没有满足热点观察条件的标的</p>
      ) : (
        <div className="hotspot-candidate-list">
          {candidates.map((item) => (
            <button type="button" key={item.symbol} className="hotspot-candidate-row" onClick={() => onSelect(item.symbol)}>
              <strong>{item.heat_score}</strong>
              <span>
                <b>{item.name}</b>
                <small>{item.symbol} · {item.concept} · {item.industry}</small>
              </span>
              <em className={item.change_pct >= 0 ? 'up' : 'down'}>
                {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
              </em>
              <small>诊断 {item.diagnosis_score} · 异动 {item.signal_score}</small>
              <p>{item.reason}</p>
            </button>
          ))}
        </div>
      )}
    </section>
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
                <small>{item.stock_count} 只 · {item.momentum_label} · 高优先预警 {item.high_alert_count}</small>
              </span>
              <span className="heat-meter" aria-label={`${item.industry} 热度 ${item.heat_score}`}>
                <i style={{ width: `${Math.max(8, Math.min(item.heat_score, 100))}%` }} />
              </span>
              <b>{item.heat_score}</b>
              <em className={item.average_change_pct >= 0 ? 'up' : 'down'}>
                {item.average_change_pct >= 0 ? '+' : ''}{item.average_change_pct.toFixed(2)}%
              </em>
              <small>{item.top_name} {item.top_score} · 资金 {formatSignedNumber(item.average_main_inflow_million)}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ConceptHeatPanel({ items, onSelect }: { items: ConceptHeatItem[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel concept-heat-panel">
      <div className="panel-title split-title">
        <span>
          <Star size={18} />
          <h3>题材热榜</h3>
        </span>
        <small>{items.length ? `${items.length} 个题材` : '加载中'}</small>
      </div>
      {items.length === 0 ? (
        <p className="empty-text">正在归因题材热度...</p>
      ) : (
        <div className="concept-heat-list">
          {items.map((item) => (
            <button type="button" key={item.concept} className={`concept-heat-row ${item.heat_level}`} onClick={() => onSelect(item.top_symbol)}>
              <strong>{item.heat_score}</strong>
              <span>
                <b>{item.concept}</b>
                <small>{item.stock_count} 只 · {item.top_name} · {item.reason}</small>
              </span>
              <em className={item.average_change_pct >= 0 ? 'up' : 'down'}>
                {item.average_change_pct >= 0 ? '+' : ''}{item.average_change_pct.toFixed(2)}%
              </em>
              <small>资金 {formatSignedNumber(item.average_main_inflow_million)}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function MomentumSignalPanel({ items, onSelect }: { items: MomentumSignalItem[]; onSelect: (symbol: string) => void }) {
  return (
    <section className="panel momentum-panel">
      <div className="panel-title split-title">
        <span>
          <BellRing size={18} />
          <h3>异动雷达</h3>
        </span>
        <small>{items.length ? `${items.length} 条信号` : '暂无异动'}</small>
      </div>
      {items.length === 0 ? (
        <p className="empty-text">当前没有明显短线异动</p>
      ) : (
        <div className="momentum-list">
          {items.map((item) => (
            <button type="button" key={item.symbol} className={`momentum-row ${item.signal_level}`} onClick={() => onSelect(item.symbol)}>
              <strong>{item.signal_score}</strong>
              <span>
                <b>{item.name}</b>
                <small>{item.symbol} · {item.industry} · {item.title}</small>
                <small>{item.reason}</small>
              </span>
              <em className={item.change_pct >= 0 ? 'up' : 'down'}>
                {item.change_pct >= 0 ? '+' : ''}{item.change_pct.toFixed(2)}%
              </em>
              <small>量比 {item.volume_ratio.toFixed(2)} · 资金 {formatSignedNumber(item.main_inflow_million)}</small>
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
  dataQuality,
  thesis,
  diagnosisChange,
  reviewActions,
  onReviewActionStatus,
}: {
  diagnosis: Diagnosis
  overview: MarketOverview | null
  dataSources: DataSource[]
  trend: TrendSeries | null
  peers: PeerComparison | null
  dataQuality: DataQualityReport | null
  thesis: DiagnosisThesis | null
  diagnosisChange: DiagnosisChangeReport | null
  reviewActions: ReviewActionPlan | null
  onReviewActionStatus: (actionId: string, status: ReviewActionItem['status']) => void
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

      <DiagnosisChangePanel report={diagnosisChange} />

      <ReviewActionsPanel plan={reviewActions} onStatusChange={onReviewActionStatus} />

      <DataQualityPanel report={dataQuality} />

      <ThesisPanel thesis={thesis} />

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

function ReviewActionsPanel({
  plan,
  onStatusChange,
}: {
  plan: ReviewActionPlan | null
  onStatusChange: (actionId: string, status: ReviewActionItem['status']) => void
}) {
  const visibleItems = plan ? plan.items.slice(0, 8) : []
  return (
    <section className="panel review-actions-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>复盘行动</h3>
        </span>
        <small>{plan ? `${plan.items.length} 项` : '加载中'}</small>
      </div>
      {plan ? (
        <>
          <div className="review-action-stats">
            <ActionStat label="高优先" value={plan.high_count} priority="high" />
            <ActionStat label="待观察" value={plan.medium_count} priority="medium" />
            <ActionStat label="低优先" value={plan.low_count} priority="low" />
          </div>
          <div className="review-progress-stats">
            <span>
              <small>待处理</small>
              <strong>{plan.pending_count}</strong>
            </span>
            <span>
              <small>观察中</small>
              <strong>{plan.watching_count}</strong>
            </span>
            <span>
              <small>已完成</small>
              <strong>{plan.done_count}</strong>
            </span>
          </div>
          <div className="review-action-list">
            {visibleItems.map((item) => (
              <ReviewActionRow key={item.id} item={item} onStatusChange={onStatusChange} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在生成复盘行动...</p>
      )}
    </section>
  )
}

function ActionStat({ label, value, priority }: { label: string; value: number; priority: ReviewActionItem['priority'] }) {
  return (
    <span className={priority}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function ReviewActionRow({
  item,
  onStatusChange,
}: {
  item: ReviewActionItem
  onStatusChange: (actionId: string, status: ReviewActionItem['status']) => void
}) {
  return (
    <article className={`review-action ${item.priority} ${item.status}`}>
      <div>
        <span>{item.category}</span>
        <em>{reviewStatusLabel(item.status)}</em>
      </div>
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
      <div className="review-action-controls">
        {(['pending', 'watching', 'done'] as ReviewActionItem['status'][]).map((status) => (
          <button
            key={status}
            type="button"
            className={item.status === status ? 'selected' : ''}
            onClick={() => onStatusChange(item.id, status)}
          >
            {reviewStatusLabel(status)}
          </button>
        ))}
      </div>
    </article>
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

function DataQualityPanel({ report }: { report: DataQualityReport | null }) {
  return (
    <section className="panel data-quality-panel">
      <div className="panel-title split-title">
        <span>
          <CheckCircle2 size={18} />
          <h3>数据质量</h3>
        </span>
        <small className={report ? report.status : 'warn'}>
          {report ? qualityStatusLabel(report.status) : '加载中'}
        </small>
      </div>
      {report ? (
        <>
          <div className="quality-head">
            <strong>{report.score}</strong>
            <span>
              <b>{report.coverage_pct.toFixed(1)}%</b>
              <small>{report.summary}</small>
            </span>
          </div>
          <div className="quality-checks">
            {report.checks.map((check) => (
              <DataQualityCheckRow key={check.key} check={check} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在检查诊断数据质量...</p>
      )}
    </section>
  )
}

function DataQualityCheckRow({ check }: { check: DataQualityCheck }) {
  return (
    <article className={`quality-check ${check.status}`}>
      <div>
        <strong>{check.label}</strong>
        <em>{qualityStatusLabel(check.status)}</em>
      </div>
      <p>{check.detail}</p>
      <small>{check.impact}</small>
    </article>
  )
}

function qualityStatusLabel(status: DataQualityReport['status']) {
  if (status === 'pass') return '可靠'
  if (status === 'warn') return '关注'
  return '异常'
}

function DiagnosisChangePanel({ report }: { report: DiagnosisChangeReport | null }) {
  return (
    <section className="panel diagnosis-change-panel">
      <div className="panel-title split-title">
        <span>
          <CalendarClock size={18} />
          <h3>诊断变化</h3>
        </span>
        <small className={report ? report.status : 'baseline'}>
          {report ? changeStatusLabel(report.status) : '加载中'}
        </small>
      </div>
      {report ? (
        <>
          <div className="change-head">
            <strong>{formatDelta(report.score_delta)}</strong>
            <span>
              <b>{report.summary}</b>
              <small>
                {report.previous_generated_at ? `对比 ${formatReportTime(report.previous_generated_at)}` : '当前为首份复盘基线'}
              </small>
            </span>
          </div>
          <div className="change-grid">
            <ChangeMetric label="技术" value={report.technical_delta} />
            <ChangeMetric label="估值" value={report.valuation_delta} />
            <ChangeMetric label="资金" value={report.capital_delta} />
            <ChangeMetric label="风险" value={report.risk_delta} />
          </div>
          <div className="change-list">
            {report.changes.map((item) => (
              <ChangeItemRow key={item.key} item={item} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在对比历史诊断...</p>
      )}
    </section>
  )
}

function ChangeMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className={value > 0 ? 'up' : value < 0 ? 'down' : ''}>
      <small>{label}</small>
      <strong>{formatDelta(value)}</strong>
    </span>
  )
}

function ChangeItemRow({ item }: { item: DiagnosisChangeItem }) {
  return (
    <article className={`change-item ${item.direction}`}>
      <strong>{item.label}</strong>
      <span>{item.detail}</span>
    </article>
  )
}

function changeStatusLabel(status: DiagnosisChangeReport['status']) {
  if (status === 'baseline') return '基线'
  if (status === 'improved') return '增强'
  if (status === 'weakened') return '转弱'
  if (status === 'flat') return '持平'
  return '变化'
}

function formatDelta(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function ThesisPanel({ thesis }: { thesis: DiagnosisThesis | null }) {
  return (
    <section className="panel thesis-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>诊断论证</h3>
        </span>
        <small className={thesis ? thesis.stance : 'balanced'}>
          {thesis ? thesisStanceLabel(thesis.stance) : '加载中'}
        </small>
      </div>
      {thesis ? (
        <>
          <div className="thesis-head">
            <strong>{thesis.confidence}</strong>
            <span>
              <b>{thesis.trigger}</b>
              <small>{thesis.invalidation}</small>
            </span>
          </div>
          <div className="thesis-cases">
            <article>
              <strong>多头假设</strong>
              <p>{thesis.bull_case}</p>
            </article>
            <article>
              <strong>空头假设</strong>
              <p>{thesis.bear_case}</p>
            </article>
          </div>
          <div className="thesis-evidence-list">
            {thesis.evidence.map((item) => (
              <article key={`${item.side}-${item.label}`} className={`thesis-evidence ${item.side}`}>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <em>{item.weight}</em>
              </article>
            ))}
          </div>
          <div className="thesis-next">
            {thesis.next_checks.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在生成诊断论证...</p>
      )}
    </section>
  )
}

function thesisStanceLabel(stance: DiagnosisThesis['stance']) {
  if (stance === 'bullish') return '偏多'
  if (stance === 'defensive') return '防御'
  return '均衡'
}

function priorityLabel(priority: ChecklistItem['priority']) {
  if (priority === 'high') return '高优先'
  if (priority === 'medium') return '观察'
  return '低优先'
}

function reviewStatusLabel(status: ReviewActionItem['status']) {
  if (status === 'done') return '完成'
  if (status === 'watching') return '观察中'
  return '待处理'
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

function formatSignedNumber(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}`
}

function hotspotStatusLabel(status: HotspotBrief['status']) {
  const labels: Record<HotspotBrief['status'], string> = {
    hot: '热点强',
    warm: '温和扩散',
    neutral: '分化观察',
    cool: '动能偏弱',
  }
  return labels[status]
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
