import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StockList } from './components/StockList'
import { humanizeConnectorMessage } from './lib/sourceLabels'
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
  ActionCenterPanel,
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
  SystemRuntimeConfigPanel,
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
  fetchDataRuntimeSettings,
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
  fetchStrategyBacktestActions,
  fetchStrategyBacktestComparison,
  fetchStrategyBacktestHistory,
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
  updateStrategyBacktestActionStatus,
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
  DataRuntimeSettings,
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
  StrategyBacktestAction,
  StrategyBacktestActionPlan,
  StrategyBacktestHistoryComparison,
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
const PORTFOLIO_INPUTS_STORAGE_KEY = 'stock-doctor-portfolio-inputs-v1'

type BacktestParameters = {
  holding_days: number
  fee_bps: number
  slippage_bps: number
  limit: number
}

type PortfolioInputs = {
  weights: Record<string, string>
  lots: Record<string, { shares: string; cost_price: string }>
  portfolio_value: string
}

const DEFAULT_BACKTEST_PARAMETERS: BacktestParameters = {
  holding_days: 5,
  fee_bps: 5,
  slippage_bps: 10,
  limit: 8,
}

const DEFAULT_PORTFOLIO_INPUTS: PortfolioInputs = {
  weights: {},
  lots: {},
  portfolio_value: '',
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
  const [runtimeSettings, setRuntimeSettings] = useState<DataRuntimeSettings | null>(null)
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
  const [strategyBacktestHistory, setStrategyBacktestHistory] = useState<StrategyBacktestHistoryComparison | null>(null)
  const [strategyBacktestPresetComparison, setStrategyBacktestPresetComparison] = useState<StrategyBacktestPresetComparison | null>(null)
  const [strategyBacktestActions, setStrategyBacktestActions] = useState<StrategyBacktestActionPlan | null>(null)
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
  const [storedPortfolioInputs] = useState(readStoredPortfolioInputs)
  const [portfolioWeights, setPortfolioWeights] = useState<Record<string, string>>(storedPortfolioInputs.weights)
  const [portfolioLots, setPortfolioLots] = useState<Record<string, { shares: string; cost_price: string }>>(storedPortfolioInputs.lots)
  const [portfolioValue, setPortfolioValue] = useState(storedPortfolioInputs.portfolio_value)
  const [portfolioImportMessage, setPortfolioImportMessage] = useState('')
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
  const [strategyBacktestHistoryError, setStrategyBacktestHistoryError] = useState<string | null>(null)
  const [strategyBacktestPresetComparisonError, setStrategyBacktestPresetComparisonError] = useState<string | null>(null)
  const [strategyBacktestActionsError, setStrategyBacktestActionsError] = useState<string | null>(null)
  const [refreshingScope, setRefreshingScope] = useState<'all' | 'watchlist' | null>(null)
  const [updatingWatchlist, setUpdatingWatchlist] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [exportingReportPackage, setExportingReportPackage] = useState(false)
  const [updatingReviewActionId, setUpdatingReviewActionId] = useState<string | null>(null)
  const [updatingHotspotActionId, setUpdatingHotspotActionId] = useState<string | null>(null)
  const [updatingBacktestActionId, setUpdatingBacktestActionId] = useState<string | null>(null)
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
    const [items, watchItems, market, sources, connectors, runtime, fresh, jobs, storage, readiness, qualityOverview, savedReports, momentum, brief, hotspotActions] = await Promise.all([
      fetchStocks(),
      fetchWatchlist(),
      fetchMarketOverview(),
      fetchDataSources(),
      fetchDataConnectorHealth(),
      fetchDataRuntimeSettings().catch(() => null),
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
    setRuntimeSettings(runtime)
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
    setStrategyBacktestHistoryError(null)
    setStrategyBacktestPresetComparisonError(null)
    setStrategyBacktestActionsError(null)
    try {
      const report = await fetchStrategyBacktest(screenerPreset, horizon, backtestHoldingDays, backtestFeeBps, backtestSlippageBps, backtestLimit)
      setStrategyBacktest(report)
      try {
        const actions = await fetchStrategyBacktestActions(screenerPreset, horizon, backtestHoldingDays, backtestFeeBps, backtestSlippageBps, backtestLimit)
        setStrategyBacktestActions(actions)
      } catch (err) {
        const message = err instanceof Error ? err.message : '回测动作加载失败'
        setStrategyBacktestActionsError(message)
        setStrategyBacktestActions(null)
      }
      try {
        const history = await fetchStrategyBacktestHistory(screenerPreset, horizon, 8)
        setStrategyBacktestHistory(history)
      } catch (err) {
        const message = err instanceof Error ? err.message : '回测历史加载失败'
        setStrategyBacktestHistoryError(message)
        setStrategyBacktestHistory(null)
      }
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
      setStrategyBacktestHistory(null)
      setStrategyBacktestPresetComparison(null)
      setStrategyBacktestActions(null)
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

  const setPortfolioLot = useCallback((symbol: string, field: 'shares' | 'cost_price', value: string) => {
    setPortfolioLots((current) => {
      const next = { ...current }
      const existing = next[symbol] ?? { shares: '', cost_price: '' }
      const updated = { ...existing, [field]: value }
      if (updated.shares.trim() === '' && updated.cost_price.trim() === '') {
        delete next[symbol]
      } else {
        next[symbol] = updated
      }
      return next
    })
  }, [])

  const importPortfolioLotsFile = useCallback(async (file: File) => {
    try {
      const text = await readTextFile(file)
      const lots = parsePortfolioLotsText(text)
      if (Object.keys(lots).length > 0) {
        setPortfolioLots((current) => ({ ...current, ...lots }))
        setPortfolioImportMessage(`已导入 ${Object.keys(lots).length} 只持仓。`)
      } else {
        setPortfolioImportMessage('未识别到有效持仓，请使用 symbol,shares,cost_price 格式。')
      }
    } catch {
      setError('持仓导入失败，请检查 CSV/TXT 文件格式。')
    }
  }, [])

  const importPortfolioTradesFile = useCallback(async (file: File) => {
    try {
      const text = await readTextFile(file)
      const lots = parsePortfolioTradesText(text)
      if (Object.keys(lots).length > 0) {
        setPortfolioLots((current) => ({ ...current, ...lots }))
        setPortfolioImportMessage(`已从交易流水生成 ${Object.keys(lots).length} 只持仓。`)
      } else {
        setPortfolioImportMessage('未识别到有效交易流水，请使用 symbol,side,shares,price 格式。')
      }
    } catch {
      setError('交易流水导入失败，请检查 CSV/TXT 文件格式。')
    }
  }, [])

  useEffect(() => {
    writeStoredPortfolioInputs({ weights: portfolioWeights, lots: portfolioLots, portfolio_value: portfolioValue })
  }, [portfolioLots, portfolioWeights, portfolioValue])

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
    fetchPortfolioRisk(horizon, 'watchlist', portfolioWeights, portfolioValue, portfolioLots)
      .then(setPortfolioRisk)
      .catch((err) => setError(err instanceof Error ? err.message : '风险敞口加载失败'))
  }, [horizon, watchlist, portfolioLots, portfolioWeights, portfolioValue])

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
        portfolio_lot_inputs: portfolioLots,
        portfolio_value_input: portfolioValue,
        strategy_backtest: strategyBacktest,
        strategy_backtest_parameters: {
          fee_bps: backtestFeeBps,
          slippage_bps: backtestSlippageBps,
          limit: backtestLimit,
          holding_days: backtestHoldingDays,
        },
        strategy_backtest_comparison: strategyBacktestComparison,
        strategy_backtest_history: strategyBacktestHistory,
        strategy_backtest_actions: strategyBacktestActions,
        strategy_preset_comparison: strategyBacktestPresetComparison,
        review_actions: reviewActions,
        data_quality: dataQuality,
        data_trust: {
          sources: dataSources,
          connector_health: connectorHealth,
          runtime_config: runtimeSettings,
          freshness,
          refresh_jobs: refreshJobs,
        },
      }
  }, [backtestFeeBps, backtestHoldingDays, backtestLimit, backtestSlippageBps, connectorHealth, dataQuality, dataSources, diagnosis, diagnosisChange, freshness, horizon, portfolioLots, portfolioRisk, portfolioValue, portfolioWeights, refreshJobs, reviewActions, runtimeSettings, selectedSymbol, strategyBacktest, strategyBacktestActions, strategyBacktestComparison, strategyBacktestHistory, strategyBacktestPresetComparison])

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

  const exportCurrentResearchReportMarkdown = useCallback(() => {
    const payload = buildCurrentResearchReportPayload()
    if (!payload) return
    setError(null)
    setExportingReportPackage(true)
    try {
      const markdown = buildResearchReportMarkdown(payload)
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `stock-doctor-report-${selectedSymbol}-${payload.exported_at.slice(0, 10)}.md`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Markdown 报告导出失败')
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

  const setBacktestActionStatus = useCallback(async (actionId: string, status: StrategyBacktestAction['status']) => {
    setError(null)
    setUpdatingBacktestActionId(actionId)
    try {
      const nextPlan = await updateStrategyBacktestActionStatus(
        screenerPreset,
        horizon,
        actionId,
        status,
        backtestHoldingDays,
        backtestFeeBps,
        backtestSlippageBps,
        backtestLimit,
      )
      setStrategyBacktestActions(nextPlan)
    } catch (err) {
      setError(err instanceof Error ? err.message : '回测动作状态更新失败')
    } finally {
      setUpdatingBacktestActionId(null)
    }
  }, [backtestFeeBps, backtestHoldingDays, backtestLimit, backtestSlippageBps, horizon, screenerPreset])

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
            <button className="watch-button" type="button" onClick={exportCurrentResearchReportMarkdown} disabled={!diagnosis || exportingReportPackage}>
              <FileText size={16} />
              <span>{exportingReportPackage ? '导出中' : '导出MD'}</span>
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

        <ActionCenterPanel
          reviewOverview={reviewActionOverview}
          hotspotPlan={hotspotReviewPlan}
          backtestPlan={strategyBacktestActions}
          onSelect={setSelectedSymbol}
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
          positionLots={portfolioLots}
          importMessage={portfolioImportMessage}
          portfolioValue={portfolioValue}
          onPositionWeightChange={setPortfolioWeight}
          onPositionLotChange={setPortfolioLot}
          onPositionLotsImport={importPortfolioLotsFile}
          onPositionTradesImport={importPortfolioTradesFile}
          onPortfolioValueChange={setPortfolioValue}
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

        <SystemRuntimeConfigPanel settings={runtimeSettings} />

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
          history={strategyBacktestHistory}
          presetComparison={strategyBacktestPresetComparison}
          actions={strategyBacktestActions}
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
          historyError={strategyBacktestHistoryError}
          presetComparisonError={strategyBacktestPresetComparisonError}
          actionsError={strategyBacktestActionsError}
          updatingActionId={updatingBacktestActionId}
          onActionStatus={setBacktestActionStatus}
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

function buildResearchReportMarkdown(payload: Record<string, any>) {
  const diagnosis = payload.diagnosis ?? {}
  const diagnosisChange = payload.diagnosis_change ?? {}
  const score = diagnosis.score ?? {}
  const trendInsight = diagnosisChange.trend_insight ?? null
  const ratingTransition = diagnosisChange.rating_transition ?? null
  const riskShift = diagnosisChange.risk_shift ?? null
  const portfolioRisk = payload.portfolio_risk ?? {}
  const strategyBacktest = payload.strategy_backtest ?? {}
  const strategyBacktestHistory = payload.strategy_backtest_history ?? {}
  const strategyBacktestActions = payload.strategy_backtest_actions ?? {}
  const reviewActions = payload.review_actions ?? {}
  const dataTrust = payload.data_trust ?? {}
  const dataQuality = payload.data_quality ?? {}
  const connectorHealth = dataTrust.connector_health ?? {}
  const cacheStatus = connectorHealth.cache_status ?? {}
  const runtimeConfig = dataTrust.runtime_config ?? connectorHealth.runtime_config ?? {}
  const freshness = dataTrust.freshness ?? {}
  const connectors = Array.isArray(connectorHealth.connectors) ? connectorHealth.connectors : []
  const runtimePaths = Array.isArray(runtimeConfig.paths) ? runtimeConfig.paths : []
  const runtimeSecrets = Array.isArray(runtimeConfig.secrets) ? runtimeConfig.secrets : []
  const dataQualityChecks = Array.isArray(dataQuality.checks) ? dataQuality.checks : []
  const positions = Array.isArray(portfolioRisk.positions) ? portfolioRisk.positions : []
  const industryExposures = Array.isArray(portfolioRisk.industry_exposures) ? portfolioRisk.industry_exposures : []
  const riskContributions = Array.isArray(portfolioRisk.risk_contributions) ? portfolioRisk.risk_contributions : []
  const rebalanceActions = Array.isArray(portfolioRisk.rebalance_actions) ? portfolioRisk.rebalance_actions : []
  const backtestHistoryItems = Array.isArray(strategyBacktestHistory.items) ? strategyBacktestHistory.items : []
  const backtestActionItems = Array.isArray(strategyBacktestActions.actions) ? strategyBacktestActions.actions : []
  const cacheBuckets = Array.isArray(cacheStatus.buckets) ? cacheStatus.buckets : []
  const reviewActionItems = Array.isArray(reviewActions.items) ? reviewActions.items : []
  const lines: string[] = []

  lines.push(`# ${markdownText(diagnosis.name ?? payload.symbol)} 研究报告`)
  lines.push('')
  lines.push(`- 代码: ${markdownText(payload.symbol)}`)
  lines.push(`- 周期: ${markdownText(payload.horizon)}`)
  lines.push(`- 导出时间: ${markdownText(payload.exported_at)}`)
  lines.push('')

  lines.push('## 诊断摘要')
  lines.push('')
  lines.push(`- 评级: ${markdownText(diagnosis.rating ?? '-')}`)
  lines.push(`- 综合/技术/资金/风险: ${markdownText(score.total ?? '-')} / ${markdownText(score.technical ?? '-')} / ${markdownText(score.capital ?? '-')} / ${markdownText(score.risk ?? '-')}`)
  lines.push(`- 摘要: ${markdownText(diagnosis.summary ?? '暂无诊断摘要')}`)
  lines.push('')

  lines.push('## 诊断变化')
  lines.push('')
  lines.push(`- 状态: ${markdownText(diagnosisChange.status ?? '-')}`)
  lines.push(`- 综合变化: ${markdownText(diagnosisChange.score_delta ?? 0)}`)
  lines.push(`- 摘要: ${markdownText(diagnosisChange.summary ?? '暂无诊断变化')}`)
  if (trendInsight) {
    lines.push(`- 趋势洞察: ${markdownText(trendInsight.summary)}`)
    lines.push(`- 综合趋势: ${markdownText(reportScoreDirectionLabel(trendInsight.score_direction))}`)
    lines.push(`- 风险趋势: ${markdownText(reportRiskDirectionLabel(trendInsight.risk_direction))}`)
    lines.push(`- 评级变化 ${markdownText(trendInsight.rating_change_count ?? 0)} 次`)
    lines.push(`- 区间: 综合 ${markdownText(trendInsight.total_low ?? '-')}-${markdownText(trendInsight.total_high ?? '-')} / 风险 ${markdownText(trendInsight.risk_low ?? '-')}-${markdownText(trendInsight.risk_high ?? '-')}`)
  } else {
    lines.push('- 趋势洞察: 暂无趋势洞察')
  }
  lines.push(`- 评级轨迹: ${ratingTransition ? markdownText(ratingTransition.detail) : '暂无评级轨迹'}`)
  lines.push(`- 风险变化: ${riskShift ? markdownText(`${riskShift.label}: ${riskShift.detail}`) : '暂无风险变化'}`)
  lines.push('')

  lines.push('## 组合风险')
  lines.push('')
  lines.push(`- 风险等级: ${markdownText(portfolioRisk.risk_label ?? '-')}`)
  lines.push(`- 风险压力: ${markdownText(portfolioRisk.portfolio_risk_score ?? '-')}`)
  lines.push(`- 权重模式: ${portfolioRisk.weight_mode === 'custom' ? '自定义权重' : '等权模拟'}`)
  lines.push(`- 总权重: ${markdownText(portfolioRisk.total_position_weight ?? portfolioRisk.total_weight_pct ?? '-')}%`)
  lines.push(`- 组合市值: ${markdownText(portfolioRisk.total_market_value ?? 0)} 元`)
  lines.push(`- 现金缓冲: ${markdownText(portfolioRisk.cash_amount ?? 0)} 元`)
  lines.push('')
  lines.push('### 模拟仓位')
  markdownList(lines, positions.slice(0, 8), (item) => `${item.name} (${item.symbol}) - ${item.industry} - ${item.weight_pct}% - 市值 ${item.market_value ?? 0} 元 - 数量 ${item.shares ?? 0} - 成本 ${item.cost_amount ?? 0} 元 - 浮盈亏 ${item.unrealized_pnl ?? 0} 元 (${item.unrealized_pnl_pct ?? 0}%)`)
  lines.push('')
  lines.push('### 行业暴露')
  markdownList(
    lines,
    industryExposures.slice(0, 8),
    (item) => `${item.industry}: 权重 ${item.weight_pct}%, ${item.stock_count} 只, ${item.concentration_label ?? '集中度正常'}, 上限 ${item.suggested_max_weight_pct ?? 0}%, 超额 ${item.excess_weight_pct ?? 0}%, 风险压力 ${item.risk_score}`,
  )
  lines.push('')
  lines.push('### 风险贡献')
  markdownList(lines, riskContributions.slice(0, 8), (item) => `${item.name} (${item.symbol}) - 权重 ${item.weight_pct}%, 风险分 ${item.risk_score}, 贡献 ${item.contribution_score}`)
  lines.push('')
  lines.push('### 再平衡建议')
  markdownList(lines, rebalanceActions.slice(0, 8), (item) => `${item.name} (${item.symbol}) - ${reportRebalanceActionLabel(item.action)} - 当前 ${item.current_weight_pct}% / 建议 ${item.suggested_weight_pct}% / 调整 ${item.delta_pct}%`)
  lines.push('')

  lines.push('## 策略回测')
  lines.push('')
  lines.push(`- 价格来源: ${markdownText(strategyBacktestPriceSourceLabel(strategyBacktest.price_source))}`)
  lines.push(`- 持有周期: ${markdownText(strategyBacktest.holding_days ?? '-')} 日`)
  lines.push(`- 交易数/胜率: ${markdownText(strategyBacktest.trade_count ?? 0)} / ${markdownText(strategyBacktest.win_rate ?? 0)}%`)
  lines.push(`- 平均收益/最大回撤: ${markdownText(formatReportSignedPercent(strategyBacktest.average_return_pct ?? 0))} / ${markdownText(formatReportSignedPercent(strategyBacktest.max_drawdown_pct ?? 0))}`)
  lines.push(`- 稳定性: ${markdownText(strategyBacktest.stability_score ?? 0)} (${markdownText(strategyBacktest.stability_label ?? '暂无评估')})`)
  lines.push('')
  lines.push('### 历史对比')
  lines.push(markdownText(strategyBacktestHistory.summary ?? '暂无回测历史对比'))
  markdownList(lines, backtestHistoryItems.slice(0, 6), (item) => `${item.holding_days} 日 ${strategyBacktestPriceSourceLabel(item.price_source)} - 平均收益 ${formatReportSignedPercent(item.average_return_pct ?? 0)}, 最大回撤 ${formatReportSignedPercent(item.max_drawdown_pct ?? 0)}, 稳定 ${item.stability_score}, 可信 ${item.sample_confidence_score}`)
  lines.push('')
  lines.push('### 回测复盘动作')
  lines.push(`- 状态统计: 待处理 ${markdownText(strategyBacktestActions.pending_count ?? 0)} / 观察中 ${markdownText(strategyBacktestActions.watching_count ?? 0)} / 已完成 ${markdownText(strategyBacktestActions.done_count ?? 0)}`)
  markdownList(lines, backtestActionItems.slice(0, 8), (item) => `${item.category} - ${reviewActionPriorityLabel(item.priority)} - ${reviewActionStatusLabel(item.status)} - ${item.title} - ${item.metric} - ${item.detail}`)
  lines.push('')

  lines.push('## 数据可信度')
  lines.push('')
  lines.push(`- 连接器: ${markdownText(connectorHealth.active_provider ?? '-')}`)
  lines.push(`- Fallback: ${markdownText(connectorHealth.fallback_provider ?? '-')}`)
  lines.push(`- 新鲜度: ${markdownText(freshness.status ?? '-')}`)
  lines.push(`- 覆盖率: ${markdownText(freshness.coverage_pct ?? '-')}%`)
  lines.push(`- 数据质量: ${markdownText(dataQuality.score ?? '-')} 分 / ${markdownText(reportQualityStatusLabel(dataQuality.status))} / 覆盖 ${markdownText(dataQuality.coverage_pct ?? '-')}%`)
  lines.push(`- 质量摘要: ${markdownText(dataQuality.summary ?? '暂无数据质量摘要')}`)
  lines.push(`- 运行配置: ${markdownText(runtimeConfig.active_provider ?? connectorHealth.active_provider ?? '-')} / 超时 ${markdownText(runtimeConfig.request_timeout_seconds ?? connectorHealth.runtime_config?.request_timeout_seconds ?? '-')} 秒 / 缓存 ${markdownText(runtimeConfig.cache_ttl_seconds ?? connectorHealth.runtime_config?.cache_ttl_seconds ?? '-')} 秒`)
  lines.push('')
  lines.push('### 数据质量检查')
  markdownList(
    lines,
    dataQualityChecks,
    (check) => `${check.label} - ${reportQualityStatusLabel(check.status)} - ${check.detail} - 影响: ${check.impact}`,
  )
  lines.push('')
  lines.push('### 运行配置')
  markdownList(
    lines,
    runtimePaths,
    (item) => `${item.label} - ${reportRuntimePathStatusLabel(item.exists)} - ${item.env_var} - ${item.value || '未配置'}`,
  )
  lines.push('')
  lines.push('### 密钥配置')
  markdownList(
    lines,
    runtimeSecrets,
    (item) => `${item.label} - ${item.configured ? '已配置' : '未配置'} - ${item.env_var}`,
  )
  lines.push('')
  lines.push('### 连接器明细')
  markdownList(
    lines,
    connectors.slice(0, 10),
    (connector) => `${connector.name} - ${reportConnectorStatusLabel(connector.status)}${connector.active ? ' - 当前启用' : ''} - ${humanizeConnectorMessage(connector.message ?? connector.role ?? '')} - 下一步: ${humanizeConnectorMessage(connector.next_action ?? '-')}`,
  )
  lines.push('')
  lines.push('### 缓存桶')
  markdownList(lines, cacheBuckets, (bucket) => `${bucket.label}: ${bucket.active_entries}/${bucket.entries} 有效, 已过期 ${bucket.expired_entries}, 命中 ${bucket.hit_count} / 未命中 ${bucket.miss_count}, 命中率 ${bucket.hit_rate_pct}%`)
  lines.push('')

  lines.push('## 复盘行动')
  lines.push('')
  lines.push(`- 高/中/低优先级: ${markdownText(reviewActions.high_count ?? 0)} / ${markdownText(reviewActions.medium_count ?? 0)} / ${markdownText(reviewActions.low_count ?? 0)}`)
  markdownList(lines, reviewActionItems.slice(0, 8), (item) => `${item.title} - ${item.priority} - ${item.status} - ${item.detail}`)
  lines.push('')

  return `${lines.join('\n').trim()}\n`
}

function markdownList(lines: string[], items: any[], render: (item: any) => string) {
  if (!items.length) {
    lines.push('- 暂无')
    return
  }
  for (const item of items) {
    lines.push(`- ${markdownText(render(item))}`)
  }
}

function markdownText(value: unknown) {
  return String(value ?? '').replace(/\|/g, '\\|')
}

function buildResearchReportHtml(payload: Record<string, any>) {
  const diagnosis = payload.diagnosis ?? {}
  const diagnosisChange = payload.diagnosis_change ?? {}
  const score = diagnosis.score ?? {}
  const ratingTransition = diagnosisChange.rating_transition ?? null
  const riskShift = diagnosisChange.risk_shift ?? null
  const trendInsight = diagnosisChange.trend_insight ?? null
  const portfolioRisk = payload.portfolio_risk ?? {}
  const strategyBacktest = payload.strategy_backtest ?? {}
  const strategyBacktestParameters = payload.strategy_backtest_parameters ?? {}
  const strategyBacktestComparison = payload.strategy_backtest_comparison ?? {}
  const strategyBacktestHistory = payload.strategy_backtest_history ?? {}
  const strategyBacktestActions = payload.strategy_backtest_actions ?? {}
  const strategyPresetComparison = payload.strategy_preset_comparison ?? {}
  const reviewActions = payload.review_actions ?? {}
  const dataTrust = payload.data_trust ?? {}
  const dataQuality = payload.data_quality ?? {}
  const connectorHealth = dataTrust.connector_health ?? {}
  const cacheStatus = connectorHealth.cache_status ?? {}
  const runtimeConfig = dataTrust.runtime_config ?? connectorHealth.runtime_config ?? {}
  const freshness = dataTrust.freshness ?? {}
  const connectors = Array.isArray(connectorHealth.connectors) ? connectorHealth.connectors : []
  const runtimePaths = Array.isArray(runtimeConfig.paths) ? runtimeConfig.paths : []
  const runtimeSecrets = Array.isArray(runtimeConfig.secrets) ? runtimeConfig.secrets : []
  const dataQualityChecks = Array.isArray(dataQuality.checks) ? dataQuality.checks : []
  const weightInputs = payload.portfolio_weight_inputs ?? {}
  const scoreTrend = Array.isArray(diagnosisChange.score_trend) ? diagnosisChange.score_trend : []
  const changeDrivers = Array.isArray(diagnosisChange.key_drivers) ? diagnosisChange.key_drivers : []
  const changeItems = Array.isArray(diagnosisChange.changes) ? diagnosisChange.changes : []
  const positions = Array.isArray(portfolioRisk.positions) ? portfolioRisk.positions : []
  const industryExposures = Array.isArray(portfolioRisk.industry_exposures) ? portfolioRisk.industry_exposures : []
  const riskContributions = Array.isArray(portfolioRisk.risk_contributions) ? portfolioRisk.risk_contributions : []
  const rebalanceActions = Array.isArray(portfolioRisk.rebalance_actions) ? portfolioRisk.rebalance_actions : []
  const trades = Array.isArray(strategyBacktest.trades) ? strategyBacktest.trades : []
  const equityCurve = Array.isArray(strategyBacktest.equity_curve) ? strategyBacktest.equity_curve : []
  const stabilityNotes = Array.isArray(strategyBacktest.stability_notes) ? strategyBacktest.stability_notes : []
  const sampleConfidenceNotes = Array.isArray(strategyBacktest.sample_confidence_notes)
    ? strategyBacktest.sample_confidence_notes
    : []
  const latestEquityPoint = equityCurve.length ? equityCurve[equityCurve.length - 1] : null
  const maxPathDrawdown = equityCurve.length
    ? Math.min(...equityCurve.map((point: any) => Number(point.drawdown_pct ?? 0)))
    : 0
  const periodSummaries = Array.isArray(strategyBacktestComparison.periods) ? strategyBacktestComparison.periods : []
  const backtestHistoryItems = Array.isArray(strategyBacktestHistory.items) ? strategyBacktestHistory.items : []
  const backtestActionItems = Array.isArray(strategyBacktestActions.actions) ? strategyBacktestActions.actions : []
  const presetSummaries = Array.isArray(strategyPresetComparison.presets) ? strategyPresetComparison.presets : []
  const reviewActionItems = Array.isArray(reviewActions.items) ? reviewActions.items : []
  const cacheBuckets = Array.isArray(cacheStatus.buckets) ? cacheStatus.buckets : []
  const activeCacheEntries = cacheBuckets.reduce((total: number, bucket: any) => total + Number(bucket.active_entries ?? 0), 0)
  const totalCacheEntries = cacheBuckets.reduce((total: number, bucket: any) => total + Number(bucket.entries ?? 0), 0)

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
      <h2>诊断变化</h2>
      <div class="grid">
        <div class="metric"><span>状态</span><strong>${escapeHtml(diagnosisChange.status ?? "-")}</strong></div>
        <div class="metric"><span>综合变化</span><strong>${escapeHtml(diagnosisChange.score_delta ?? 0)}</strong></div>
        <div class="metric"><span>技术变化</span><strong>${escapeHtml(diagnosisChange.technical_delta ?? 0)}</strong></div>
        <div class="metric"><span>风险变化</span><strong>${escapeHtml(diagnosisChange.risk_delta ?? 0)}</strong></div>
      </div>
      <p>${escapeHtml(diagnosisChange.summary ?? "")}</p>
      <h3>趋势对比</h3>
      ${scoreTrend.map((point: any) => `<div class="row"><strong>${escapeHtml(point.label)} · ${escapeHtml(point.rating)}</strong><small>综合 ${escapeHtml(point.total)} · 技术 ${escapeHtml(point.technical)} · 估值 ${escapeHtml(point.valuation)} · 资金 ${escapeHtml(point.capital)} · 风险 ${escapeHtml(point.risk)} · ${escapeHtml(point.generated_at)}</small></div>`).join("") || "<p>暂无趋势对比</p>"}
      <h3>趋势洞察</h3>
      ${trendInsight ? `
      <p>${escapeHtml(trendInsight.summary)}</p>
      <div class="grid">
        <div class="metric"><span>综合趋势</span><strong>${escapeHtml(reportScoreDirectionLabel(trendInsight.score_direction))}</strong></div>
        <div class="metric"><span>风险趋势</span><strong>${escapeHtml(reportRiskDirectionLabel(trendInsight.risk_direction))}</strong></div>
        <div class="metric"><span>评级变化</span><strong>评级变化 ${escapeHtml(trendInsight.rating_change_count ?? 0)} 次</strong></div>
        <div class="metric"><span>区间</span><strong>综合 ${escapeHtml(trendInsight.total_low ?? "-")}-${escapeHtml(trendInsight.total_high ?? "-")} / 风险 ${escapeHtml(trendInsight.risk_low ?? "-")}-${escapeHtml(trendInsight.risk_high ?? "-")}</strong></div>
      </div>
      ` : "<p>暂无趋势洞察</p>"}
      <h3>评级轨迹</h3>
      <p>${ratingTransition ? `${escapeHtml(ratingTransition.previous ? `${ratingTransition.previous} -> ${ratingTransition.current}` : ratingTransition.current)}：${escapeHtml(ratingTransition.detail)}` : "暂无评级轨迹"}</p>
      <h3>风险变化</h3>
      <p>${riskShift ? `${escapeHtml(riskShift.label)}：${escapeHtml(riskShift.detail)}` : "暂无风险变化"}</p>
      <h3>关键驱动</h3>
      ${changeDrivers.map((driver: any) => `<div class="row"><strong>${escapeHtml(driver.label)}</strong><small>${escapeHtml(driver.direction)} · ${escapeHtml(driver.delta)} · ${escapeHtml(driver.detail)}</small></div>`).join("") || "<p>暂无关键驱动</p>"}
      <h3>变化明细</h3>
      ${changeItems.map((item: any) => `<div class="row"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.direction)} · ${escapeHtml(item.detail)}</small></div>`).join("") || "<p>暂无变化明细</p>"}
    </section>

    <section>
      <h2>组合风险</h2>
      <div class="grid">
        <div class="metric"><span>风险等级</span><strong>${escapeHtml(portfolioRisk.risk_label ?? "-")}</strong></div>
        <div class="metric"><span>风险压力</span><strong>${escapeHtml(portfolioRisk.portfolio_risk_score ?? "-")}</strong></div>
        <div class="metric"><span>权重模式</span><strong>${escapeHtml(portfolioRisk.weight_mode === "custom" ? "自定义权重" : "等权模拟")}</strong></div>
        <div class="metric"><span>总权重</span><strong>${escapeHtml(portfolioRisk.total_position_weight ?? 0)}%</strong></div>
        <div class="metric"><span>组合市值</span><strong>${escapeHtml(portfolioRisk.total_market_value ?? 0)} 元</strong></div>
        <div class="metric"><span>现金缓冲</span><strong>${escapeHtml(portfolioRisk.cash_amount ?? 0)} 元</strong></div>
      </div>
      <p>${escapeHtml(portfolioRisk.summary ?? "")}</p>
      <h3>模拟仓位</h3>
      ${positions.map((item: any) => `<div class="row"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.symbol)} · ${escapeHtml(item.industry)} · ${escapeHtml(item.weight_pct)}% · 市值 ${escapeHtml(item.market_value ?? 0)} 元 · 数量 ${escapeHtml(item.shares ?? 0)} · 成本 ${escapeHtml(item.cost_amount ?? 0)} 元 · 浮盈亏 ${escapeHtml(item.unrealized_pnl ?? 0)} 元 (${escapeHtml(item.unrealized_pnl_pct ?? 0)}%)</small></div>`).join("") || "<p>暂无模拟仓位</p>"}
      <h3>行业暴露</h3>
      ${industryExposures.map((item: any) => `<div class="row"><strong>${escapeHtml(item.industry)}</strong><small>权重 ${escapeHtml(item.weight_pct)}% · ${escapeHtml(item.stock_count)} 只 · ${escapeHtml(item.concentration_label ?? "集中度正常")} · 上限 ${escapeHtml(item.suggested_max_weight_pct ?? 0)}% · 超额 ${escapeHtml(item.excess_weight_pct ?? 0)}% · 超额金额 ${escapeHtml(item.excess_market_value ?? 0)} 元 · 风险压力 ${escapeHtml(item.risk_score)}</small></div>`).join("") || "<p>暂无行业暴露</p>"}
      <h3>风险贡献</h3>
      ${riskContributions.map((item: any) => `<div class="row"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.symbol)} · ${escapeHtml(item.industry)} · 权重 ${escapeHtml(item.weight_pct)}% · 风险分 ${escapeHtml(item.risk_score)} · 贡献 ${escapeHtml(item.contribution_score)}</small></div>`).join("") || "<p>暂无风险贡献</p>"}
      <h3>再平衡建议</h3>
      ${rebalanceActions.map((item: any) => `<div class="row"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(reportRebalanceActionLabel(item.action))} · 当前 ${escapeHtml(item.current_weight_pct)}% · 建议 ${escapeHtml(item.suggested_weight_pct)}% · 调整 ${escapeHtml(item.delta_pct)}% · ${escapeHtml(item.reason)}</small></div>`).join("") || "<p>暂无再平衡建议</p>"}
      <p>输入权重：<code>${escapeHtml(JSON.stringify(weightInputs))}</code></p>
    </section>

    <section>
      <h2>策略回测</h2>
      <div class="grid">
        <div class="metric"><span>价格来源</span><strong>${escapeHtml(strategyBacktestPriceSourceLabel(strategyBacktest.price_source))}</strong></div>
        <div class="metric"><span>历史样本</span><strong>${escapeHtml(strategyBacktest.history_bar_count ? `${strategyBacktest.history_bar_count} 根` : "-")}</strong></div>
        <div class="metric"><span>最后交易日</span><strong>${escapeHtml(strategyBacktest.history_last_date ?? "-")}</strong></div>
        <div class="metric"><span>Fallback</span><strong>${escapeHtml(strategyBacktest.fallback_reason ?? "未发生 fallback")}</strong></div>
        <div class="metric"><span>样本可信度</span><strong>${escapeHtml(strategyBacktest.sample_confidence_score ?? 0)}</strong></div>
        <div class="metric"><span>可信等级</span><strong>${escapeHtml(strategyBacktest.sample_confidence_label ?? "暂无评估")}</strong></div>
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
      <h4>可信度说明</h4>
      ${sampleConfidenceNotes.map((note: any) => `<div class="row"><small>${escapeHtml(note)}</small></div>`).join("") || "<p>暂无可信度说明</p>"}
      <h3>收益分布</h3>
      <div class="grid">
        <div class="metric"><span>胜 / 负 / 平</span><strong>胜 ${escapeHtml(strategyBacktest.positive_trade_count ?? 0)} / 负 ${escapeHtml(strategyBacktest.negative_trade_count ?? 0)} / 平 ${escapeHtml(strategyBacktest.flat_trade_count ?? 0)}</strong></div>
        <div class="metric"><span>中位</span><strong>${escapeHtml(formatReportSignedPercent(strategyBacktest.return_median_pct ?? 0))}</strong></div>
        <div class="metric"><span>P25 / P75</span><strong>P25 ${escapeHtml(formatReportSignedPercent(strategyBacktest.return_p25_pct ?? 0))} · P75 ${escapeHtml(formatReportSignedPercent(strategyBacktest.return_p75_pct ?? 0))}</strong></div>
      </div>
      <h3>权益曲线</h3>
      <div class="grid">
        <div class="metric"><span>累计收益</span><strong>${escapeHtml(formatReportSignedPercent(latestEquityPoint?.equity_pct ?? 0))}</strong></div>
        <div class="metric"><span>路径最大回撤</span><strong>${escapeHtml(formatReportSignedPercent(maxPathDrawdown))}</strong></div>
      </div>
      ${equityCurve.slice(1, 7).map((point: any) => `<div class="row"><strong>${escapeHtml(point.label ?? point.name ?? point.symbol ?? "-")}</strong><small>${escapeHtml(point.symbol ?? "")} · 累计 ${escapeHtml(formatReportSignedPercent(point.equity_pct ?? 0))} · 单笔 ${escapeHtml(formatReportSignedPercent(point.trade_return_pct ?? 0))} · 路径回撤 ${escapeHtml(formatReportSignedPercent(point.drawdown_pct ?? 0))}</small></div>`).join("") || "<p>暂无权益曲线</p>"}
      <h3>稳定性</h3>
      <div class="grid">
        <div class="metric"><span>稳定评分</span><strong>${escapeHtml(strategyBacktest.stability_score ?? 0)}</strong></div>
        <div class="metric"><span>稳定等级</span><strong>${escapeHtml(strategyBacktest.stability_label ?? "暂无评估")}</strong></div>
        <div class="metric"><span>收益波动</span><strong>${escapeHtml(strategyBacktest.return_volatility_pct ?? 0)}%</strong></div>
        <div class="metric"><span>最长连续亏损</span><strong>${escapeHtml(strategyBacktest.max_consecutive_loss_count ?? 0)} 笔</strong></div>
        <div class="metric"><span>最佳连续收益</span><strong>${escapeHtml(formatReportSignedPercent(strategyBacktest.best_path_gain_pct ?? 0))}</strong></div>
        <div class="metric"><span>最差连续亏损</span><strong>${escapeHtml(formatReportSignedPercent(strategyBacktest.worst_path_loss_pct ?? 0))}</strong></div>
      </div>
      <h4>稳定性说明</h4>
      ${stabilityNotes.map((note: any) => `<div class="row"><small>${escapeHtml(note)}</small></div>`).join("") || "<p>暂无稳定性说明</p>"}
      <h3>历史对比</h3>
      <p>${escapeHtml(strategyBacktestHistory.summary ?? "暂无回测历史对比")}</p>
      <div class="grid">
        <div class="metric"><span>平均收益变化</span><strong>${escapeHtml(formatReportSignedPercent(strategyBacktestHistory.average_return_delta ?? 0))}</strong></div>
        <div class="metric"><span>最大回撤变化</span><strong>${escapeHtml(formatReportSignedPercent(strategyBacktestHistory.max_drawdown_delta ?? 0))}</strong></div>
        <div class="metric"><span>稳定评分变化</span><strong>${escapeHtml(formatReportSignedNumber(strategyBacktestHistory.stability_score_delta ?? 0))} 分</strong></div>
        <div class="metric"><span>可信度变化</span><strong>${escapeHtml(formatReportSignedNumber(strategyBacktestHistory.sample_confidence_delta ?? 0))} 分</strong></div>
      </div>
      <h4>最近回测</h4>
      ${backtestHistoryItems.slice(0, 6).map((item: any) => `<div class="row"><strong>${escapeHtml(item.holding_days)} 日 · ${escapeHtml(strategyBacktestPriceSourceLabel(item.price_source))}</strong><small>${escapeHtml(item.created_at ?? "-")} · 平均收益 ${escapeHtml(formatReportSignedPercent(item.average_return_pct ?? 0))} · 最大回撤 ${escapeHtml(formatReportSignedPercent(item.max_drawdown_pct ?? 0))} · 稳定 ${escapeHtml(item.stability_score ?? 0)} · 可信 ${escapeHtml(item.sample_confidence_score ?? 0)}</small></div>`).join("") || "<p>暂无最近回测</p>"}
      <h3>回测复盘动作</h3>
      <div class="grid">
        <div class="metric"><span>高优先级</span><strong>${escapeHtml(strategyBacktestActions.high_count ?? 0)}</strong></div>
        <div class="metric"><span>中优先级</span><strong>${escapeHtml(strategyBacktestActions.medium_count ?? 0)}</strong></div>
        <div class="metric"><span>低优先级</span><strong>${escapeHtml(strategyBacktestActions.low_count ?? 0)}</strong></div>
        <div class="metric"><span>待处理</span><strong>${escapeHtml(strategyBacktestActions.pending_count ?? 0)}</strong></div>
        <div class="metric"><span>观察中</span><strong>${escapeHtml(strategyBacktestActions.watching_count ?? 0)}</strong></div>
        <div class="metric"><span>已完成</span><strong>${escapeHtml(strategyBacktestActions.done_count ?? 0)}</strong></div>
      </div>
      ${backtestActionItems.slice(0, 8).map((item: any) => `<div class="row"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(reviewActionPriorityLabel(item.priority))} · ${escapeHtml(reviewActionStatusLabel(item.status))} · ${escapeHtml(item.category)} · ${escapeHtml(item.metric)} · ${escapeHtml(item.detail)} · 触发：${escapeHtml(item.trigger)}</small></div>`).join("") || "<p>暂无回测复盘动作</p>"}
      <h3>周期对比</h3>
      <p>${escapeHtml(strategyBacktestComparison.summary ?? "")}</p>
      ${strategyBacktestComparison.recommendation_reason ? `<p><strong>周期推荐依据：</strong>${escapeHtml(strategyBacktestComparison.recommendation_reason)}</p>` : ""}
      ${periodSummaries.slice(0, 6).map((period: any) => `<div class="row"><strong>${escapeHtml(period.holding_days)} 日${period.holding_days === strategyBacktestComparison.recommended_holding_days ? " · 推荐" : ""}</strong><small>交易 ${escapeHtml(period.trade_count ?? 0)} · 胜率 ${escapeHtml(period.win_rate ?? 0)}% · 平均收益 ${escapeHtml(period.average_return_pct ?? 0)}% · 最大回撤 ${escapeHtml(period.max_drawdown_pct ?? 0)}% · 收益回撤比 ${escapeHtml(period.return_drawdown_ratio ?? 0)} · ${escapeHtml(strategyBacktestPriceSourceLabel(period.price_source))} · ${escapeHtml(period.history_bar_count ? `${period.history_bar_count} 根` : "-")}</small></div>`).join("") || "<p>暂无周期对比</p>"}
      <h3>策略横向对比</h3>
      <p>${escapeHtml(strategyPresetComparison.summary ?? "")}</p>
      ${strategyPresetComparison.recommendation_reason ? `<p><strong>策略推荐依据：</strong>${escapeHtml(strategyPresetComparison.recommendation_reason)}</p>` : ""}
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
        <div class="metric"><span>质量评分</span><strong>${escapeHtml(dataQuality.score ?? "-")}</strong></div>
        <div class="metric"><span>质量状态</span><strong>${escapeHtml(reportQualityStatusLabel(dataQuality.status))}</strong></div>
        <div class="metric"><span>缓存命中</span><strong>${escapeHtml(cacheBuckets.length ? `${activeCacheEntries}/${totalCacheEntries} 有效` : "暂无遥测")}</strong></div>
        <div class="metric"><span>缓存 TTL</span><strong>${escapeHtml(cacheStatus.ttl_seconds ?? connectorHealth.runtime_config?.cache_ttl_seconds ?? "-")} 秒</strong></div>
        <div class="metric"><span>请求超时</span><strong>${escapeHtml(runtimeConfig.request_timeout_seconds ?? connectorHealth.runtime_config?.request_timeout_seconds ?? "-")} 秒</strong></div>
        <div class="metric"><span>过期阈值</span><strong>${escapeHtml(runtimeConfig.freshness_stale_after_minutes ?? connectorHealth.runtime_config?.freshness_stale_after_minutes ?? "-")} 分钟</strong></div>
      </div>
      <p>${escapeHtml(freshness.message ?? "")}</p>
      <p>${escapeHtml(dataQuality.summary ?? "暂无数据质量摘要")}</p>
      <h3>数据质量检查</h3>
      ${dataQualityChecks.map((check: any) => `<div class="row"><strong>${escapeHtml(check.label)} · ${escapeHtml(reportQualityStatusLabel(check.status))}</strong><small>${escapeHtml(check.detail)} · 影响：${escapeHtml(check.impact)}</small></div>`).join("") || "<p>暂无数据质量检查</p>"}
      <h3>运行配置</h3>
      <div class="grid">
        <div class="metric"><span>当前数据源</span><strong>${escapeHtml(runtimeConfig.active_provider ?? connectorHealth.active_provider ?? "-")}</strong></div>
        <div class="metric"><span>可选数据源</span><strong>${escapeHtml(Array.isArray(runtimeConfig.provider_options) ? runtimeConfig.provider_options.join(" / ") : "-")}</strong></div>
      </div>
      ${runtimePaths.map((item: any) => `<div class="row"><strong>${escapeHtml(item.label)} · ${escapeHtml(reportRuntimePathStatusLabel(item.exists))}</strong><small>${escapeHtml(item.env_var)} · ${escapeHtml(item.value || "未配置")}</small></div>`).join("") || "<p>暂无本地路径配置</p>"}
      <h3>密钥配置</h3>
      ${runtimeSecrets.map((item: any) => `<div class="row"><strong>${escapeHtml(item.label)} · ${escapeHtml(item.configured ? "已配置" : "未配置")}</strong><small>${escapeHtml(item.env_var)} · ${escapeHtml(item.configured ? "已通过环境变量配置" : "未配置，相关增强能力暂不可用")}</small></div>`).join("") || "<p>暂无密钥配置</p>"}
      <h3>连接器明细</h3>
      ${connectors.slice(0, 10).map((connector: any) => `<div class="row"><strong>${escapeHtml(connector.name)}${connector.active ? " · 当前启用" : ""}</strong><small>${escapeHtml(reportConnectorStatusLabel(connector.status))} · ${escapeHtml(humanizeConnectorMessage(connector.message ?? connector.role ?? ""))} · 下一步：${escapeHtml(humanizeConnectorMessage(connector.next_action ?? "-"))}</small></div>`).join("") || "<p>暂无连接器明细</p>"}
      <h3>缓存桶</h3>
      ${cacheBuckets.map((bucket: any) => `<div class="row"><strong>${escapeHtml(bucket.label)}</strong><small>${escapeHtml(bucket.active_entries ?? 0)}/${escapeHtml(bucket.entries ?? 0)} 有效 · 已过期 ${escapeHtml(bucket.expired_entries ?? 0)} · 最近 ${escapeHtml(bucket.nearest_expires_in_seconds ?? 0)} 秒后过期 · 命中 ${escapeHtml(bucket.hit_count ?? 0)} / 未命中 ${escapeHtml(bucket.miss_count ?? 0)} · 命中率 ${escapeHtml(formatReportPercent(bucket.hit_rate_pct ?? 0))} · ${escapeHtml(reportCacheStatusLabel(bucket.status))}</small></div>`).join("") || "<p>暂无缓存遥测</p>"}
    </section>

    <section>
      <h2>复盘行动</h2>
      <div class="grid">
        <div class="metric"><span>高优先级</span><strong>${escapeHtml(reviewActions.high_count ?? 0)}</strong></div>
        <div class="metric"><span>中优先级</span><strong>${escapeHtml(reviewActions.medium_count ?? 0)}</strong></div>
        <div class="metric"><span>低优先级</span><strong>${escapeHtml(reviewActions.low_count ?? 0)}</strong></div>
        <div class="metric"><span>待处理</span><strong>${escapeHtml(reviewActions.pending_count ?? 0)}</strong></div>
        <div class="metric"><span>观察中</span><strong>${escapeHtml(reviewActions.watching_count ?? 0)}</strong></div>
        <div class="metric"><span>已完成</span><strong>${escapeHtml(reviewActions.done_count ?? 0)}</strong></div>
      </div>
      <p>${escapeHtml(reviewActions.name ?? diagnosis.name ?? "")} · ${escapeHtml(reviewActions.horizon ?? payload.horizon ?? "")} · ${escapeHtml(reviewActions.generated_at ?? "")}</p>
      ${reviewActionItems.map((item: any) => `<div class="row"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(reviewActionPriorityLabel(item.priority))} · ${escapeHtml(reviewActionStatusLabel(item.status))} · ${escapeHtml(item.category)} · ${escapeHtml(item.detail)} · 来源 ${escapeHtml(item.source)}</small></div>`).join("") || "<p>暂无复盘行动</p>"}
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

function reviewActionPriorityLabel(priority: unknown) {
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  if (priority === 'low') return '低优先级'
  return '未分级'
}

function reviewActionStatusLabel(status: unknown) {
  if (status === 'pending') return '待处理'
  if (status === 'watching') return '观察中'
  if (status === 'done') return '已完成'
  return '未设置'
}

function reportQualityStatusLabel(status: unknown) {
  if (status === 'pass') return '通过'
  if (status === 'warn') return '需核验'
  if (status === 'fail') return '不可用'
  return '未评估'
}

function reportRuntimePathStatusLabel(exists: unknown) {
  if (exists === true) return '可用'
  if (exists === false) return '未找到'
  return '未配置'
}

function reportCacheStatusLabel(status: unknown) {
  if (status === 'active') return '全部有效'
  if (status === 'partial') return '部分有效'
  if (status === 'expired') return '全部过期'
  return '暂无缓存'
}

function reportConnectorStatusLabel(status: unknown) {
  if (status === 'online') return '在线'
  if (status === 'fallback') return '备用'
  if (status === 'missing-package') return '缺少依赖'
  if (status === 'planned') return '规划中'
  if (status === 'error') return '异常'
  return '未知'
}

function reportRebalanceActionLabel(action: unknown) {
  if (action === 'reduce') return '降权'
  if (action === 'increase') return '补强'
  return '保持'
}

function reportScoreDirectionLabel(direction: unknown) {
  if (direction === 'up') return '持续走强'
  if (direction === 'down') return '持续转弱'
  if (direction === 'flat') return '保持平稳'
  if (direction === 'mixed') return '波动反复'
  return '基线'
}

function reportRiskDirectionLabel(direction: unknown) {
  if (direction === 'improved') return '持续改善'
  if (direction === 'worsened') return '持续走弱'
  if (direction === 'flat') return '保持平稳'
  if (direction === 'mixed') return '波动反复'
  return '基线'
}

function formatReportSignedPercent(value: unknown) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '0.00%'
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}%`
}

function formatReportSignedNumber(value: unknown) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '+0'
  return `${numeric >= 0 ? '+' : ''}${numeric}`
}

function formatReportPercent(value: unknown) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '0.0%'
  return `${numeric.toFixed(1)}%`
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

function readStoredPortfolioInputs(): PortfolioInputs {
  if (typeof window === 'undefined') {
    return DEFAULT_PORTFOLIO_INPUTS
  }

  try {
    const raw = window.localStorage.getItem(PORTFOLIO_INPUTS_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PORTFOLIO_INPUTS
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_PORTFOLIO_INPUTS
    }
    return normalizePortfolioInputs(parsed as Partial<PortfolioInputs>)
  } catch {
    return DEFAULT_PORTFOLIO_INPUTS
  }
}

function writeStoredPortfolioInputs(inputs: PortfolioInputs) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(PORTFOLIO_INPUTS_STORAGE_KEY, JSON.stringify(normalizePortfolioInputs(inputs)))
  } catch {
    // localStorage can be unavailable in restricted browser modes; keep the in-memory state.
  }
}

function normalizePortfolioInputs(inputs: Partial<PortfolioInputs>): PortfolioInputs {
  const weights: Record<string, string> = {}
  const lots: Record<string, { shares: string; cost_price: string }> = {}
  const rawWeights = inputs.weights
  if (rawWeights && typeof rawWeights === 'object' && !Array.isArray(rawWeights)) {
    Object.entries(rawWeights).forEach(([symbol, value]) => {
      const normalizedSymbol = symbol.trim()
      const normalizedValue = normalizePortfolioInputNumber(value, 0, 100)
      if (normalizedSymbol && normalizedSymbol.length <= 12 && normalizedValue !== '') {
        weights[normalizedSymbol] = normalizedValue
      }
    })
  }
  const rawLots = inputs.lots
  if (rawLots && typeof rawLots === 'object' && !Array.isArray(rawLots)) {
    Object.entries(rawLots).forEach(([symbol, value]) => {
      const normalizedSymbol = symbol.trim()
      if (!normalizedSymbol || normalizedSymbol.length > 12 || !value || typeof value !== 'object' || Array.isArray(value)) {
        return
      }
      const lot = value as Partial<{ shares: unknown; cost_price: unknown }>
      const shares = normalizePortfolioInputNumber(lot.shares, 0, 1_000_000_000)
      const costPrice = normalizePortfolioInputNumber(lot.cost_price, 0, 1_000_000)
      if (shares !== '' || costPrice !== '') {
        lots[normalizedSymbol] = { shares, cost_price: costPrice }
      }
    })
  }

  return {
    weights,
    lots,
    portfolio_value: normalizePortfolioInputNumber(inputs.portfolio_value, 0, 1_000_000_000),
  }
}

function parsePortfolioLotsText(text: string): Record<string, { shares: string; cost_price: string }> {
  const lots: Record<string, { shares: string; cost_price: string }> = {}
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || /^symbol|^代码|^证券代码/i.test(trimmed)) {
      return
    }
    const parts = trimmed.split(/[\t,;，；]+/).map((part) => part.trim()).filter(Boolean)
    if (parts.length < 2) {
      return
    }
    const symbol = parts[0].toUpperCase()
    const shares = normalizePortfolioInputNumber(parts[1], 0, 1_000_000_000)
    const costPrice = normalizePortfolioInputNumber(parts[2], 0, 1_000_000)
    if (symbol && symbol.length <= 12 && shares !== '') {
      lots[symbol] = { shares, cost_price: costPrice }
    }
  })
  return lots
}

function parsePortfolioTradesText(text: string): Record<string, { shares: string; cost_price: string }> {
  const positions: Record<string, { shares: number; cost_amount: number }> = {}
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || /^symbol|^代码|^证券代码/i.test(trimmed)) {
      return
    }
    const parts = trimmed.split(/[\t,;，；]+/).map((part) => part.trim()).filter(Boolean)
    if (parts.length < 4) {
      return
    }
    const symbol = parts[0].toUpperCase()
    const side = parts[1]
    const shares = Number(parts[2])
    const price = Number(parts[3])
    if (!symbol || symbol.length > 12 || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(price) || price <= 0) {
      return
    }
    const current = positions[symbol] ?? { shares: 0, cost_amount: 0 }
    if (isSellTradeSide(side)) {
      const closedShares = Math.min(current.shares, shares)
      const averageCost = current.shares > 0 ? current.cost_amount / current.shares : 0
      current.shares = Math.max(0, current.shares - closedShares)
      current.cost_amount = Math.max(0, current.cost_amount - averageCost * closedShares)
    } else if (isBuyTradeSide(side)) {
      current.shares += shares
      current.cost_amount += shares * price
    }
    positions[symbol] = current
  })

  const lots: Record<string, { shares: string; cost_price: string }> = {}
  Object.entries(positions).forEach(([symbol, position]) => {
    if (position.shares <= 0) {
      return
    }
    lots[symbol] = {
      shares: String(Number(position.shares.toFixed(4))),
      cost_price: String(Number((position.cost_amount / position.shares).toFixed(4))),
    }
  })
  return lots
}

function isBuyTradeSide(value: string) {
  return /^(buy|b|买|买入|证券买入)$/i.test(value)
}

function isSellTradeSide(value: string) {
  return /^(sell|s|卖|卖出|证券卖出)$/i.test(value)
}

function readTextFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function normalizePortfolioInputNumber(value: unknown, min: number, max: number) {
  const text = String(value ?? '').trim()
  if (!text) {
    return ''
  }
  const parsed = Number(text)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return ''
  }
  return text
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
