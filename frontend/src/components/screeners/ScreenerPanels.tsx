import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
import { useState, type ReactNode } from 'react'
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
} from '../../lib/types'
import { formatShortDate } from '../../lib/formatters'

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
  { value: 'breakout-volume', label: '放量突破' },
  { value: 'capital-return', label: '资金回流' },
  { value: 'risk-avoidance', label: '风险回避' },
]

export function WatchlistSummaryPanel({
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



export function ReviewActionOverviewPanel({
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


export function ActionCenterPanel({
  reviewOverview,
  hotspotPlan,
  backtestPlan,
  onSelect,
}: {
  reviewOverview: ReviewActionOverview | null
  hotspotPlan: HotspotReviewPlan | null
  backtestPlan: StrategyBacktestActionPlan | null
  onSelect: (symbol: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'watching' | 'done'>('all')
  const totals = {
    high: (reviewOverview?.high_count ?? 0) + (hotspotPlan?.high_count ?? 0) + (backtestPlan?.high_count ?? 0),
    medium: (reviewOverview?.medium_count ?? 0) + (hotspotPlan?.medium_count ?? 0) + (backtestPlan?.medium_count ?? 0),
    low: (reviewOverview?.low_count ?? 0) + (hotspotPlan?.low_count ?? 0) + (backtestPlan?.low_count ?? 0),
    pending: (reviewOverview?.pending_count ?? 0) + (hotspotPlan?.pending_count ?? 0) + (backtestPlan?.pending_count ?? 0),
    watching: (reviewOverview?.watching_count ?? 0) + (hotspotPlan?.watching_count ?? 0) + (backtestPlan?.watching_count ?? 0),
    done: (reviewOverview?.done_count ?? 0) + (hotspotPlan?.done_count ?? 0) + (backtestPlan?.done_count ?? 0),
  }
  const ready = reviewOverview && hotspotPlan && backtestPlan
  const actionTotal = totals.pending + totals.watching + totals.done
  const filteredHotspotActions = ready
    ? hotspotPlan.actions.filter((item) => statusFilter === 'all' || item.status === statusFilter)
    : []
  const filteredBacktestActions = ready
    ? backtestPlan.actions.filter((item) => statusFilter === 'all' || item.status === statusFilter)
    : []
  const reviewSectionCount = ready
    ? statusFilter === 'all'
      ? reviewOverview.pending_count + reviewOverview.watching_count + reviewOverview.done_count
      : actionCenterStatusCount(reviewOverview, statusFilter)
    : 0

  return (
    <section className="panel action-center-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>行动中心</h3>
        </span>
        <small>{ready ? `${actionTotal} 项动作` : '加载中'}</small>
      </div>
      {ready ? (
        <>
          <div className="action-center-metrics">
            <SummaryMetric label="待处理" value={totals.pending} />
            <SummaryMetric label="观察中" value={totals.watching} />
            <SummaryMetric label="已完成" value={totals.done} />
          </div>
          <div className="action-center-priority">
            <span className="high">高 {totals.high}</span>
            <span className="medium">中 {totals.medium}</span>
            <span className="low">低 {totals.low}</span>
          </div>
          <div className="mini-segments action-center-status-filter" aria-label="行动中心状态筛选">
            {([
              ['all', '全部'],
              ['pending', '待处理'],
              ['watching', '观察中'],
              ['done', '已完成'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? 'selected' : ''}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="action-center-sections">
            <ActionCenterSection title="自选股复盘" count={reviewSectionCount}>
              {statusFilter !== 'all' ? (
                <p className="empty-text">自选股复盘是股票级汇总，请进入个股查看状态明细。</p>
              ) : reviewOverview.summaries.length ? (
                reviewOverview.summaries.slice(0, 3).map((item) => (
                  <button type="button" key={item.symbol} className={`action-center-row ${item.top_priority}`} onClick={() => onSelect(item.symbol)}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.symbol} · {item.item_count} 项 · {item.industry || '自选股'}</small>
                    </span>
                    <b>{item.top_action}</b>
                  </button>
                ))
              ) : (
                <p className="empty-text">暂无自选股复盘动作</p>
              )}
            </ActionCenterSection>
            <ActionCenterSection title="热点跟踪" count={statusFilter === 'all' ? hotspotPlan.pending_count + hotspotPlan.watching_count + hotspotPlan.done_count : filteredHotspotActions.length}>
              {filteredHotspotActions.length ? (
                filteredHotspotActions.slice(0, 3).map((item) => (
                  <button type="button" key={item.id} className={`action-center-row ${item.priority}`} onClick={() => onSelect(item.symbol)}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.concept} · {reviewStatusLabel(item.status)}</small>
                    </span>
                    <b>{item.title}</b>
                  </button>
                ))
              ) : (
                <p className="empty-text">{statusFilter === 'all' ? '暂无热点跟踪动作' : '当前筛选下暂无热点跟踪动作'}</p>
              )}
            </ActionCenterSection>
            <ActionCenterSection title="回测复盘" count={statusFilter === 'all' ? backtestPlan.pending_count + backtestPlan.watching_count + backtestPlan.done_count : filteredBacktestActions.length}>
              {filteredBacktestActions.length ? (
                filteredBacktestActions.slice(0, 3).map((item) => (
                  <article key={item.id} className={`action-center-row passive ${item.priority}`}>
                    <span>
                      <strong>{item.category}</strong>
                      <small>{item.metric} · {reviewStatusLabel(item.status)}</small>
                    </span>
                    <b>{item.title}</b>
                  </article>
                ))
              ) : (
                <p className="empty-text">{statusFilter === 'all' ? '暂无回测复盘动作' : '当前筛选下暂无回测复盘动作'}</p>
              )}
            </ActionCenterSection>
          </div>
        </>
      ) : (
        <p className="empty-text">正在汇总复盘、热点和回测动作...</p>
      )}
    </section>
  )
}


function actionCenterStatusCount(
  overview: ReviewActionOverview,
  status: 'pending' | 'watching' | 'done',
) {
  if (status === 'watching') return overview.watching_count
  if (status === 'done') return overview.done_count
  return overview.pending_count
}


function ActionCenterSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <div className="action-center-section">
      <div>
        <strong>{title}</strong>
        <small>{count} 项</small>
      </div>
      {children}
    </div>
  )
}


function reviewStatusLabel(status: 'pending' | 'watching' | 'done') {
  if (status === 'done') return '已完成'
  if (status === 'watching') return '观察中'
  return '待处理'
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



export function DataQualityOverviewPanel({
  overview,
  onSelect,
}: {
  overview: DataQualityOverview | null
  onSelect: (symbol: string) => void
}) {
  const [qualityFilter, setQualityFilter] = useState<'all' | 'runtime' | 'fallback' | 'warn' | 'fail'>('all')
  const reports = overview?.reports ?? []
  const qualityBuckets = {
    runtime: reports.filter((report) => dataQualityCategory(report) === 'runtime'),
    fallback: reports.filter((report) => dataQualityCategory(report) === 'fallback'),
    warn: reports.filter((report) => dataQualityCategory(report) === 'warn'),
    fail: reports.filter((report) => dataQualityCategory(report) === 'fail'),
  }
  const runtimeCount = overview?.runtime_warn_count ?? qualityBuckets.runtime.length
  const fallbackCount = overview?.fallback_warn_count ?? qualityBuckets.fallback.length
  const genericWarnCount = overview?.generic_warn_count ?? qualityBuckets.warn.length
  const filteredReports = qualityFilter === 'all' ? reports : qualityBuckets[qualityFilter]
  const selectedLowest = filteredReports[0] ?? null
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
            <SummaryMetric label="部分兜底" value={fallbackCount} />
            <SummaryMetric label="运行刷新" value={runtimeCount} />
            <SummaryMetric label="异常" value={overview.fail_count} />
          </div>
          <div className="mini-segments quality-filter" aria-label="数据质量筛选">
            {([
              ['all', `全部 ${reports.length}`],
              ['runtime', `运行 ${runtimeCount}`],
              ['fallback', `兜底 ${fallbackCount}`],
              ['warn', `核验 ${genericWarnCount}`],
              ['fail', `异常 ${qualityBuckets.fail.length}`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={qualityFilter === value ? 'selected' : ''}
                onClick={() => setQualityFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {selectedLowest ? (
            <button
              type="button"
              className={`quality-lowest ${selectedLowest.status}`}
              onClick={() => onSelect(selectedLowest.symbol)}
            >
              <span>
                <strong>{selectedLowest.name}</strong>
                <small>{selectedLowest.symbol} · {dataQualityCategoryLabel(selectedLowest)} · {selectedLowest.summary}</small>
              </span>
              <em>{selectedLowest.score}</em>
            </button>
          ) : (
            <p className="empty-text">当前筛选下暂无数据质量问题</p>
          )}
        </>
      ) : (
        <p className="empty-text">正在汇总自选股数据质量...</p>
      )}
    </section>
  )
}

function dataQualityCategory(report: DataQualityReport) {
  if (report.status === 'fail') return 'fail'
  if (report.checks.some((check) => check.key === 'runtime_environment' && check.status !== 'pass')) return 'runtime'
  if (report.checks.some((check) => check.key === 'source_coverage' && check.status === 'warn')) return 'fallback'
  if (report.status === 'warn') return 'warn'
  return 'pass'
}

function dataQualityCategoryLabel(report: DataQualityReport) {
  const category = dataQualityCategory(report)
  if (category === 'runtime') return '运行需刷新'
  if (category === 'fallback') return '部分兜底'
  if (category === 'warn') return '需核验'
  if (category === 'fail') return '异常'
  return '可靠'
}



function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}



export function TimelinePanel({ events, onSelect }: { events: TimelineEvent[]; onSelect: (symbol: string) => void }) {
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



export function RiskExposurePanel({
  report,
  watchlist,
  positionWeights,
  positionLots,
  importMessage,
  portfolioValue,
  onPositionWeightChange,
  onPositionLotChange,
  onPositionLotsImport,
  onPositionTradesImport,
  onPortfolioValueChange,
  onSelect,
}: {
  report: PortfolioRiskReport | null
  watchlist: StockSummary[]
  positionWeights: Record<string, string>
  positionLots: Record<string, { shares: string; cost_price: string }>
  importMessage: string
  portfolioValue: string
  onPositionWeightChange: (symbol: string, value: string) => void
  onPositionLotChange: (symbol: string, field: 'shares' | 'cost_price', value: string) => void
  onPositionLotsImport: (file: File) => void
  onPositionTradesImport: (file: File) => void
  onPortfolioValueChange: (value: string) => void
  onSelect: (symbol: string) => void
}) {
  const items = report?.exposures ?? []
  const industryExposures = report?.industry_exposures ?? []
  const riskContributions = report?.risk_contributions ?? []
  const rebalanceActions = report?.rebalance_actions ?? []
  const positions = report?.positions.length
    ? report.positions
    : watchlist.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      industry: stock.industry,
      weight_pct: 0,
      market_value: 0,
      shares: 0,
      cost_price: 0,
      cost_amount: 0,
      unrealized_pnl: 0,
      unrealized_pnl_pct: 0,
    }))
  return (
    <section className="panel exposure-panel">
      <div className="panel-title split-title">
        <span>
          <ShieldAlert size={18} />
          <h3>组合风险</h3>
        </span>
        <small>{report ? `${report.risk_label} · ${report.weight_mode === 'custom' ? '自定义权重' : '等权模拟'}` : '加载中'}</small>
      </div>
      {!report ? (
        <p className="empty-text">正在汇总组合风险...</p>
      ) : report.stock_count === 0 ? (
        <p className="empty-text">当前范围暂无组合风险数据</p>
      ) : (
        <>
          <div className="portfolio-risk-head">
            <span className={report.risk_level}>
              <small>风险压力</small>
              <strong>{report.portfolio_risk_score}</strong>
              <em>{report.risk_label}</em>
            </span>
            <span>
              <small>平均诊断</small>
              <strong>{report.average_total_score.toFixed(1)}</strong>
              <em>{report.stock_count} 只标的</em>
            </span>
            <span>
              <small>平均风控</small>
              <strong>{report.average_risk_score.toFixed(1)}</strong>
              <em>{report.summary}</em>
            </span>
          </div>
          <div className="portfolio-risk-grid">
            <article>
              <small>行业集中</small>
              <strong>{report.concentration.top_industry} {formatPercent(report.concentration.top_industry_ratio)}</strong>
              <span>{report.concentration.industry_count} 个行业 · 最高 {report.concentration.top_industry_count} 只</span>
            </article>
            <article>
              <small>风险分布</small>
              <strong>高 {report.distribution.high_count} / 中 {report.distribution.medium_count} / 低 {report.distribution.low_count}</strong>
              <span>按诊断风险分聚合</span>
            </article>
            <article>
              <small>组合市值</small>
              <strong>{report.total_market_value > 0 ? formatCurrency(report.total_market_value) : '未设置'}</strong>
              <span>现金 {formatCurrency(report.cash_amount)}</span>
            </article>
            {report.top_drivers[0] ? (
              <button type="button" onClick={() => onSelect(report.top_drivers[0].symbol)}>
                <small>首要拖累</small>
                <strong>{report.top_drivers[0].name}</strong>
                <span>{report.top_drivers[0].primary_risk}</span>
              </button>
            ) : null}
          </div>
          <div className="position-weight-editor">
            <div>
              <span>
                <strong>模拟仓位</strong>
                <small>{report.weight_mode === 'custom' ? '自定义权重' : '等权模拟'} · 总权重 {report.total_position_weight.toFixed(1)}%</small>
              </span>
              <span className="portfolio-import-actions">
                <label className="file-action portfolio-import-action">
                  <Upload size={15} />
                  <span>导入持仓</span>
                  <input
                    aria-label="导入持仓文件"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onPositionLotsImport(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                <label className="file-action portfolio-import-action">
                  <Upload size={15} />
                  <span>导入流水</span>
                  <input
                    aria-label="导入交易流水文件"
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onPositionTradesImport(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              </span>
            </div>
            <p className="portfolio-import-hint">
              持仓：symbol,shares,cost_price · 流水：symbol,side,shares,price
              {importMessage ? <strong>{importMessage}</strong> : null}
            </p>
            <label className="portfolio-value-input">
              <span>组合市值</span>
              <input
                aria-label="组合市值"
                type="number"
                min="0"
                step="1000"
                value={portfolioValue}
                onChange={(event) => onPortfolioValueChange(event.target.value)}
                placeholder="例如 100000"
              />
              <em>元</em>
            </label>
            <div className="position-weight-list">
              {positions.map((position) => {
                const lot = positionLots[position.symbol] ?? { shares: '', cost_price: '' }
                return (
                  <label key={position.symbol}>
                    <span>{position.name}</span>
                    <small>
                      {position.symbol}{position.market_value > 0 ? ` · ${formatCurrency(position.market_value)}` : ''}
                      {position.cost_amount > 0 ? ` · 成本 ${formatCurrency(position.cost_amount)} · ${formatSignedCurrency(position.unrealized_pnl)} (${formatPositionSignedPercent(position.unrealized_pnl_pct)})` : ''}
                    </small>
                    <input
                      aria-label={`模拟仓位 ${position.name}`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={positionWeights[position.symbol] ?? formatWeightInput(position.weight_pct)}
                      onChange={(event) => onPositionWeightChange(position.symbol, event.target.value)}
                    />
                    <em>%</em>
                    <input
                      aria-label={`持仓数量 ${position.name}`}
                      type="number"
                      min="0"
                      step="1"
                      value={lot.shares}
                      onChange={(event) => onPositionLotChange(position.symbol, 'shares', event.target.value)}
                    />
                    <em>股</em>
                    <input
                      aria-label={`成本价 ${position.name}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={lot.cost_price}
                      onChange={(event) => onPositionLotChange(position.symbol, 'cost_price', event.target.value)}
                    />
                    <em>元</em>
                  </label>
                )
              })}
            </div>
          </div>
          {industryExposures.length ? (
            <div className="portfolio-suggestions">
              <strong>行业暴露</strong>
              {industryExposures.slice(0, 4).map((item) => (
                <span key={item.industry}>
                  <b className={`concentration-pill ${item.concentration_level}`}>{item.concentration_label}</b>
                  {item.industry} {formatWeightPercent(item.weight_pct)} · 上限 {formatWeightPercent(item.suggested_max_weight_pct)} · 风险压力 {item.risk_score.toFixed(1)}
                  {item.excess_weight_pct > 0 ? (
                    <small>
                      超额 {formatWeightPercent(item.excess_weight_pct)}
                      {item.excess_market_value > 0 ? ` · ${formatCurrency(item.excess_market_value)}` : ''}
                    </small>
                  ) : (
                    <small>{item.stock_count} 只 · 集中度正常</small>
                  )}
                </span>
              ))}
            </div>
          ) : null}
          {riskContributions.length ? (
            <div className="portfolio-suggestions">
              <strong>风险贡献</strong>
              {riskContributions.slice(0, 4).map((item) => (
                <span key={item.symbol}>{item.name} · {item.industry} · 权重 {formatWeightPercent(item.weight_pct)} · 贡献 {item.contribution_score.toFixed(1)}</span>
              ))}
            </div>
          ) : null}
          {rebalanceActions.length ? (
            <div className="portfolio-suggestions">
              <strong>再平衡建议</strong>
              {rebalanceActions.slice(0, 4).map((item) => (
                <span key={item.symbol}>
                  {item.name} · {rebalanceActionLabel(item.action)} · {formatWeightPercent(item.current_weight_pct)} → {formatWeightPercent(item.suggested_weight_pct)}
                  <small>{item.reason}</small>
                </span>
              ))}
            </div>
          ) : null}
          {report.suggestions.length ? (
            <div className="portfolio-suggestions">
              {report.suggestions.map((suggestion) => (
                <span key={suggestion}>{suggestion}</span>
              ))}
            </div>
          ) : null}
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
        </>
      )}
    </section>
  )
}



function timelineStatusLabel(status: TimelineEvent['status']) {
  return status === 'open' ? '处理' : '观察'
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function formatWeightInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  return String(Number(value.toFixed(2)))
}

function formatWeightPercent(value: number) {
  if (!Number.isFinite(value)) return '--'
  return `${value.toFixed(1)}%`
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 元'
  return `${Math.round(value).toLocaleString('zh-CN')} 元`
}

function formatSignedCurrency(value: number) {
  if (!Number.isFinite(value)) return '+0 元'
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${Math.round(value).toLocaleString('zh-CN')} 元`
}

function formatPositionSignedPercent(value: number) {
  if (!Number.isFinite(value)) return '+0.00%'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function rebalanceActionLabel(action: 'reduce' | 'hold' | 'increase') {
  if (action === 'reduce') return '降权'
  if (action === 'increase') return '补强'
  return '保持'
}



export function AlertCenter({ alerts, onSelect }: { alerts: AlertItem[]; onSelect: (symbol: string) => void }) {
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


function priorityLabel(priority: ReviewActionStockSummary['top_priority']) {
  if (priority === 'high') return '高优先'
  if (priority === 'medium') return '观察'
  return '低优先'
}



export function RankingPanel({
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



export function ScreenerPanel({
  candidates,
  preset,
  onPresetChange,
  onSelect,
  error,
  onRetry,
}: {
  candidates: ScreenCandidate[]
  preset: string
  onPresetChange: (preset: string) => void
  onSelect: (symbol: string) => void
  error: string | null
  onRetry: () => void
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
      {error ? (
        <div className="panel-state error-state">
          <strong>策略股票池加载失败</strong>
          <span>{error}</span>
          <small>请检查行情源或稍后重试，本次没有更新候选结果。</small>
          <button type="button" onClick={onRetry}>重试策略池</button>
        </div>
      ) : candidates.length === 0 ? (
        <div className="panel-state empty-state">
          <strong>当前策略没有候选股票</strong>
          <span>可以切换策略，或等待下一轮行情刷新后再看。</span>
        </div>
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
              {(item.rule_tags?.length || item.positive_evidence || item.invalidation_risk) ? (
                <div className="screener-explain">
                  {item.rule_tags?.length ? (
                    <div className="screener-tags">
                      <span>命中规则</span>
                      {item.rule_tags.map((tag) => (
                        <small key={tag}>{tag}</small>
                      ))}
                    </div>
                  ) : null}
                  {item.positive_evidence ? (
                    <div className="screener-explain-row">
                      <span>正面证据</span>
                      <small>{item.positive_evidence}</small>
                    </div>
                  ) : null}
                  {item.invalidation_risk ? (
                    <div className="screener-explain-row risk">
                      <span>失效风险</span>
                      <small>{item.invalidation_risk}</small>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}



export function StrategyBacktestPanel({
  report,
  comparison,
  history,
  presetComparison,
  actions,
  currentPreset,
  holdingDays,
  feeBps,
  slippageBps,
  takeProfitPct,
  stopLossPct,
  exitOnMa20Break,
  exitVolumeRatio,
  diagnosisExitScore,
  limit,
  onHoldingDaysChange,
  onFeeBpsChange,
  onSlippageBpsChange,
  onTakeProfitPctChange,
  onStopLossPctChange,
  onExitOnMa20BreakChange,
  onExitVolumeRatioChange,
  onDiagnosisExitScoreChange,
  onLimitChange,
  error,
  comparisonError,
  historyError,
  presetComparisonError,
  actionsError,
  updatingActionId,
  onActionStatus,
  onRetry,
}: {
  report: StrategyBacktestReport | null
  comparison: StrategyBacktestComparison | null
  history: StrategyBacktestHistoryComparison | null
  presetComparison: StrategyBacktestPresetComparison | null
  actions: StrategyBacktestActionPlan | null
  currentPreset: string
  holdingDays: number
  feeBps: number
  slippageBps: number
  takeProfitPct: number
  stopLossPct: number
  exitOnMa20Break: boolean
  exitVolumeRatio: number
  diagnosisExitScore: number
  limit: number
  onHoldingDaysChange: (days: number) => void
  onFeeBpsChange: (value: number) => void
  onSlippageBpsChange: (value: number) => void
  onTakeProfitPctChange: (value: number) => void
  onStopLossPctChange: (value: number) => void
  onExitOnMa20BreakChange: (value: boolean) => void
  onExitVolumeRatioChange: (value: number) => void
  onDiagnosisExitScoreChange: (value: number) => void
  onLimitChange: (value: number) => void
  error: string | null
  comparisonError: string | null
  historyError: string | null
  presetComparisonError: string | null
  actionsError: string | null
  updatingActionId: string | null
  onActionStatus: (actionId: string, status: StrategyBacktestActionPlan['actions'][number]['status']) => void
  onRetry: () => void
}) {
  const equityCurve = Array.isArray(report?.equity_curve) ? report.equity_curve : []
  const latestEquityPoint = equityCurve[equityCurve.length - 1]
  const maxPathDrawdown = equityCurve.length ? Math.min(...equityCurve.map((point) => point.drawdown_pct)) : 0
  const stabilityNotes = Array.isArray(report?.stability_notes) ? report.stability_notes : []
  const sampleConfidenceNotes = Array.isArray(report?.sample_confidence_notes) ? report.sample_confidence_notes : []

  return (
    <section className="panel strategy-backtest-panel">
      <div className="panel-title split-title">
        <span>
          <BarChart3 size={18} />
          <h3>策略回测</h3>
        </span>
        <div className="mini-segments" aria-label="回测持有周期">
          {[3, 5, 10, 20].map((days) => (
            <button
              type="button"
              key={days}
              className={holdingDays === days ? 'selected' : ''}
              onClick={() => onHoldingDaysChange(days)}
            >
              {days}日
            </button>
          ))}
        </div>
      </div>
      <p className="backtest-period-note">{report ? `${report.holding_days} 日持有` : '加载中'}</p>
      {error ? (
        <div className="panel-state error-state">
          <strong>策略回测加载失败</strong>
          <span>{error}</span>
          <small>回测失败不会影响候选股列表，当前缓存数据会保留。</small>
          <button type="button" onClick={onRetry}>重试回测</button>
        </div>
      ) : !report ? (
        <p className="empty-text">正在生成回测...</p>
      ) : report.trade_count === 0 ? (
        <div className="panel-state empty-state">
          <strong>当前策略暂无可回测交易</strong>
          <span>{report.summary || '可以切换策略或等待行情刷新后再看。'}</span>
        </div>
      ) : (
        <>
          <div className="backtest-lineage-card">
            <span>
              <small>价格来源</small>
              <strong>{backtestPriceSourceLabel(report.price_source)}</strong>
            </span>
            <span>
              <small>历史样本</small>
              <strong>{formatBacktestHistoryCount(report.history_bar_count)}</strong>
            </span>
            <span>
              <small>最后交易日</small>
              <strong>{report.history_last_date ?? '-'}</strong>
            </span>
            <span>
              <small>样本可信度</small>
              <strong>{report.sample_confidence_score ?? 0}</strong>
            </span>
            <span>
              <small>可信等级</small>
              <strong>{report.sample_confidence_label ?? '暂无评估'}</strong>
            </span>
            <em>
              {sampleConfidenceNotes.length ? (
                <>
                  <small>可信度说明</small>
                  <b>{sampleConfidenceNotes.slice(0, 2).join(' · ')}</b>
                </>
              ) : (
                report.fallback_reason ?? '未发生 fallback'
              )}
            </em>
          </div>
          <div className="backtest-cost-card">
            <strong>成本口径</strong>
            <span>
              <small>手续费</small>
              <b>{formatBps(report.fee_bps)}</b>
            </span>
            <span>
              <small>滑点</small>
              <b>{formatBps(report.slippage_bps)}</b>
            </span>
            <span>
              <small>单笔成本</small>
              <b>{formatPlainPercent(report.round_trip_cost_pct)}</b>
            </span>
            <span>
              <small>止盈</small>
              <b>{formatPlainPercent(report.take_profit_pct)}</b>
            </span>
            <span>
              <small>止损</small>
              <b>{formatPlainPercent(report.stop_loss_pct)}</b>
            </span>
            <span>
              <small>MA20 跌破</small>
              <b>{report.exit_on_ma20_break ? '启用' : '关闭'}</b>
            </span>
            <span>
              <small>量比退出</small>
              <b>{Number(report.exit_volume_ratio.toFixed(2)) || '关闭'}</b>
            </span>
            <span>
              <small>诊断退出</small>
              <b>{report.diagnosis_exit_score > 0 ? report.diagnosis_exit_score : '关闭'}</b>
            </span>
            <span>
              <small>快照覆盖</small>
              <b>{report.diagnosis_exit_score > 0 ? `${(report.diagnosis_exit_snapshot_coverage_pct ?? 0).toFixed(1)}%` : '关闭'}</b>
            </span>
            <span>
              <small>诊断口径</small>
              <b>{report.diagnosis_exit_score > 0 ? `快照 ${report.diagnosis_exit_snapshot_count ?? 0} / 代理 ${report.diagnosis_exit_proxy_count ?? 0}` : '未启用'}</b>
            </span>
          </div>
          <div className="backtest-parameter-card">
            <strong>参数</strong>
            <label>
              <span>手续费 bps</span>
              <input
                aria-label="回测手续费 bps"
                type="number"
                min="0"
                max="100"
                step="1"
                value={feeBps}
                onChange={(event) => onFeeBpsChange(clampNumber(event.target.value, 0, 100, 5))}
              />
            </label>
            <label>
              <span>滑点 bps</span>
              <input
                aria-label="回测滑点 bps"
                type="number"
                min="0"
                max="100"
                step="1"
                value={slippageBps}
                onChange={(event) => onSlippageBpsChange(clampNumber(event.target.value, 0, 100, 10))}
              />
            </label>
            <label>
              <span>样本数量</span>
              <input
                aria-label="回测样本数量"
                type="number"
                min="1"
                max="30"
                step="1"
                value={limit}
                onChange={(event) => onLimitChange(clampNumber(event.target.value, 1, 30, 8))}
              />
            </label>
            <label>
              <span>止盈 %</span>
              <input
                aria-label="回测止盈 %"
                type="number"
                min="0"
                max="100"
                step="1"
                value={takeProfitPct}
                onChange={(event) => onTakeProfitPctChange(clampNumber(event.target.value, 0, 100, 0))}
              />
            </label>
            <label>
              <span>止损 %</span>
              <input
                aria-label="回测止损 %"
                type="number"
                min="0"
                max="100"
                step="1"
                value={stopLossPct}
                onChange={(event) => onStopLossPctChange(clampNumber(event.target.value, 0, 100, 0))}
              />
            </label>
            <label className="checkbox-setting">
              <span>跌破 MA20 退出</span>
              <input
                aria-label="回测跌破 MA20 退出"
                type="checkbox"
                checked={exitOnMa20Break}
                onChange={(event) => onExitOnMa20BreakChange(event.target.checked)}
              />
            </label>
            <label>
              <span>量比退出阈值</span>
              <input
                aria-label="回测量比退出阈值"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={exitVolumeRatio}
                onChange={(event) => onExitVolumeRatioChange(clampNumber(event.target.value, 0, 5, 0))}
              />
            </label>
            <label>
              <span>诊断退出分</span>
              <input
                aria-label="回测诊断退出分"
                type="number"
                min="0"
                max="100"
                step="1"
                value={diagnosisExitScore}
                onChange={(event) => onDiagnosisExitScoreChange(clampNumber(event.target.value, 0, 100, 0))}
              />
            </label>
          </div>
          <div className="portfolio-metrics backtest-metrics">
            <SummaryMetric label="样例交易" value={report.trade_count} />
            <SummaryMetric label="胜率" value={`${report.win_rate.toFixed(1)}%`} />
            <SummaryMetric label="平均收益" value={formatSignedPercent(report.average_return_pct)} />
            <SummaryMetric label="最大回撤" value={formatSignedPercent(report.max_drawdown_pct)} />
            <SummaryMetric label="收益回撤比" value={formatRatio(report.return_drawdown_ratio)} />
          </div>
          <div className="backtest-cost-card">
            <strong>收益分布</strong>
            <span>
              <small>胜 / 负 / 平</small>
              <b>胜 {report.positive_trade_count ?? 0} / 负 {report.negative_trade_count ?? 0} / 平 {report.flat_trade_count ?? 0}</b>
            </span>
            <span>
              <small>中位</small>
              <b>{formatSignedPercent(report.return_median_pct ?? 0)}</b>
            </span>
            <span>
              <small>P25 / P75</small>
              <b>P25 {formatSignedPercent(report.return_p25_pct ?? 0)} · P75 {formatSignedPercent(report.return_p75_pct ?? 0)}</b>
            </span>
          </div>
          <div className="backtest-cost-card">
            <strong>退出分布</strong>
            {backtestExitReasonEntries(report).map(([reason, count]) => (
              <span key={reason}>
                <small>{backtestExitReasonLabel(reason)}</small>
                <b>{count} 笔</b>
              </span>
            ))}
          </div>
          {equityCurve.length > 1 ? (
            <div className="backtest-cost-card">
              <strong>权益曲线</strong>
              <span>
                <small>累计收益</small>
                <b className={(latestEquityPoint?.equity_pct ?? 0) >= 0 ? 'up' : 'down'}>{formatSignedPercent(latestEquityPoint?.equity_pct ?? 0)}</b>
              </span>
              <span>
                <small>路径最大回撤</small>
                <b className="down">{formatSignedPercent(maxPathDrawdown)}</b>
              </span>
              {equityCurve.slice(1, 6).map((point) => (
                <span key={`${point.step}-${point.symbol ?? point.label}`}>
                  <small>{point.label}</small>
                  <b>
                    累计 {formatSignedPercent(point.equity_pct)} · 单笔 {formatSignedPercent(point.trade_return_pct)} · 回撤 {formatSignedPercent(point.drawdown_pct)}
                  </b>
                </span>
              ))}
            </div>
          ) : null}
          <div className="backtest-cost-card">
            <strong>稳定性</strong>
            <span>
              <small>稳定评分</small>
              <b>{report.stability_score ?? 0}</b>
            </span>
            <span>
              <small>稳定等级</small>
              <b>{report.stability_label ?? '暂无评估'}</b>
            </span>
            <span>
              <small>收益波动</small>
              <b>{formatPlainPercent(report.return_volatility_pct ?? 0)}</b>
            </span>
            <span>
              <small>最长连续亏损</small>
              <b>{report.max_consecutive_loss_count ?? 0} 笔</b>
            </span>
            <span>
              <small>最佳连续收益</small>
              <b className={(report.best_path_gain_pct ?? 0) >= 0 ? 'up' : 'down'}>{formatSignedPercent(report.best_path_gain_pct ?? 0)}</b>
            </span>
            <span>
              <small>最差连续亏损</small>
              <b className="down">{formatSignedPercent(report.worst_path_loss_pct ?? 0)}</b>
            </span>
            {stabilityNotes.length ? (
              <span className="backtest-wide-note">
                <small>稳定性说明</small>
                <b>{stabilityNotes.slice(0, 2).join(' · ')}</b>
              </span>
            ) : null}
          </div>
          {historyError ? (
            <div className="panel-state error-state compact-state">
              <strong>回测历史加载失败</strong>
              <span>{historyError}</span>
            </div>
          ) : history ? (
            <div className="backtest-history-card">
              <div className="backtest-comparison-head">
                <strong>历史对比</strong>
                <span>{history.summary}</span>
              </div>
              <div className="backtest-history-metrics">
                <span>
                  <small>平均收益变化</small>
                  <b className={history.average_return_delta >= 0 ? 'up' : 'down'}>{formatSignedPercent(history.average_return_delta)}</b>
                </span>
                <span>
                  <small>最大回撤变化</small>
                  <b className={history.max_drawdown_delta >= 0 ? 'up' : 'down'}>{formatSignedPercent(history.max_drawdown_delta)}</b>
                </span>
                <span>
                  <small>稳定评分变化</small>
                  <b className={history.stability_score_delta >= 0 ? 'up' : 'down'}>
                    {history.stability_score_delta >= 0 ? '+' : ''}{history.stability_score_delta} 分
                  </b>
                </span>
                <span>
                  <small>可信度变化</small>
                  <b className={history.sample_confidence_delta >= 0 ? 'up' : 'down'}>
                    {history.sample_confidence_delta >= 0 ? '+' : ''}{history.sample_confidence_delta} 分
                  </b>
                </span>
                <span>
                  <small>诊断转弱变化</small>
                  <b className={(history.score_weak_exit_delta ?? 0) <= 0 ? 'up' : 'down'}>
                    {(history.score_weak_exit_delta ?? 0) >= 0 ? '+' : ''}{history.score_weak_exit_delta ?? 0} 笔
                  </b>
                </span>
              </div>
              <strong className="backtest-history-title">最近回测</strong>
              <div className="backtest-history-list">
                {history.items.slice(0, 4).map((item) => (
                  <span key={item.id}>
                    <small>{formatShortDate(item.created_at)} · {item.holding_days} 日 · {backtestPriceSourceLabel(item.price_source)}</small>
                    <b>
                      平均 {formatSignedPercent(item.average_return_pct)} · 回撤 {formatSignedPercent(item.max_drawdown_pct)} · 稳定 {item.stability_score} · 可信 {item.sample_confidence_score} · {backtestHistoryExitLabel(item)} · {backtestHistoryParameterLabel(item)}
                    </b>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <BacktestActionPlan
            plan={actions}
            error={actionsError}
            updatingActionId={updatingActionId}
            onStatusChange={onActionStatus}
          />
          <BacktestPeriodComparison comparison={comparison} error={comparisonError} />
          <BacktestPresetComparison comparison={presetComparison} error={presetComparisonError} currentPreset={currentPreset} />
          <p className="backtest-summary">{report.summary}</p>
          <div className="backtest-trade-list">
            {report.trades.slice(0, 4).map((trade) => (
              <article key={`${trade.symbol}-${trade.entry_date}`} className="backtest-trade">
                <div>
                  <strong>{trade.name}</strong>
                  <span>{trade.symbol} · {trade.industry} · {trade.holding_days} 日 · {backtestExitReasonLabel(trade.exit_reason)}</span>
                </div>
                <em className={trade.return_pct >= 0 ? 'up' : 'down'}>净收益 {formatSignedPercent(trade.return_pct)}</em>
                <small>{trade.entry_price.toFixed(2)} → {trade.exit_price.toFixed(2)} · 回撤 {formatSignedPercent(trade.max_drawdown_pct)}</small>
                <small>毛收益 {formatSignedPercent(trade.gross_return_pct)} · 成本 {formatPlainPercent(trade.cost_pct)} · {backtestPriceSourceLabel(trade.price_source)}</small>
                {trade.diagnosis_exit_note ? (
                  <small>诊断分说明：{trade.diagnosis_exit_note}</small>
                ) : null}
                {trade.rule_tags.length ? (
                  <div className="screener-tags">
                    {trade.rule_tags.map((tag) => (
                      <small key={tag}>{tag}</small>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <div className="backtest-notes">
            {report.rule_notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function backtestPriceSourceLabel(source: StrategyBacktestReport['price_source']) {
  return source === 'historical-kline' ? '历史K线' : '样例趋势'
}

function backtestExitReasonLabel(reason: StrategyBacktestReport['trades'][number]['exit_reason']) {
  if (reason === 'take-profit') return '止盈退出'
  if (reason === 'stop-loss') return '止损退出'
  if (reason === 'ma20-break') return '跌破 MA20'
  if (reason === 'volume-fade') return '缩量退出'
  if (reason === 'score-weak') return '诊断转弱'
  return '持有到期'
}

function backtestExitReasonEntries(report: StrategyBacktestReport) {
  const reasons: StrategyBacktestReport['trades'][number]['exit_reason'][] = ['holding-period', 'take-profit', 'stop-loss', 'ma20-break', 'volume-fade', 'score-weak']
  const counts: Partial<Record<StrategyBacktestReport['trades'][number]['exit_reason'], number>> =
    report.exit_reason_counts ?? {}
  return reasons
    .map((reason) => [reason, counts[reason] ?? 0] as const)
    .filter(([, count]) => count > 0)
}

function backtestHistoryParameterLabel(item: StrategyBacktestHistoryComparison['items'][number]) {
  const exits: string[] = []
  if (item.take_profit_pct > 0) exits.push(`止盈 ${item.take_profit_pct}%`)
  if (item.stop_loss_pct > 0) exits.push(`止损 ${item.stop_loss_pct}%`)
  if (item.exit_on_ma20_break) exits.push('MA20')
  if (item.exit_volume_ratio > 0) exits.push(`量比 ${Number(item.exit_volume_ratio.toFixed(2))}`)
  if (item.diagnosis_exit_score > 0) exits.push(`诊断 ${Number(item.diagnosis_exit_score.toFixed(0))}`)
  return exits.length ? exits.join(' / ') : '固定持有'
}

function backtestHistoryExitLabel(item: StrategyBacktestHistoryComparison['items'][number]) {
  const count = item.score_weak_exit_count ?? item.exit_reason_counts?.['score-weak'] ?? 0
  if (count <= 0) return '无诊断转弱'
  const score = item.lowest_diagnosis_exit_score
  return typeof score === 'number' && Number.isFinite(score)
    ? `诊断转弱 ${count} 笔 / 最低 ${score}`
    : `诊断转弱 ${count} 笔`
}

function formatBacktestHistoryCount(value: number) {
  return value > 0 ? `${value} 根` : '-'
}

function formatBps(value: number) {
  return `${Number(value.toFixed(2))} bps`
}

function formatPlainPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function BacktestActionPlan({
  plan,
  error,
  updatingActionId,
  onStatusChange,
}: {
  plan: StrategyBacktestActionPlan | null
  error: string | null
  updatingActionId: string | null
  onStatusChange: (actionId: string, status: StrategyBacktestActionPlan['actions'][number]['status']) => void
}) {
  const actions = Array.isArray(plan?.actions) ? plan.actions : []
  const [statusFilter, setStatusFilter] = useState<StrategyBacktestActionPlan['actions'][number]['status'] | 'all'>('all')
  const filteredActions = actions.filter((action) => statusFilter === 'all' || action.status === statusFilter)
  if (error) {
    return (
      <div className="panel-state error-state compact-state">
        <strong>回测动作加载失败</strong>
        <span>{error}</span>
      </div>
    )
  }
  if (!plan) {
    return <p className="empty-text">正在生成回测复盘动作...</p>
  }
  if (actions.length === 0) {
    return (
      <div className="backtest-action-card">
        <div className="backtest-comparison-head">
          <strong>回测复盘动作</strong>
          <span>当前回测未触发额外复核动作。</span>
        </div>
      </div>
    )
  }
  return (
    <div className="backtest-action-card">
      <div className="backtest-comparison-head">
        <strong>回测复盘动作</strong>
        <span>
          高 {plan.high_count} · 中 {plan.medium_count} · 低 {plan.low_count} · 已完成 {plan.done_count ?? 0}
        </span>
      </div>
      <div className="mini-segments backtest-status-filter" aria-label="回测动作状态筛选">
        {([
          ['all', '全部'],
          ['pending', '待处理'],
          ['watching', '观察中'],
          ['done', '已完成'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={statusFilter === value ? 'selected' : ''}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="backtest-action-list">
        {filteredActions.length === 0 ? (
          <p className="empty-text">当前筛选下没有回测复盘动作</p>
        ) : filteredActions.slice(0, 5).map((action) => {
          const updating = action.id === updatingActionId
          return (
            <article key={action.id} className={`backtest-action ${action.priority} ${action.status}`}>
              <div>
                <span>{action.category}</span>
                <em>{updating ? '更新中' : `${priorityLabel(action.priority)} · ${backtestActionStatusLabel(action.status)}`}</em>
              </div>
              <strong>{action.title}</strong>
              <p>{action.detail}</p>
              <small>{action.trigger}</small>
              <b>{action.metric}</b>
              <div className="backtest-action-controls">
                {(['pending', 'watching', 'done'] as StrategyBacktestActionPlan['actions'][number]['status'][]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={action.status === status ? 'selected' : ''}
                    disabled={updating}
                    onClick={() => onStatusChange(action.id, status)}
                  >
                    {backtestActionStatusLabel(status)}
                  </button>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function backtestActionStatusLabel(status: StrategyBacktestActionPlan['actions'][number]['status']) {
  if (status === 'done') return '已完成'
  if (status === 'watching') return '观察中'
  return '待处理'
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function BacktestPeriodComparison({
  comparison,
  error,
}: {
  comparison: StrategyBacktestComparison | null
  error: string | null
}) {
  if (error) {
    return (
      <div className="backtest-comparison-state">
        <strong>周期对比暂不可用</strong>
        <span>{error}</span>
      </div>
    )
  }
  if (!comparison) return null
  return (
    <div className="backtest-comparison">
      <div className="backtest-comparison-head">
        <strong>周期对比</strong>
        <span>{comparison.summary}</span>
        {comparison.recommendation_reason ? (
          <small className="backtest-recommendation-reason">
            <b>推荐依据</b>
            ：
            {comparison.recommendation_reason}
          </small>
        ) : null}
      </div>
      <div className="backtest-period-grid">
        {comparison.periods.map((period) => (
          <article
            key={period.holding_days}
            className={period.holding_days === comparison.recommended_holding_days ? 'recommended' : ''}
          >
            <div>
              <strong>{period.holding_days} 日</strong>
              {period.holding_days === comparison.recommended_holding_days ? <em>推荐</em> : null}
            </div>
            <span>
              <small>胜率</small>
              <b>{period.win_rate.toFixed(1)}%</b>
            </span>
            <span>
              <small>平均收益</small>
              <b className={period.average_return_pct >= 0 ? 'up' : 'down'}>{formatSignedPercent(period.average_return_pct)}</b>
            </span>
            <span>
              <small>最大回撤</small>
              <b className="down">{formatSignedPercent(period.max_drawdown_pct)}</b>
            </span>
            <span>
              <small>收益回撤比</small>
              <b>{formatRatio(period.return_drawdown_ratio)}</b>
            </span>
            <small className="backtest-period-source">
              {backtestPriceSourceLabel(period.price_source)} · {formatBacktestHistoryCount(period.history_bar_count)}
            </small>
          </article>
        ))}
      </div>
    </div>
  )
}

function BacktestPresetComparison({
  comparison,
  error,
  currentPreset,
}: {
  comparison: StrategyBacktestPresetComparison | null
  error: string | null
  currentPreset: string
}) {
  if (error) {
    return (
      <div className="backtest-comparison-state">
        <strong>策略对比暂不可用</strong>
        <span>{error}</span>
      </div>
    )
  }
  if (!comparison || !Array.isArray(comparison.presets)) return null
  return (
    <div className="backtest-comparison backtest-preset-comparison">
      <div className="backtest-comparison-head">
        <strong>策略对比</strong>
        <span>{comparison.summary}</span>
        {comparison.recommendation_reason ? (
          <small className="backtest-recommendation-reason">
            <b>推荐依据</b>
            ：
            {comparison.recommendation_reason}
          </small>
        ) : null}
      </div>
      <div className="backtest-preset-grid">
        {comparison.presets.map((preset) => (
          <article
            key={preset.preset}
            className={[
              preset.preset === comparison.recommended_preset ? 'recommended' : '',
              preset.preset === currentPreset ? 'current' : '',
            ].filter(Boolean).join(' ')}
          >
            <div>
              <strong>{preset.label}</strong>
              <span>
                {preset.preset === comparison.recommended_preset ? <em>策略推荐</em> : null}
                {preset.preset === currentPreset ? <small>当前</small> : null}
              </span>
            </div>
            <span>
              <small>命中 / 交易</small>
              <b>{preset.match_count} / {preset.trade_count}</b>
            </span>
            <span>
              <small>胜率</small>
              <b>{preset.win_rate.toFixed(1)}%</b>
            </span>
            <span>
              <small>平均收益</small>
              <b className={preset.average_return_pct >= 0 ? 'up' : 'down'}>{formatSignedPercent(preset.average_return_pct)}</b>
            </span>
            <span>
              <small>最大回撤</small>
              <b className="down">{formatSignedPercent(preset.max_drawdown_pct)}</b>
            </span>
            <span>
              <small>收益回撤比</small>
              <b>{formatRatio(preset.return_drawdown_ratio)}</b>
            </span>
            <small className="backtest-period-source">
              {backtestPriceSourceLabel(preset.price_source)} · {formatBacktestHistoryCount(preset.history_bar_count)}
            </small>
          </article>
        ))}
      </div>
    </div>
  )
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatRatio(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}
