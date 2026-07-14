import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileText, ListChecks, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload, XCircle } from 'lucide-react'
import { connectorTelemetry, humanizeConnectorMessage } from '../../lib/sourceLabels'
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
  PriceAlert,
  ProviderCacheBucketStatus,
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
  TushareProbeResult,
  WatchlistSummary,
} from '../../lib/types'
import { formatReportTime } from '../../lib/formatters'

export function SystemRuntimeConfigPanel({
  settings,
  probe,
  probing,
  probeError,
  onProbe,
}: {
  settings: DataRuntimeSettings | null
  probe: TushareProbeResult | null
  probing: boolean
  probeError: string | null
  onProbe: () => void
}) {
  const providerOptions = settings?.provider_options?.length ? settings.provider_options.join(' / ') : '未返回'
  const paths = settings?.paths ?? []
  const secrets = settings?.secrets ?? []

  return (
    <section className="panel runtime-config-panel">
      <div className="panel-title split-title">
        <span>
          <Database size={18} />
          <h3>运行配置</h3>
        </span>
        <small>{settings ? `当前 ${settings.active_provider}` : '加载中'}</small>
      </div>
      {settings ? (
        <>
          <div className="runtime-actions">
            <span>只读预检不会切换当前数据源，也不会返回 Token 明文。</span>
            <button type="button" onClick={onProbe} disabled={probing}>
              <RefreshCw size={15} className={probing ? 'spin' : undefined} />
              <span>{probing ? '检测中' : '检测 Tushare'}</span>
            </button>
          </div>
          <div className="runtime-config-grid">
            <RuntimeConfigItem label="数据源" value={settings.active_provider} detail={`可选：${providerOptions}`} />
            <RuntimeConfigItem label="请求超时" value={`${settings.request_timeout_seconds} 秒`} detail="真实行情接口单次等待上限" />
            <RuntimeConfigItem label="缓存 TTL" value={`${settings.cache_ttl_seconds} 秒`} detail="行情缓存有效窗口" />
            <RuntimeConfigItem label="过期阈值" value={`${settings.freshness_stale_after_minutes} 分钟`} detail="超过后提示数据偏旧" />
          </div>
          <div className="runtime-path-list">
            {paths.map((item) => (
              <article key={item.key} className={`runtime-path ${runtimePathStatusClass(item)}`}>
                <div>
                  <strong>{item.label}</strong>
                  <em>{runtimePathStatusLabel(item)}</em>
                </div>
                <p>{item.value || '未配置'}</p>
                {item.resolved_value && item.resolved_value !== item.value ? (
                  <p className="runtime-path-resolved">实际使用：{item.resolved_value}</p>
                ) : null}
                {item.resolution_note ? <small>{item.resolution_note}</small> : null}
                <small>{item.env_var}</small>
              </article>
            ))}
          </div>
          <div className="runtime-path-list">
            {secrets.map((item) => (
              <article key={item.key} className={`runtime-path ${item.configured ? 'online' : 'fallback'}`}>
                <div>
                  <strong>{item.label}</strong>
                  <em>{item.configured ? '已配置' : '未配置'}</em>
                </div>
                <p>{item.configured ? '已通过环境变量配置' : '未配置，相关增强能力暂不可用'}</p>
                <small>{item.env_var}</small>
              </article>
            ))}
          </div>
          <p className="runtime-config-note">
            修改这些配置需要更新后端环境变量并重启服务后生效。
          </p>
          {probeError ? (
            <div className="runtime-probe error">
              <strong>Tushare 预检失败</strong>
              <p>{probeError}</p>
            </div>
          ) : null}
          {probe ? <TushareProbePanel probe={probe} /> : null}
        </>
      ) : (
        <p className="empty-text">正在读取运行配置...</p>
      )}
    </section>
  )
}


function TushareProbePanel({ probe }: { probe: TushareProbeResult }) {
  return (
    <div className={`runtime-probe ${probe.status}`}>
      <div className="runtime-probe-head">
        <span>
          <strong>Tushare 预检</strong>
          <small>{probe.symbol} · {formatReportTime(probe.generated_at)}</small>
        </span>
        <em>{probeStatusLabel(probe.status)}</em>
      </div>
      <p>{probe.message}</p>
      <small>{probe.next_action}</small>
      <small className="runtime-probe-meta">总耗时 {formatProbeDuration(probe.duration_ms)}</small>
      <div className="runtime-probe-steps">
        {probe.steps.map((step) => (
          <article key={step.key} className={step.status}>
            <strong>{step.label}</strong>
            <em>{probeStepStatusLabel(step.status)}</em>
            <small>{step.detail}</small>
            <small>{probeStepMeta(step)}</small>
          </article>
        ))}
      </div>
    </div>
  )
}


function probeStatusLabel(status: TushareProbeResult['status']) {
  if (status === 'pass') return '通过'
  if (status === 'warn') return '需配置'
  return '未通过'
}


function probeStepStatusLabel(status: TushareProbeResult['steps'][number]['status']) {
  if (status === 'pass') return '通过'
  if (status === 'warn') return '提示'
  if (status === 'skip') return '跳过'
  return '失败'
}


function probeStepMeta(step: TushareProbeResult['steps'][number]) {
  const parts = [`耗时 ${formatProbeDuration(step.duration_ms)}`]
  if (typeof step.row_count === 'number') parts.push(`返回 ${step.row_count} 行`)
  return parts.join(' · ')
}


function formatProbeDuration(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return `${Math.max(0, Math.round(value))} ms`
}


function RuntimeConfigItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <span className="runtime-config-item">
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </span>
  )
}


function runtimePathStatusLabel(item: DataRuntimeSettings['paths'][number]) {
  if (item.resolution_note?.includes('过期')) return '已过期'
  if (item.exists === true) return '可用'
  if (item.exists === false) return '未找到'
  return '未配置'
}


function runtimePathStatusClass(item: DataRuntimeSettings['paths'][number]) {
  if (item.resolution_note?.includes('过期')) return 'fallback'
  if (item.exists === true) return 'online'
  if (item.exists === false) return 'fallback'
  return 'unknown'
}


export function SystemStoragePanel({
  status,
  importFileName,
  importPreview,
  onExport,
  onPreviewImport,
  onApplyImport,
  onClearImportPreview,
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
  onClearImportPreview: () => void
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
                <span className="inline-actions">
                  <button type="button" className="secondary-action" onClick={onClearImportPreview} disabled={applyingImport}>
                    <XCircle size={15} />
                    <span>取消</span>
                  </button>
                  <button type="button" onClick={onApplyImport} disabled={!importPreview.can_import || applyingImport}>
                    <Upload size={15} />
                    <span>{applyingImport ? '导入中' : '导入'}</span>
                  </button>
                </span>
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
  const runtimeConfig = health?.runtime_config
  const cacheBuckets = health?.cache_status?.buckets ?? []
  const totalCacheEntries = cacheBuckets.reduce((total, bucket) => total + bucket.entries, 0)
  const activeCacheEntries = cacheBuckets.reduce((total, bucket) => total + bucket.active_entries, 0)
  const sourceTelemetry = connectorTelemetry(activeConnector?.message)
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
            <TrustCard label="行情来源" value={health.active_provider} detail={humanizeConnectorMessage(activeConnector?.message ?? '当前数据源状态未知')} status={activeConnector?.status ?? 'unknown'} />
            {sourceTelemetry.enabled.length ? (
              <TrustCard
                label="已启用来源"
                value={`${sourceTelemetry.enabled.length} 路`}
                detail={sourceTelemetry.enabled.join('、')}
                status="online"
              />
            ) : null}
            {sourceTelemetry.conservative.length ? (
              <TrustCard
                label="保守估算"
                value={`${sourceTelemetry.conservative.length} 项`}
                detail={sourceTelemetry.conservative.join('、')}
                status="fallback"
              />
            ) : null}
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
              label="请求超时"
              value={runtimeConfig ? `${runtimeConfig.request_timeout_seconds} 秒` : '--'}
              detail="真实行情接口调用的单次等待上限。"
              status="unknown"
            />
            <TrustCard
              label="缓存 TTL"
              value={runtimeConfig ? `${runtimeConfig.cache_ttl_seconds} 秒` : '--'}
              detail="行情缓存有效窗口，超过后应重新刷新。"
              status="unknown"
            />
            <TrustCard
              label="缓存命中"
              value={cacheBuckets.length ? `${activeCacheEntries}/${totalCacheEntries} 有效` : '暂无遥测'}
              detail={cacheBuckets.length ? `缓存桶 ${cacheBuckets.length} 个，TTL ${health.cache_status?.ttl_seconds ?? runtimeConfig?.cache_ttl_seconds ?? '--'} 秒。` : '当前 provider 未暴露缓存遥测。'}
              status={cacheSummaryStatus(cacheBuckets)}
            />
            {cacheBuckets.map((bucket) => (
              <TrustCard
                key={bucket.key}
                label={bucket.label}
                value={`${bucket.active_entries}/${bucket.entries} 有效`}
                detail={cacheBucketDetail(bucket)}
                status={cacheBucketStatusClass(bucket.status)}
              />
            ))}
            <TrustCard
              label="过期阈值"
              value={runtimeConfig ? `${runtimeConfig.freshness_stale_after_minutes} 分钟` : freshness ? `${freshness.stale_after_minutes} 分钟` : '--'}
              detail="超过该时间后，数据可信度会提示偏旧。"
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



function cacheSummaryStatus(buckets: ProviderCacheBucketStatus[]) {
  if (buckets.length === 0) return 'unknown'
  if (buckets.some((bucket) => bucket.status === 'active' || bucket.status === 'partial')) return 'online'
  return 'failed'
}



function cacheBucketStatusClass(status: ProviderCacheBucketStatus['status']) {
  if (status === 'active') return 'online'
  if (status === 'partial') return 'fallback'
  if (status === 'expired') return 'failed'
  return 'unknown'
}



function cacheBucketDetail(bucket: ProviderCacheBucketStatus) {
  const hitText = `命中 ${bucket.hit_count ?? 0} / 未命中 ${bucket.miss_count ?? 0} · 命中率 ${(bucket.hit_rate_pct ?? 0).toFixed(1)}%`
  if (bucket.entries === 0) return `暂无缓存条目。${hitText}`
  if (bucket.active_entries === 0) return `全部 ${bucket.entries} 条缓存已过期。${hitText}`
  const expiredText = bucket.expired_entries > 0 ? `，${bucket.expired_entries} 条已过期` : ''
  return `最近 ${bucket.nearest_expires_in_seconds} 秒后过期${expiredText}。${hitText}`
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
      <p>{humanizeConnectorMessage(connector.message)}</p>
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
