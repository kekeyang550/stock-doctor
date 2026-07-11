import { useState } from 'react'
import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
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
import { formatSignedNumber } from '../../lib/formatters'

const hotspotModes = [
  { value: 'balanced', label: '综合' },
  { value: 'capital', label: '资金' },
  { value: 'momentum', label: '异动' },
]

export function HotspotBriefPanel({ brief, onSelect }: { brief: HotspotBrief | null; onSelect: (symbol: string) => void }) {
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



export function HotspotCandidatesPanel({
  candidates,
  mode,
  onModeChange,
  onSelect,
  error,
  onRetry,
}: {
  candidates: HotspotCandidate[]
  mode: string
  onModeChange: (mode: string) => void
  onSelect: (symbol: string) => void
  error: string | null
  onRetry: () => void
}) {
  return (
    <section className="panel hotspot-candidates-panel">
      <div className="panel-title split-title">
        <span>
          <ListChecks size={18} />
          <h3>热点选股池</h3>
        </span>
        <div className="mini-segments" aria-label="热点选股模式">
          {hotspotModes.map((option) => (
            <button
              type="button"
              key={option.value}
              className={mode === option.value ? 'selected' : ''}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="panel-state error-state">
          <strong>热点选股池加载失败</strong>
          <span>{error}</span>
          <small>请检查热点候选接口或稍后重试，本次没有更新候选结果。</small>
          <button type="button" onClick={onRetry}>重试热点池</button>
        </div>
      ) : candidates.length === 0 ? (
        <div className="panel-state empty-state">
          <strong>当前热点模式没有候选股票</strong>
          <span>可以切换均衡/激进模式，或等待热点数据刷新。</span>
        </div>
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
              <p className="next-action">{item.next_action}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}



export function HotspotReviewActionsPanel({
  plan,
  updatingActionId,
  onSelect,
  onStatusChange,
}: {
  plan: HotspotReviewPlan | null
  updatingActionId: string | null
  onSelect: (symbol: string) => void
  onStatusChange: (actionId: string, status: HotspotReviewAction['status']) => void
}) {
  const [statusFilter, setStatusFilter] = useState<HotspotReviewAction['status'] | 'all'>('all')
  const filteredActions = plan
    ? plan.actions.filter((item) => statusFilter === 'all' || item.status === statusFilter)
    : []
  const visibleActions = filteredActions.slice(0, 6)
  return (
    <section className="panel hotspot-review-panel">
      <div className="panel-title split-title">
        <span>
          <CalendarClock size={18} />
          <h3>热点跟踪动作</h3>
        </span>
        <small>{plan ? `${plan.candidate_count} 个候选 · ${plan.actions.length} 项动作` : '加载中'}</small>
      </div>
      {plan ? (
        <>
          <div className="hotspot-review-stats">
            <span className="high">
              <small>高优先</small>
              <strong>{plan.high_count}</strong>
            </span>
            <span className="medium">
              <small>待观察</small>
              <strong>{plan.medium_count}</strong>
            </span>
            <span className="low">
              <small>低优先</small>
              <strong>{plan.low_count}</strong>
            </span>
          </div>
          <div className="review-progress-stats hotspot-progress-stats">
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
          <div className="mini-segments hotspot-status-filter" aria-label="热点动作状态筛选">
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
          <div className="hotspot-review-list">
            {visibleActions.length === 0 ? (
              <p className="empty-text">当前筛选下没有热点动作</p>
            ) : visibleActions.map((item) => {
              const updating = item.id === updatingActionId
              return (
                <article
                  key={item.id}
                  className={`hotspot-review-action ${item.priority}`}
                >
                  <button type="button" className="hotspot-review-main" onClick={() => onSelect(item.symbol)}>
                    <div>
                      <span>{item.concept}</span>
                      <em>{updating ? '更新中' : priorityLabel(item.priority)}</em>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    <small>{item.trigger}</small>
                    <b>{item.check_window}</b>
                  </button>
                  <div className="hotspot-review-controls">
                    {(['pending', 'watching', 'done'] as HotspotReviewAction['status'][]).map((status) => (
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
            })}
          </div>
        </>
      ) : (
        <p className="empty-text">正在生成热点跟踪动作...</p>
      )}
    </section>
  )
}



export function IndustryHeatPanel({ items, onSelect }: { items: IndustryHeatItem[]; onSelect: (symbol: string) => void }) {
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



export function ConceptHeatPanel({ items, onSelect }: { items: ConceptHeatItem[]; onSelect: (symbol: string) => void }) {
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



export function MomentumSignalPanel({ items, onSelect }: { items: MomentumSignalItem[]; onSelect: (symbol: string) => void }) {
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



function hotspotStatusLabel(status: HotspotBrief['status']) {
  const labels: Record<HotspotBrief['status'], string> = {
    hot: '热点强',
    warm: '温和扩散',
    neutral: '分化观察',
    cool: '动能偏弱',
  }
  return labels[status]
}

function priorityLabel(priority: HotspotReviewAction['priority']) {
  if (priority === 'high') return '高优先'
  if (priority === 'medium') return '观察'
  return '低优先'
}

function reviewStatusLabel(status: HotspotReviewAction['status']) {
  if (status === 'done') return '完成'
  if (status === 'watching') return '观察中'
  return '待处理'
}
