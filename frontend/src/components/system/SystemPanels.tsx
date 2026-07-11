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
import { formatReportTime } from '../../lib/formatters'

export function SystemStoragePanel({
  status,
  importFileName,
  importPreview,
  onExport,
  onPreviewImport,
  onApplyImport,
  exporting,
  previewingImport,
  applyingImport,
  error,
}: {
  status: StorageStatus | null
  importFileName: string
  importPreview: StorageImportPreview | null
  onExport: () => void
  onPreviewImport: (file: File) => void
  onApplyImport: () => void
  exporting: boolean
  previewingImport: boolean
  applyingImport: boolean
  error: string | null
}) {
  const importInputDisabled = !status || previewingImport || applyingImport
  return (
    <section className="panel storage-panel">
      <div className="panel-title split-title">
        <span>
          <Database size={18} />
          <h3>系统存储</h3>
        </span>
        <div className="title-actions">
          <small>{status ? status.status : '加载中'}</small>
          <button type="button" onClick={onExport} disabled={!status || exporting}>
            <Download size={15} />
            <span>{exporting ? '导出中' : '导出'}</span>
          </button>
          <label className={`file-action${importInputDisabled ? ' disabled' : ''}`}>
            <Upload size={15} />
            <span>{previewingImport ? '预检中' : '预检'}</span>
            <input
              type="file"
              accept="application/json,.json"
              disabled={importInputDisabled}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onPreviewImport(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
      {error ? (
        <div className="panel-state error-state">
          <strong>系统存储操作失败</strong>
          <span>{error}</span>
          <small>当前本地数据和导入状态已保留，请检查备份文件后重试。</small>
        </div>
      ) : null}
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
                <button type="button" onClick={onApplyImport} disabled={!importPreview.can_import || applyingImport}>
                  <Upload size={15} />
                  <span>{applyingImport ? '导入中' : '导入'}</span>
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



export function SystemReadinessPanel({ readiness }: { readiness: SystemReadiness | null }) {
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



export function DataConnectorPanel({
  health,
  freshness,
  jobs,
  refreshingScope,
  refreshError,
  onRun,
}: {
  health: DataConnectorHealth | null
  freshness: DataFreshnessStatus | null
  jobs: DataRefreshJob[]
  refreshingScope: 'all' | 'watchlist' | null
  refreshError: string | null
  onRun: (scope: 'all' | 'watchlist') => void
}) {
  const refreshing = refreshingScope !== null
  const activeConnector = health?.connectors.find((connector) => connector.active) ?? null
  const latestJob = jobs[0] ?? null
  const usingFallback = health ? health.active_provider === health.fallback_provider : false
  return (
    <section className="panel connector-panel">
      <div className="panel-title split-title">
        <span>
          <Database size={18} />
          <h3>数据可信度</h3>
        </span>
        <small>{health ? `当前 ${health.active_provider}` : '加载中'}</small>
      </div>
      {health ? (
        <>
          <div className="connector-summary">
            <span>回退源</span>
            <strong>{health.fallback_provider}</strong>
            <button type="button" onClick={() => onRun('all')} disabled={refreshing}>
              <RefreshCw size={15} />
              <span>{refreshingScope === 'all' ? '刷新中' : '刷新全部'}</span>
            </button>
            <button type="button" onClick={() => onRun('watchlist')} disabled={refreshing}>
              <RefreshCw size={15} />
              <span>{refreshingScope === 'watchlist' ? '刷新中' : '刷新自选'}</span>
            </button>
          </div>
          <div className="data-trust-summary">
            <TrustCard label="行情来源" value={health.active_provider} detail={activeConnector?.message ?? '当前数据源状态未知'} status={activeConnector?.status ?? 'unknown'} />
            <TrustCard
              label="Fallback 状态"
              value={usingFallback ? '正在使用回退源' : '主源直连'}
              detail={usingFallback ? `回退源 ${health.fallback_provider} 正在承载行情。` : `备用源 ${health.fallback_provider} 可用于兜底。`}
              status={usingFallback ? 'fallback' : 'online'}
            />
            <TrustCard
              label="缓存状态"
              value={freshness ? cacheStatusLabel(freshness) : '计算中'}
              detail={freshness ? freshness.message : '正在读取最近一次成功刷新。'}
              status={freshness ? cacheStatusClass(freshness) : 'unknown'}
            />
            <TrustCard
              label="最近成功"
              value={freshness?.last_success_at ? formatReportTime(freshness.last_success_at) : '暂无成功刷新'}
              detail={freshness?.age_minutes === null || !freshness ? `过期阈值 ${freshness?.stale_after_minutes ?? '--'} 分钟。` : `距今 ${freshness.age_minutes} 分钟，覆盖 ${freshness.last_stock_count}/${freshness.expected_stock_count}。`}
              status={freshness ? cacheStatusClass(freshness) : 'unknown'}
            />
            <TrustCard
              label={latestJob ? (latestJob.status === 'success' ? '最近刷新成功' : '最近刷新失败') : '暂无刷新记录'}
              value={latestJob ? `${latestJob.provider} · ${latestJob.duration_ms} ms` : '尚未运行'}
              detail={latestJob?.message ?? '运行刷新任务后会在这里显示最近结果。'}
              status={latestJob?.status ?? 'unknown'}
            />
          </div>
          {refreshError ? (
            <div className="data-refresh-error" role="status">
              <strong>刷新失败</strong>
              <span>{refreshError}</span>
              <small>已保留当前缓存数据，请检查行情源或稍后重试。</small>
            </div>
          ) : null}
          <div className="connector-list">
            {health.connectors.map((connector) => (
              <ConnectorRow key={connector.name} connector={connector} />
            ))}
          </div>
          <FreshnessPanel freshness={freshness} />
          <RefreshJobList jobs={jobs} />
        </>
      ) : (
        <p className="empty-text">正在检查数据可信度...</p>
      )}
    </section>
  )
}



function TrustCard({
  label,
  value,
  detail,
  status,
}: {
  label: string
  value: string
  detail: string
  status: string
}) {
  return (
    <article className={`data-trust-card ${status}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}



function cacheStatusLabel(freshness: DataFreshnessStatus) {
  if (freshness.status === 'fresh') return '缓存可用'
  if (freshness.status === 'stale') return '缓存偏旧'
  if (freshness.status === 'expired') return '缓存过期'
  return '未建立缓存'
}



function cacheStatusClass(freshness: DataFreshnessStatus) {
  if (freshness.status === 'fresh') return 'online'
  if (freshness.status === 'stale') return 'fallback'
  if (freshness.status === 'expired') return 'failed'
  return 'unknown'
}



export function FreshnessPanel({ freshness }: { freshness: DataFreshnessStatus | null }) {
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



export function RefreshJobList({ jobs }: { jobs: DataRefreshJob[] }) {
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
