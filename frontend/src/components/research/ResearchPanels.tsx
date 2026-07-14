import { AlertTriangle, BarChart3, BellRing, CalendarClock, CheckCircle2, Database, Download, FileCode, FileJson, FileText, ListChecks, Printer, RefreshCw, Save, ShieldAlert, Star, Trash2, Upload } from 'lucide-react'
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

export function PriceAlertsPanel({
  alerts,
  diagnosis,
  draft,
  onDraftChange,
  onSavePreset,
  onSaveCustom,
  onDelete,
  saving,
  deletingAlertId,
  error,
}: {
  alerts: PriceAlert[]
  diagnosis: Diagnosis | null
  draft: string
  onDraftChange: (value: string) => void
  onSavePreset: (targetPrice: number, direction: PriceAlert['direction'], label: string) => void
  onSaveCustom: () => void
  onDelete: (alertId: string) => void
  saving: boolean
  deletingAlertId: string | null
  error: string | null
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
          <button type="button" onClick={() => onSavePreset(levels.risk_line, 'below', '风控线')} disabled={saving}>
            风控 {levels.risk_line.toFixed(2)}
          </button>
          <button type="button" onClick={() => onSavePreset(levels.support, 'below', '支撑位')} disabled={saving}>
            支撑 {levels.support.toFixed(2)}
          </button>
          <button type="button" onClick={() => onSavePreset(levels.pressure, 'above', '压力位')} disabled={saving}>
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
          disabled={saving}
        />
        <button type="button" onClick={onSaveCustom} disabled={!draft.trim() || saving}>
          <Save size={16} />
          <span>{saving ? '保存中' : '保存'}</span>
        </button>
      </div>
      {error ? (
        <div className="panel-state error-state">
          <strong>价位提醒操作失败</strong>
          <span>{error}</span>
          <small>输入内容和已有提醒已保留，请稍后重试。</small>
        </div>
      ) : null}
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
              <button
                type="button"
                className="delete-button"
                onClick={() => onDelete(alert.id)}
                disabled={deletingAlertId === alert.id}
                aria-label={deletingAlertId === alert.id ? '删除中价位提醒' : '删除价位提醒'}
              >
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



export function ResearchNotesPanel({
  notes,
  draft,
  onDraftChange,
  onSave,
  onDelete,
  saving,
  deletingNoteId,
  error,
}: {
  notes: ResearchNote[]
  draft: string
  onDraftChange: (value: string) => void
  onSave: () => void
  onDelete: (noteId: string) => void
  saving: boolean
  deletingNoteId: string | null
  error: string | null
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
          disabled={saving}
        />
        <button type="button" onClick={onSave} disabled={!draft.trim() || saving}>
          <Save size={16} />
          <span>{saving ? '保存中' : '保存'}</span>
        </button>
      </div>
      {error ? (
        <div className="panel-state error-state">
          <strong>研究笔记操作失败</strong>
          <span>{error}</span>
          <small>草稿和已有笔记已保留，请稍后重试。</small>
        </div>
      ) : null}
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
              <button
                type="button"
                className="delete-button"
                onClick={() => onDelete(note.id)}
                disabled={deletingNoteId === note.id}
                aria-label={deletingNoteId === note.id ? '删除中研究笔记' : '删除研究笔记'}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}



export function ReportHistory({
  reports,
  onSelect,
  onExport,
  onPrint,
  onDelete,
  deletingReportId,
}: {
  reports: ReportRecord[]
  onSelect: (report: ReportRecord) => void
  onExport: (report: ReportRecord, format: 'json' | 'html' | 'markdown') => void
  onPrint: (report: ReportRecord) => void
  onDelete: (reportId: string) => void
  deletingReportId: string | null
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
          {reports.map((report) => {
            const deleting = deletingReportId === report.id
            return (
              <article key={report.id} className="history-row">
                <button type="button" onClick={() => onSelect(report)}>
                  <strong>{report.diagnosis.name}</strong>
                  <span>{report.diagnosis.symbol} · 周期 {horizonLabel(report.diagnosis.horizon)} · {report.diagnosis.rating} · {report.diagnosis.score.total} 分</span>
                  {report.data_quality ? (
                    <span>数据质量 {report.data_quality.score} 分 · {qualityStatusLabel(report.data_quality.status)}</span>
                  ) : null}
                  <small>{formatReportTime(report.generated_at)}</small>
                </button>
                <button type="button" className="archive-button" onClick={() => onExport(report, 'json')} aria-label={`导出 ${report.diagnosis.name} 归档 JSON`} title="导出 JSON">
                  <FileJson size={16} />
                </button>
                <button type="button" className="archive-button" onClick={() => onExport(report, 'html')} aria-label={`导出 ${report.diagnosis.name} 归档 HTML`} title="导出 HTML">
                  <FileCode size={16} />
                </button>
                <button type="button" className="archive-button" onClick={() => onExport(report, 'markdown')} aria-label={`导出 ${report.diagnosis.name} 归档 Markdown`} title="导出 Markdown">
                  <Download size={16} />
                </button>
                <button type="button" className="archive-button" onClick={() => onPrint(report)} aria-label={`打印 ${report.diagnosis.name} 归档 PDF`} title="打印/PDF">
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => onDelete(report.id)}
                  disabled={deleting}
                  aria-label={deleting ? `删除中 ${report.diagnosis.name} 报告` : `删除 ${report.diagnosis.name} 报告`}
                  title={deleting ? '删除中' : '删除报告'}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function qualityStatusLabel(status: DataQualityReport['status']) {
  if (status === 'pass') return '可用'
  if (status === 'warn') return '需核验'
  if (status === 'fail') return '异常'
  return '未知'
}

function horizonLabel(horizon: ReportRecord['diagnosis']['horizon']) {
  if (horizon === 'intraday') return '短线'
  if (horizon === 'position') return '中线'
  return '波段'
}
