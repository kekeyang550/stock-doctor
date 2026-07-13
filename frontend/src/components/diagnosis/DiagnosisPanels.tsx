import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
import { humanizeConnectorMessage } from '../../lib/sourceLabels'
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
} from '../../lib/types'
import { ScoreGauge } from '../ScoreGauge'
import { formatDelta, formatReportTime } from '../../lib/formatters'

export function DiagnosisWorkspace({
  diagnosis,
  overview,
  dataSources,
  trend,
  peers,
  dataQuality,
  thesis,
  diagnosisChange,
  reviewActions,
  updatingReviewActionId,
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
  updatingReviewActionId: string | null
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

      <ReviewActionsPanel
        plan={reviewActions}
        updatingActionId={updatingReviewActionId}
        onStatusChange={onReviewActionStatus}
      />

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
              <span>{humanizeConnectorMessage(source.role)}</span>
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
  updatingActionId,
  onStatusChange,
}: {
  plan: ReviewActionPlan | null
  updatingActionId: string | null
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
              <ReviewActionRow
                key={item.id}
                item={item}
                updatingActionId={updatingActionId}
                onStatusChange={onStatusChange}
              />
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
  updatingActionId,
  onStatusChange,
}: {
  item: ReviewActionItem
  updatingActionId: string | null
  onStatusChange: (actionId: string, status: ReviewActionItem['status']) => void
}) {
  const updating = item.id === updatingActionId
  return (
    <article className={`review-action ${item.priority} ${item.status}`}>
      <div>
        <span>{item.category}</span>
        <em>{updating ? '更新中' : reviewStatusLabel(item.status)}</em>
      </div>
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
      <div className="review-action-controls">
        {(['pending', 'watching', 'done'] as ReviewActionItem['status'][]).map((status) => (
          <button
            key={status}
            type="button"
            className={item.status === status ? 'selected' : ''}
            disabled={updating}
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
          {report ? qualityReportStatusLabel(report) : '加载中'}
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
              <DataQualityCheckRow key={check.key} check={check} report={report} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-text">正在检查诊断数据质量...</p>
      )}
    </section>
  )
}



function DataQualityCheckRow({ check, report }: { check: DataQualityCheck; report: DataQualityReport }) {
  return (
    <article className={`quality-check ${check.status}`}>
      <div>
        <strong>{check.label}</strong>
        <em>{qualityCheckStatusLabel(check, report)}</em>
      </div>
      <p>{check.detail}</p>
      <small>{check.impact}</small>
    </article>
  )
}



function qualityStatusLabel(status: DataQualityReport['status']) {
  if (status === 'pass') return '可靠'
  if (status === 'warn') return '需核验'
  return '异常'
}

function qualityReportStatusLabel(report: DataQualityReport) {
  if (report.status !== 'warn') return qualityStatusLabel(report.status)
  if (report.checks.some((check) => check.key === 'runtime_environment' && check.status === 'warn')) {
    return '运行需刷新'
  }
  if (report.checks.some((check) => check.key === 'source_coverage' && check.status === 'warn')) {
    return '部分兜底'
  }
  return qualityStatusLabel(report.status)
}

function qualityCheckStatusLabel(check: DataQualityCheck, report: DataQualityReport) {
  if (check.status !== 'warn') return qualityStatusLabel(check.status)
  if (check.key === 'runtime_environment') return '需刷新'
  if (check.key === 'source_coverage') return '部分兜底'
  return qualityReportStatusLabel(report)
}



function DiagnosisChangePanel({ report }: { report: DiagnosisChangeReport | null }) {
  const scoreTrend = Array.isArray(report?.score_trend) ? report.score_trend : []
  const keyDrivers = Array.isArray(report?.key_drivers) ? report.key_drivers : []
  const changes = Array.isArray(report?.changes) ? report.changes : []
  const ratingTransition = report?.rating_transition
  const riskShift = report?.risk_shift
  const trendInsight = report?.trend_insight

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
          <div className="change-trend-block">
            <div className="mini-section-title">趋势对比</div>
            {scoreTrend.length ? (
              <div className="change-trend-strip">
                {scoreTrend.map((point) => (
                <article key={`${point.label}-${point.generated_at}`}>
                  <strong>{point.label} · {point.rating}</strong>
                  <span>综合 {point.total} / 风险 {point.risk}</span>
                  <small>{formatReportTime(point.generated_at)}</small>
                </article>
                ))}
              </div>
            ) : (
              <p className="empty-text">暂无趋势对比数据</p>
            )}
          </div>
          {trendInsight ? (
            <div className="trend-insight-card">
              <div className="mini-section-title">趋势洞察</div>
              <p>{trendInsight.summary}</p>
              <div className="trend-insight-grid">
                <span>
                  <small>综合趋势</small>
                  <strong>{scoreDirectionLabel(trendInsight.score_direction)}</strong>
                </span>
                <span>
                  <small>风险趋势</small>
                  <strong>{riskDirectionLabel(trendInsight.risk_direction)}</strong>
                </span>
                <span>
                  <small>评级变化</small>
                  <strong>评级变化 {trendInsight.rating_change_count} 次</strong>
                </span>
                <span>
                  <small>区间</small>
                  <strong>综合 {trendInsight.total_low}-{trendInsight.total_high} / 风险 {trendInsight.risk_low}-{trendInsight.risk_high}</strong>
                </span>
              </div>
            </div>
          ) : null}
          {ratingTransition || riskShift ? (
            <div className="change-insight-grid">
              {ratingTransition ? (
                <article className="rating-transition">
                  <small>评级轨迹</small>
                  <strong>
                    {ratingTransition.previous ? `${ratingTransition.previous} -> ${ratingTransition.current}` : ratingTransition.current}
                  </strong>
                  <span>{ratingTransition.detail}</span>
                </article>
              ) : null}
              {riskShift ? (
                <article className={`risk-shift ${riskShift.direction}`}>
                  <small>风险变化</small>
                  <strong>{riskShift.label}</strong>
                  <span>{riskShift.detail}</span>
                </article>
              ) : null}
            </div>
          ) : null}
          <div className="change-driver-list">
            <div className="mini-section-title">关键驱动</div>
            {keyDrivers.length ? (
              keyDrivers.map((driver) => (
                <article key={driver.metric} className={`change-driver ${driver.direction}`}>
                  <strong>{driver.label}</strong>
                  <em>{formatDelta(driver.delta)}</em>
                  <span>{driver.detail}</span>
                </article>
              ))
            ) : (
              <p className="empty-text">暂无关键驱动数据</p>
            )}
          </div>
          <div className="change-list">
            {changes.length ? (
              changes.map((item) => (
                <ChangeItemRow key={item.key} item={item} />
              ))
            ) : (
              <p className="empty-text">暂无诊断变化明细</p>
            )}
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



function scoreDirectionLabel(direction: NonNullable<DiagnosisChangeReport['trend_insight']>['score_direction']) {
  if (direction === 'up') return '持续走强'
  if (direction === 'down') return '持续转弱'
  if (direction === 'flat') return '保持平稳'
  if (direction === 'mixed') return '波动反复'
  return '基线'
}



function riskDirectionLabel(direction: NonNullable<DiagnosisChangeReport['trend_insight']>['risk_direction']) {
  if (direction === 'improved') return '持续改善'
  if (direction === 'worsened') return '持续走弱'
  if (direction === 'flat') return '保持平稳'
  if (direction === 'mixed') return '波动反复'
  return '基线'
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
