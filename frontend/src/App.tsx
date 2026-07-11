import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StockList } from './components/StockList'
import { DiagnosisWorkspace } from './components/diagnosis/DiagnosisPanels'
import {
  ConceptHeatPanel,
  HotspotBriefPanel,
  HotspotCandidatesPanel,
  HotspotReviewActionsPanel,
  IndustryHeatPanel,
  MomentumSignalPanel,
} from './components/hotspots/HotspotPanels'
import { PriceAlertsPanel, ReportHistory, ResearchNotesPanel } from './components/research/ResearchPanels'
import {
  AlertCenter,
  DataQualityOverviewPanel,
  RankingPanel,
  ReviewActionOverviewPanel,
  RiskExposurePanel,
  ScreenerPanel,
  StrategyBacktestPanel,
  TimelinePanel,
  WatchlistSummaryPanel,
} from './components/screeners/ScreenerPanels'
import {
  DataConnectorPanel,
  SystemReadinessPanel,
  SystemStoragePanel,
} from './components/system/SystemPanels'
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
  fetchHotspotReviewActions,
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
  fetchPortfolioRisk,
  fetchScreener,
  fetchStrategyBacktest,
  fetchStrategyBacktestComparison,
  fetchStrategyBacktestPresetComparison,
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
  updateHotspotReviewActionStatus,
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
  HotspotReviewAction,
  HotspotReviewPlan,
  IndustryHeatItem,
  MarketOverview,
  MomentumSignalItem,
  PeerComparison,
  PeerComparisonItem,
  PortfolioRiskReport,
  PriceAlert,
  RankedDiagnosis,
  ResearchNote,
  ReportRecord,
  ReviewActionItem,
  ReviewActionOverview,
  ReviewActionPlan,
  ReviewActionStockSummary,
  ScreenCandidate,
  StockSearchResult,
  StockSummary,
  StrategyBacktestComparison,
  StrategyBacktestPresetComparison,
  StrategyBacktestReport,
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

const hotspotModes = [
  { value: 'balanced', label: '综合' },
  { value: 'capital', label: '资金' },
  { value: 'momentum', label: '异动' },
]

const BACKTEST_PARAMETERS_STORAGE_KEY = 'stock-doctor-backtest-parameters-v1'

type BacktestParameters = {
  holding_days: number
  fee_bps: number
  slippage_bps: number
  limit: number
}

const DEFAULT_BACKTEST_PARAMETERS: BacktestParameters = {
  holding_days: 5,
  fee_bps: 5,
  slippage_bps: 10,
  limit: 8,
}

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
  const [strategyBacktest, setStrategyBacktest] = useState<StrategyBacktestReport | null>(null)
  const [strategyBacktestComparison, setStrategyBacktestComparison] = useState<StrategyBacktestComparison | null>(null)
  const [strategyBacktestPresetComparison, setStrategyBacktestPresetComparison] = useState<StrategyBacktestPresetComparison | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [watchlistSummary, setWatchlistSummary] = useState<WatchlistSummary | null>(null)
  const [reviewActionOverview, setReviewActionOverview] = useState<ReviewActionOverview | null>(null)
  const [dataQualityOverview, setDataQualityOverview] = useState<DataQualityOverview | null>(null)
  const [hotspotBrief, setHotspotBrief] = useState<HotspotBrief | null>(null)
  const [hotspotCandidates, setHotspotCandidates] = useState<HotspotCandidate[]>([])
  const [hotspotReviewPlan, setHotspotReviewPlan] = useState<HotspotReviewPlan | null>(null)
  const [hotspotCandidatesError, setHotspotCandidatesError] = useState<string | null>(null)
  const [industryHeat, setIndustryHeat] = useState<IndustryHeatItem[]>([])
  const [conceptHeat, setConceptHeat] = useState<ConceptHeatItem[]>([])
  const [momentumSignals, setMomentumSignals] = useState<MomentumSignalItem[]>([])
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRiskReport | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [trend, setTrend] = useState<TrendSeries | null>(null)
  const [peers, setPeers] = useState<PeerComparison | null>(null)
  const [rankingSort, setRankingSort] = useState('total')
  const [screenerPreset, setScreenerPreset] = useState('strong')
  const [hotspotMode, setHotspotMode] = useState('balanced')
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, string>>({})
  const [storedBacktestParameters] = useState(readStoredBacktestParameters)
  const [backtestHoldingDays, setBacktestHoldingDays] = useState(storedBacktestParameters.holding_days)
  const [backtestFeeBps, setBacktestFeeBps] = useState(storedBacktestParameters.fee_bps)
  const [backtestSlippageBps, setBacktestSlippageBps] = useState(storedBacktestParameters.slippage_bps)
  const [backtestLimit, setBacktestLimit] = useState(storedBacktestParameters.limit)
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
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null)
  const [screenerError, setScreenerError] = useState<string | null>(null)
  const [strategyBacktestError, setStrategyBacktestError] = useState<string | null>(null)
  const [strategyBacktestComparisonError, setStrategyBacktestComparisonError] = useState<string | null>(null)
  const [strategyBacktestPresetComparisonError, setStrategyBacktestPresetComparisonError] = useState<string | null>(null)
  const [refreshingScope, setRefreshingScope] = useState<'all' | 'watchlist' | null>(null)
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [exportingReportPackage, setExportingReportPackage] = useState(false)
  const [updatingReviewActionId, setUpdatingReviewActionId] = useState<string | null>(null)
  const [updatingHotspotActionId, setUpdatingHotspotActionId] = useState<string | null>(null)
  const [addingSearchWatchlistSymbol, setAddingSearchWatchlistSymbol] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [savingPriceAlert, setSavingPriceAlert] = useState(false)
  const [deletingPriceAlertId, setDeletingPriceAlertId] = useState<string | null>(null)
  const [exportingStorage, setExportingStorage] = useState(false)
  const [previewingImport, setPreviewingImport] = useState(false)
  const [applyingImport, setApplyingImport] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [priceAlertError, setPriceAlertError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    writeStoredBacktestParameters({
      holding_days: backtestHoldingDays,
      fee_bps: backtestFeeBps,
      slippage_bps: backtestSlippageBps,
      limit: backtestLimit,
    })
  }, [backtestFeeBps, backtestHoldingDays, backtestLimit, backtestSlippageBps])

  const loadStocks = useCallback(async () => {
    const [items, watchItems, market, sources, connectors, fresh, jobs, storage, readiness, qualityOverview, savedReports, momentum, brief, hotspotActions] = await Promise.all([
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
      fetchHotspotReviewActions(horizon, hotspotMode),
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
    setHotspotReviewPlan(hotspotActions)
    if (!items.some((item) => item.symbol === selectedSymbol) && items[0]) {
      setSelectedSymbol(items[0].symbol)
    }
  }, [selectedSymbol, horizon, hotspotMode])

  const loadDiagnosis = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDiagnosisError(null)
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
      const message = err instanceof Error ? err.message : '未知错误'
      setDiagnosisError(message)
      setDiagnosis(null)
      setDataQuality(null)
      setThesis(null)
      setDiagnosisChange(null)
      setReviewActions(null)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [selectedSymbol, horizon])

  const loadScreenerCandidates = useCallback(async () => {
    setScreenerError(null)
    try {
      const candidates = await fetchScreener(screenerPreset, horizon)
      setScreenCandidates(candidates)
    } catch (err) {
      const message = err instanceof Error ? err.message : '策略股票池加载失败'
      setScreenerError(message)
      setScreenCandidates([])
      setError(message)
    }
  }, [horizon, screenerPreset])

  const loadStrategyBacktest = useCallback(async () => {
    setStrategyBacktestError(null)
    setStrategyBacktestComparisonError(null)
    setStrategyBacktestPresetComparisonError(null)
    try {
      const report = await fetchStrategyBacktest(screenerPreset, horizon, backtestHoldingDays, backtestFeeBps, backtestSlippageBps, backtestLimit)
      setStrategyBacktest(report)
      try {
        const comparison = await fetchStrategyBacktestComparison(screenerPreset, horizon, backtestFeeBps, backtestSlippageBps, backtestLimit)
        setStrategyBacktestComparison(comparison)
      } catch (err) {
        const message = err instanceof Error ? err.message : '周期对比加载失败'
        setStrategyBacktestComparisonError(message)
        setStrategyBacktestComparison(null)
      }
      try {
        const presetComparison = await fetchStrategyBacktestPresetComparison(horizon, backtestHoldingDays, backtestFeeBps, backtestSlippageBps, backtestLimit)
        setStrategyBacktestPresetComparison(presetComparison)
      } catch (err) {
        const message = err instanceof Error ? err.message : '策略对比加载失败'
        setStrategyBacktestPresetComparisonError(message)
        setStrategyBacktestPresetComparison(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '策略回测加载失败'
      setStrategyBacktestError(message)
      setStrategyBacktest(null)
      setStrategyBacktestComparison(null)
      setStrategyBacktestPresetComparison(null)
      setError(message)
    }
  }, [backtestFeeBps, backtestHoldingDays, backtestLimit, backtestSlippageBps, horizon, screenerPreset])

  const setPortfolioWeight = useCallback((symbol: string, value: string) => {
    setPortfolioWeights((current) => {
      const next = { ...current }
      if (value.trim() === '') {
        delete next[symbol]
      } else {
        next[symbol] = value
      }
      return next
    })
  }, [])

  const loadHotspotCandidatePool = useCallback(async () => {
    setHotspotCandidatesError(null)
    try {
      const candidates = await fetchHotspotCandidates(horizon, hotspotMode)
      setHotspotCandidates(candidates)
    } catch (err) {
      const message = err instanceof Error ? err.message : '热点选股池加载失败'
      setHotspotCandidatesError(message)
      setHotspotCandidates([])
      setError(message)
    }
  }, [horizon, hotspotMode])

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
    loadScreenerCandidates()
  }, [loadScreenerCandidates])

  useEffect(() => {
    loadStrategyBacktest()
  }, [loadStrategyBacktest])

  useEffect(() => {
    loadHotspotCandidatePool()
  }, [loadHotspotCandidatePool])

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
    fetchPortfolioRisk(horizon, 'watchlist', portfolioWeights)
      .then(setPortfolioRisk)
      .catch((err) => setError(err instanceof Error ? err.message : '风险敞口加载失败'))
  }, [horizon, watchlist, portfolioWeights])

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
    setUpdatingWatchlist(true)
    try {
      const nextWatchlist = isInWatchlist
        ? await removeWatchlistSymbol(selectedSymbol)
        : await addWatchlistSymbol(selectedSymbol)
      setWatchlist(nextWatchlist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '自选股更新失败')
    } finally {
      setUpdatingWatchlist(false)
    }
  }, [isInWatchlist, selectedSymbol])

  const addSearchResultToWatchlist = useCallback(async (symbol: string) => {
    setError(null)
    setAddingSearchWatchlistSymbol(symbol)
    try {
      const nextWatchlist = await addWatchlistSymbol(symbol)
      setWatchlist(nextWatchlist)
    } catch (err) {
      setError(err instanceof Error ? err.message : '自选股更新失败')
    } finally {
      setAddingSearchWatchlistSymbol(null)
    }
  }, [])

  const saveCurrentReport = useCallback(async () => {
    setError(null)
    setSavingReport(true)
    try {
      const report = await createReport(selectedSymbol, horizon)
      setReports((items) => [report, ...items.filter((item) => item.id !== report.id)].slice(0, 20))
    } catch (err) {
      setError(err instanceof Error ? err.message : '报告保存失败')
    } finally {
      setSavingReport(false)
    }
  }, [horizon, selectedSymbol])

  const buildCurrentResearchReportPayload = useCallback(() => {
    if (!diagnosis) return null
    const exportedAt = new Date().toISOString()
    return {
        version: 'stock-doctor-report-v2',
        exported_at: exportedAt,
        symbol: selectedSymbol,
        horizon,
        diagnosis,
        diagnosis_change: diagnosisChange,
        portfolio_risk: portfolioRisk,
        portfolio_weight_inputs: portfolioWeights,
        strategy_backtest: strategyBacktest,
        strategy_backtest_parameters: {
          fee_bps: backtestFeeBps,
          slippage_bps: backtestSlippageBps,
          limit: backtestLimit,
          holding_days: backtestHoldingDays,
        },
        strategy_preset_comparison: strategyBacktestPresetComparison,
        data_quality: dataQuality,
        data_trust: {
          sources: dataSources,
          connector_health: connectorHealth,
          freshness,
          refresh_jobs: refreshJobs,
        },
      }
  }, [backtestFeeBps, backtestHoldingDays, backtestLimit, backtestSlippageBps, connectorHealth, dataQuality, dataSources, diagnosis, diagnosisChange, freshness, horizon, portfolioRisk, portfolioWeights, refreshJobs, selectedSymbol, strategyBacktest, strategyBacktestPresetComparison])

  const exportCurrentResearchReport = useCallback(() => {
    const payload = buildCurrentResearchReportPayload()
    if (!payload) return
    setError(null)
    setExportingReportPackage(true)
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `stock-doctor-report-${selectedSymbol}-${payload.exported_at.slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '研究报告导出失败')
    } finally {
      setExportingReportPackage(false)
    }
  }, [buildCurrentResearchReportPayload, selectedSymbol])

  const exportCurrentResearchReportHtml = useCallback(() => {
    const payload = buildCurrentResearchReportPayload()
    if (!payload) return
    setError(null)
    setExportingReportPackage(true)
    try {
      const html = buildResearchReportHtml(payload)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `stock-doctor-report-${selectedSymbol}-${payload.exported_at.slice(0, 10)}.html`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HTML 报告导出失败')
    } finally {
      setExportingReportPackage(false)
    }
  }, [buildCurrentResearchReportPayload, selectedSymbol])

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
    setNoteError(null)
    setSavingNote(true)
    try {
      const note = await createNote(selectedSymbol, body)
      setNotes((items) => [note, ...items])
      setNoteDraft('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '研究笔记保存失败'
      setNoteError(message)
      setError(message)
    } finally {
      setSavingNote(false)
    }
  }, [noteDraft, selectedSymbol])

  const removeNote = useCallback(async (noteId: string) => {
    setError(null)
    setNoteError(null)
    setDeletingNoteId(noteId)
    try {
      await deleteNote(noteId)
      setNotes((items) => items.filter((item) => item.id !== noteId))
    } catch (err) {
      const message = err instanceof Error ? err.message : '研究笔记删除失败'
      setNoteError(message)
      setError(message)
    } finally {
      setDeletingNoteId(null)
    }
  }, [])

  const savePriceAlert = useCallback(async (targetPrice: number, direction: PriceAlert['direction'], label: string) => {
    setError(null)
    setPriceAlertError(null)
    setSavingPriceAlert(true)
    try {
      const alert = await createPriceAlert(selectedSymbol, targetPrice, direction, label)
      setPriceAlerts((items) => [alert, ...items])
      setPriceAlertDraft('')
    } catch (err) {
      const message = err instanceof Error ? err.message : '价位提醒保存失败'
      setPriceAlertError(message)
      setError(message)
    } finally {
      setSavingPriceAlert(false)
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
    setPriceAlertError(null)
    setDeletingPriceAlertId(alertId)
    try {
      await deletePriceAlert(alertId)
      setPriceAlerts((items) => items.filter((item) => item.id !== alertId))
    } catch (err) {
      const message = err instanceof Error ? err.message : '价位提醒删除失败'
      setPriceAlertError(message)
      setError(message)
    } finally {
      setDeletingPriceAlertId(null)
    }
  }, [])

  const setReviewActionStatus = useCallback(async (actionId: string, status: ReviewActionItem['status']) => {
    setError(null)
    setUpdatingReviewActionId(actionId)
    try {
      const nextPlan = await updateReviewActionStatus(selectedSymbol, horizon, actionId, status)
      setReviewActions(nextPlan)
      const overviewResult = await fetchReviewActionOverview(horizon)
      setReviewActionOverview(overviewResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : '行动状态更新失败')
    } finally {
      setUpdatingReviewActionId(null)
    }
  }, [horizon, selectedSymbol])

  const setHotspotActionStatus = useCallback(async (actionId: string, status: HotspotReviewAction['status']) => {
    setError(null)
    setUpdatingHotspotActionId(actionId)
    try {
      const nextPlan = await updateHotspotReviewActionStatus(horizon, hotspotMode, actionId, status)
      setHotspotReviewPlan(nextPlan)
    } catch (err) {
      setError(err instanceof Error ? err.message : '热点动作状态更新失败')
    } finally {
      setUpdatingHotspotActionId(null)
    }
  }, [horizon, hotspotMode])

  const exportStorage = useCallback(async () => {
    setError(null)
    setStorageError(null)
    setExportingStorage(true)
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
      const message = err instanceof Error ? err.message : '数据导出失败'
      setStorageError(message)
      setError(message)
    } finally {
      setExportingStorage(false)
    }
  }, [])

  const previewStorageFile = useCallback(async (file: File) => {
    setError(null)
    setStorageError(null)
    setPreviewingImport(true)
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const payload = buildStorageImportPayload(parsed)
      const preview = await previewStorageImport(payload)
      setStorageImportPayload(payload)
      setStorageImportPreview(preview)
      setStorageImportName(file.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入预检失败'
      setStorageError(message)
      setError(message)
    } finally {
      setPreviewingImport(false)
    }
  }, [])

  const applyStorageImport = useCallback(async () => {
    if (!storageImportPayload) return
    setError(null)
    setStorageError(null)
    setApplyingImport(true)
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
      const message = normalizeStorageImportError(err)
      setStorageError(message)
      setError(message)
    } finally {
      setApplyingImport(false)
    }
  }, [loadDiagnosis, loadStocks, selectedSymbol, storageImportPayload])

  const triggerRefreshJob = useCallback(async (scope: 'all' | 'watchlist') => {
    setError(null)
    setRefreshError(null)
    setRefreshingScope(scope)
    try {
      const job = await runRefreshJob(scope)
      const [fresh, readiness] = await Promise.all([fetchDataFreshness(), fetchSystemReadiness()])
      setRefreshJobs((items) => [job, ...items.filter((item) => item.id !== job.id)].slice(0, 5))
      setFreshness(fresh)
      setSystemReadiness(readiness)
      await loadStocks()
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新任务失败'
      setError(message)
      setRefreshError(message)
    } finally {
      setRefreshingScope(null)
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
        addingWatchlistSymbol={addingSearchWatchlistSymbol}
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
            <button
              className={isInWatchlist ? 'watch-button active' : 'watch-button'}
              type="button"
              onClick={toggleWatchlist}
              disabled={updatingWatchlist}
            >
              <Star size={16} />
              <span>{updatingWatchlist ? '更新中' : (isInWatchlist ? '已自选' : '加自选')}</span>
            </button>
            <button className="watch-button" type="button" onClick={saveCurrentReport} disabled={savingReport}>
              <Save size={16} />
              <span>{savingReport ? '保存中' : '存报告'}</span>
            </button>
            <button className="watch-button" type="button" onClick={exportCurrentResearchReport} disabled={!diagnosis || exportingReportPackage}>
              <Download size={16} />
              <span>{exportingReportPackage ? '导出中' : '导出报告'}</span>
            </button>
            <button className="watch-button" type="button" onClick={exportCurrentResearchReportHtml} disabled={!diagnosis || exportingReportPackage}>
              <FileText size={16} />
              <span>{exportingReportPackage ? '导出中' : '导出HTML'}</span>
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

        <HotspotCandidatesPanel
          candidates={hotspotCandidates}
          mode={hotspotMode}
          onModeChange={setHotspotMode}
          onSelect={setSelectedSymbol}
          error={hotspotCandidatesError}
          onRetry={loadHotspotCandidatePool}
        />

        <HotspotReviewActionsPanel
          plan={hotspotReviewPlan}
          updatingActionId={updatingHotspotActionId}
          onSelect={setSelectedSymbol}
          onStatusChange={setHotspotActionStatus}
        />

        <WatchlistSummaryPanel summary={watchlistSummary} onSelect={setSelectedSymbol} />

        <ReviewActionOverviewPanel overview={reviewActionOverview} onSelect={setSelectedSymbol} />

        <DataQualityOverviewPanel overview={dataQualityOverview} onSelect={setSelectedSymbol} />

        <IndustryHeatPanel items={industryHeat} onSelect={setSelectedSymbol} />

        <ConceptHeatPanel items={conceptHeat} onSelect={setSelectedSymbol} />

        <MomentumSignalPanel items={momentumSignals} onSelect={setSelectedSymbol} />

        <TimelinePanel events={timeline} onSelect={setSelectedSymbol} />

        <RiskExposurePanel
          report={portfolioRisk}
          watchlist={watchlist}
          positionWeights={portfolioWeights}
          onPositionWeightChange={setPortfolioWeight}
          onSelect={setSelectedSymbol}
        />

        <SystemStoragePanel
          status={storageStatus}
          importFileName={storageImportName}
          importPreview={storageImportPreview}
          onExport={exportStorage}
          onPreviewImport={previewStorageFile}
          onApplyImport={applyStorageImport}
          exporting={exportingStorage}
          previewingImport={previewingImport}
          applyingImport={applyingImport}
          error={storageError}
        />

        <SystemReadinessPanel readiness={systemReadiness} />

        <DataConnectorPanel
          health={connectorHealth}
          freshness={freshness}
          jobs={refreshJobs}
          refreshingScope={refreshingScope}
          refreshError={refreshError}
          onRun={triggerRefreshJob}
        />

        {loading ? (
          <div className="state-panel">
            <RefreshCw className="spin" size={20} />
            <span>正在生成诊断...</span>
          </div>
        ) : diagnosisError ? (
          <div className="state-panel error-state">
            <AlertTriangle size={20} />
            <span>
              <strong>行情数据加载失败</strong>
              <small>{diagnosisError}</small>
              <small>可能是行情源、网络或接口超时导致，当前诊断没有更新。</small>
            </span>
            <button type="button" onClick={loadDiagnosis}>
              重试诊断
            </button>
          </div>
        ) : !diagnosis ? (
          <div className="state-panel empty-state">
            <AlertTriangle size={20} />
            <span>
              <strong>暂无诊断数据</strong>
              <small>请选择自选股或重新加载诊断。</small>
            </span>
            <button type="button" onClick={loadDiagnosis}>
              重试诊断
            </button>
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
            updatingReviewActionId={updatingReviewActionId}
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
          saving={savingPriceAlert}
          deletingAlertId={deletingPriceAlertId}
          error={priceAlertError}
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
          error={screenerError}
          onRetry={loadScreenerCandidates}
        />
        <StrategyBacktestPanel
          report={strategyBacktest}
          comparison={strategyBacktestComparison}
          presetComparison={strategyBacktestPresetComparison}
          currentPreset={screenerPreset}
          holdingDays={backtestHoldingDays}
          feeBps={backtestFeeBps}
          slippageBps={backtestSlippageBps}
          limit={backtestLimit}
          onHoldingDaysChange={setBacktestHoldingDays}
          onFeeBpsChange={setBacktestFeeBps}
          onSlippageBpsChange={setBacktestSlippageBps}
          onLimitChange={setBacktestLimit}
          error={strategyBacktestError}
          comparisonError={strategyBacktestComparisonError}
          presetComparisonError={strategyBacktestPresetComparisonError}
          onRetry={loadStrategyBacktest}
        />
        <ResearchNotesPanel
          notes={notes}
          draft={noteDraft}
          onDraftChange={setNoteDraft}
          onSave={saveNote}
          onDelete={removeNote}
          saving={savingNote}
          deletingNoteId={deletingNoteId}
          error={noteError}
        />
        <ReportHistory reports={reports} onSelect={setSelectedSymbol} onDelete={removeReport} />
      </section>
    </main>
  )
}

function buildResearchReportHtml(payload: Record<string, any>) {
  const diagnosis = payload.diagnosis ?? {}
  const score = diagnosis.score ?? {}
  const portfolioRisk = payload.portfolio_risk ?? {}
  const strategyBacktest = payload.strategy_backtest ?? {}
  const strategyBacktestParameters = payload.strategy_backtest_parameters ?? {}
  const strategyPresetComparison = payload.strategy_preset_comparison ?? {}
  const dataTrust = payload.data_trust ?? {}
  const connectorHealth = dataTrust.connector_health ?? {}
  const freshness = dataTrust.freshness ?? {}
  const weightInputs = payload.portfolio_weight_inputs ?? {}
  const positions = Array.isArray(portfolioRisk.positions) ? portfolioRisk.positions : []
  const trades = Array.isArray(strategyBacktest.trades) ? strategyBacktest.trades : []
  const presetSummaries = Array.isArray(strategyPresetComparison.presets) ? strategyPresetComparison.presets : []

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(diagnosis.name ?? payload.symbol)} 研究报告</title>
  <style>
    body { margin: 0; font-family: Arial, "Microsoft YaHei", sans-serif; color: #25352d; background: #f6f8f4; }
    main { max-width: 980px; margin: 0 auto; padding: 32px 20px; }
    header, section { background: #fff; border: 1px solid #dfe8dc; border-radius: 8px; padding: 18px; margin-bottom: 14px; }
    h1, h2, p { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
    .metric, .row { border: 1px solid #e5ece2; border-radius: 8px; padding: 10px; background: #fbfdf9; }
    .metric span, .row small { color: #68786f; display: block; }
    .metric strong { font-size: 24px; }
    ul { padding-left: 18px; }
    code { background: #edf4e9; padding: 2px 5px; border-radius: 5px; }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Stock Doctor · ${escapeHtml(payload.version)} · ${escapeHtml(payload.exported_at)}</p>
      <h1>${escapeHtml(diagnosis.name ?? "")} <small>${escapeHtml(payload.symbol)}</small></h1>
      <p>${escapeHtml(diagnosis.rating ?? "")} · ${escapeHtml(diagnosis.verdict ?? "")}</p>
    </header>

    <section>
      <h2>诊断摘要</h2>
      <div class="grid">
        <div class="metric"><span>综合</span><strong>${escapeHtml(score.total ?? "-")}</strong></div>
        <div class="metric"><span>技术</span><strong>${escapeHtml(score.technical ?? "-")}</strong></div>
        <div class="metric"><span>资金</span><strong>${escapeHtml(score.capital ?? "-")}</strong></div>
        <div class="metric"><span>风险</span><strong>${escapeHtml(score.risk ?? "-")}</strong></div>
      </div>
      <p>${escapeHtml(diagnosis.summary ?? "")}</p>
    </section>

    <section>
      <h2>组合风险</h2>
      <div class="grid">
        <div class="metric"><span>风险等级</span><strong>${escapeHtml(portfolioRisk.risk_label ?? "-")}</strong></div>
        <div class="metric"><span>风险压力</span><strong>${escapeHtml(portfolioRisk.portfolio_risk_score ?? "-")}</strong></div>
        <div class="metric"><span>权重模式</span><strong>${escapeHtml(portfolioRisk.weight_mode === "custom" ? "自定义权重" : "等权模拟")}</strong></div>
        <div class="metric"><span>总权重</span><strong>${escapeHtml(portfolioRisk.total_position_weight ?? 0)}%</strong></div>
      </div>
      <p>${escapeHtml(portfolioRisk.summary ?? "")}</p>
      <h3>模拟仓位</h3>
      ${positions.map((item: any) => `<div class="row"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.symbol)} · ${escapeHtml(item.industry)} · ${escapeHtml(item.weight_pct)}%</small></div>`).join("") || "<p>暂无模拟仓位</p>"}
      <p>输入权重：<code>${escapeHtml(JSON.stringify(weightInputs))}</code></p>
    </section>

    <section>
      <h2>策略回测</h2>
      <div class="grid">
        <div class="metric"><span>价格来源</span><strong>${escapeHtml(strategyBacktestPriceSourceLabel(strategyBacktest.price_source))}</strong></div>
        <div class="metric"><span>历史样本</span><strong>${escapeHtml(strategyBacktest.history_bar_count ? `${strategyBacktest.history_bar_count} 根` : "-")}</strong></div>
        <div class="metric"><span>最后交易日</span><strong>${escapeHtml(strategyBacktest.history_last_date ?? "-")}</strong></div>
        <div class="metric"><span>Fallback</span><strong>${escapeHtml(strategyBacktest.fallback_reason ?? "未发生 fallback")}</strong></div>
        <div class="metric"><span>参数口径</span><strong>${escapeHtml(strategyBacktestParameters.holding_days ?? strategyBacktest.holding_days ?? "-")} 日</strong></div>
        <div class="metric"><span>样本数量</span><strong>${escapeHtml(strategyBacktestParameters.limit ?? "-")}</strong></div>
        <div class="metric"><span>成本口径</span><strong>${escapeHtml(strategyBacktest.round_trip_cost_pct ?? 0)}%</strong></div>
        <div class="metric"><span>手续费</span><strong>${escapeHtml(strategyBacktest.fee_bps ?? 0)} bps</strong></div>
        <div class="metric"><span>滑点</span><strong>${escapeHtml(strategyBacktest.slippage_bps ?? 0)} bps</strong></div>
        <div class="metric"><span>单笔成本</span><strong>${escapeHtml(strategyBacktest.round_trip_cost_pct ?? 0)}%</strong></div>
        <div class="metric"><span>样例交易</span><strong>${escapeHtml(strategyBacktest.trade_count ?? 0)}</strong></div>
        <div class="metric"><span>胜率</span><strong>${escapeHtml(strategyBacktest.win_rate ?? 0)}%</strong></div>
        <div class="metric"><span>平均收益</span><strong>${escapeHtml(strategyBacktest.average_return_pct ?? 0)}%</strong></div>
        <div class="metric"><span>最大回撤</span><strong>${escapeHtml(strategyBacktest.max_drawdown_pct ?? 0)}%</strong></div>
        <div class="metric"><span>收益回撤比</span><strong>${escapeHtml(strategyBacktest.return_drawdown_ratio ?? 0)}</strong></div>
      </div>
      <p>${escapeHtml(strategyBacktest.summary ?? "")}</p>
      <h3>策略横向对比</h3>
      <p>${escapeHtml(strategyPresetComparison.summary ?? "")}</p>
      ${presetSummaries.slice(0, 6).map((preset: any) => `<div class="row"><strong>${escapeHtml(preset.label ?? preset.preset)}</strong><small>${escapeHtml(preset.preset)} · 命中 ${escapeHtml(preset.match_count ?? 0)} · 交易 ${escapeHtml(preset.trade_count ?? 0)} · 胜率 ${escapeHtml(preset.win_rate ?? 0)}% · 平均收益 ${escapeHtml(preset.average_return_pct ?? 0)}% · 最大回撤 ${escapeHtml(preset.max_drawdown_pct ?? 0)}% · 收益回撤比 ${escapeHtml(preset.return_drawdown_ratio ?? 0)}${preset.preset === strategyPresetComparison.recommended_preset ? " · 推荐" : ""}</small></div>`).join("") || "<p>暂无策略对比</p>"}
      ${trades.slice(0, 6).map((trade: any) => `<div class="row"><strong>${escapeHtml(trade.name)}</strong><small>${escapeHtml(trade.symbol)} · ${escapeHtml(trade.holding_days)} 日 · 净收益 ${escapeHtml(trade.return_pct)}% · 毛收益 ${escapeHtml(trade.gross_return_pct ?? trade.return_pct)}% · 成本 ${escapeHtml(trade.cost_pct ?? 0)}% · 回撤 ${escapeHtml(trade.max_drawdown_pct)}%</small></div>`).join("") || "<p>暂无样例交易</p>"}
    </section>

    <section>
      <h2>数据可信度</h2>
      <div class="grid">
        <div class="metric"><span>连接器</span><strong>${escapeHtml(connectorHealth.active_provider ?? "-")}</strong></div>
        <div class="metric"><span>Fallback</span><strong>${escapeHtml(connectorHealth.fallback_provider ?? "-")}</strong></div>
        <div class="metric"><span>缓存状态</span><strong>${escapeHtml(freshness.status ?? "-")}</strong></div>
        <div class="metric"><span>覆盖率</span><strong>${escapeHtml(freshness.coverage_pct ?? "-")}%</strong></div>
      </div>
      <p>${escapeHtml(freshness.message ?? "")}</p>
    </section>
  </main>
</body>
</html>`
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function strategyBacktestPriceSourceLabel(source: unknown) {
  return source === 'historical-kline' ? '历史K线' : '样例趋势'
}

function readStoredBacktestParameters(): BacktestParameters {
  if (typeof window === 'undefined') {
    return DEFAULT_BACKTEST_PARAMETERS
  }

  try {
    const raw = window.localStorage.getItem(BACKTEST_PARAMETERS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_BACKTEST_PARAMETERS
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_BACKTEST_PARAMETERS
    }
    return normalizeBacktestParameters(parsed as Partial<BacktestParameters>)
  } catch {
    return DEFAULT_BACKTEST_PARAMETERS
  }
}

function writeStoredBacktestParameters(parameters: BacktestParameters) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(BACKTEST_PARAMETERS_STORAGE_KEY, JSON.stringify(normalizeBacktestParameters(parameters)))
  } catch {
    // localStorage can be unavailable in restricted browser modes; keep the in-memory state.
  }
}

function normalizeBacktestParameters(parameters: Partial<BacktestParameters>): BacktestParameters {
  return {
    holding_days: normalizeBacktestNumber(parameters.holding_days, 1, 60, DEFAULT_BACKTEST_PARAMETERS.holding_days),
    fee_bps: normalizeBacktestNumber(parameters.fee_bps, 0, 100, DEFAULT_BACKTEST_PARAMETERS.fee_bps),
    slippage_bps: normalizeBacktestNumber(parameters.slippage_bps, 0, 100, DEFAULT_BACKTEST_PARAMETERS.slippage_bps),
    limit: normalizeBacktestNumber(parameters.limit, 1, 20, DEFAULT_BACKTEST_PARAMETERS.limit),
  }
}

function normalizeBacktestNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.round(parsed)))
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

function normalizeStorageImportError(err: unknown) {
  if (!(err instanceof Error)) return '数据导入失败'
  if (err.message.startsWith('导入失败')) {
    return err.message.replace('导入失败', '数据导入失败')
  }
  return err.message
}
