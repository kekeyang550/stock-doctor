import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const stocks = [
  { symbol: '600519', name: '贵州茅台', industry: '白酒', last_price: 1518.3, change_pct: 1.18 },
]

const diagnosis = {
  symbol: '600519',
  name: '贵州茅台',
  industry: '白酒',
  as_of: '2026-07-10',
  horizon: 'swing',
  verdict: '趋势和质量较优',
  rating: '强势关注',
  score: { technical: 90, valuation: 80, capital: 88, risk: 82, total: 86 },
  key_levels: { support: 1439.7, pivot: 1502.6, pressure: 1601.8, risk_line: 1396.51 },
  evidence: [{ label: '均线结构', value: '价格 > MA5', interpretation: '中短期趋势排列较强', polarity: 'positive' }],
  checklist: [
    {
      id: 'observe-levels',
      title: '观察关键价位',
      detail: '支撑 1439.70，风控 1396.51，压力 1601.80。',
      status: 'watch',
      priority: 'medium',
    },
  ],
  risks: ['暂未触发重大规则风险，但仍需关注公告、业绩和市场系统性波动。'],
  summary: '贵州茅台当前评级为“强势关注”。',
  disclaimer: '本系统仅用于研究与信息整理，不构成任何投资建议或收益承诺。',
}

const overview = {
  as_of: '2026-07-10',
  index_name: '沪深 300',
  index_level: 4216.38,
  index_change_pct: 0.72,
  advancing: 3,
  declining: 1,
  hot_industries: ['汽车整车', '白酒', '电池'],
  risk_notes: ['成交额温和放大'],
}

const sources = [
  { name: 'Mock A股样例库', status: 'online', role: 'MVP 诊断回归数据' },
]

const connectorHealth = {
  active_provider: 'mock',
  fallback_provider: 'mock',
  connectors: [
    {
      name: 'Mock A股样例库',
      status: 'online',
      active: true,
      role: 'MVP 诊断回归数据与离线开发回退',
      package: null,
      package_installed: true,
      configured_provider: 'mock',
      latency_ms: 0,
      last_checked_at: '2026-07-10T06:00:00Z',
      message: '本地样例数据可用。',
      next_action: '继续作为回归测试和真实数据失败时的兜底数据源。',
    },
    {
      name: 'AKShare',
      status: 'missing-package',
      active: false,
      role: 'A 股行情、指数、板块和资金流数据适配',
      package: 'akshare',
      package_installed: false,
      configured_provider: 'mock',
      latency_ms: null,
      last_checked_at: '2026-07-10T06:00:00Z',
      message: '当前环境未安装 akshare，系统继续使用 Mock 数据。',
      next_action: '在后端环境执行 pip install akshare 后，再设置 STOCK_DOCTOR_DATA_PROVIDER=akshare。',
    },
  ],
}

const refreshJobs = [
  {
    id: 'job-1',
    provider: 'mock',
    status: 'success',
    started_at: '2026-07-10T06:00:00Z',
    finished_at: '2026-07-10T06:00:01Z',
    duration_ms: 12,
    stock_count: 4,
    watchlist_count: 3,
    source_count: 3,
    message: '已刷新全市场样例范围，覆盖 4 只标的，自选股 3 只。',
  },
]

const storageStatus = {
  backend: 'json',
  status: 'online',
  path: 'C:\\Users\\Administrator\\Desktop\\Workspace\\2A\\stock-doctor\\backend\\data\\state.json',
  collections: [
    { key: 'watchlist', label: '自选股', count: 3 },
    { key: 'reports', label: '诊断报告', count: 1 },
    { key: 'notes', label: '研究笔记', count: 1 },
    { key: 'price_alerts', label: '价位提醒', count: 1 },
  ],
  total_records: 6,
  migration_hint: '可通过 STOCK_DOCTOR_STATE_BACKEND=sqlite 切换到 SQLite 持久化。',
}

const reports = [
  { id: 'r1', generated_at: '2026-07-10T03:00:00Z', diagnosis },
]

const notes = [
  {
    id: 'n1',
    symbol: '600519',
    body: '观察量能是否继续温和放大',
    created_at: '2026-07-10T04:00:00Z',
  },
]

const priceAlerts = [
  {
    id: 'pa1',
    symbol: '600519',
    name: '贵州茅台',
    target_price: 1500,
    direction: 'above',
    label: '突破观察',
    last_price: 1518.3,
    distance_pct: -1.21,
    status: 'triggered',
    created_at: '2026-07-10T05:00:00Z',
  },
]

const rankings = [
  {
    symbol: '600519',
    name: '贵州茅台',
    industry: '白酒',
    rating: '强势关注',
    verdict: '趋势和质量较优',
    total_score: 86,
    technical_score: 90,
    capital_score: 88,
    risk_score: 82,
    change_pct: 1.18,
    primary_risk: '暂未触发重大规则风险',
  },
]

const screenCandidates = [
  {
    symbol: '600519',
    name: '贵州茅台',
    industry: '白酒',
    preset: 'strong',
    total_score: 86,
    change_pct: 1.18,
    rating: '强势关注',
    reason: '综合 86，技术 90，趋势结构较强。',
    risk_note: '暂未触发重大规则风险',
  },
]

const alerts = [
  {
    id: '002594-事件-临近解禁窗口',
    symbol: '002594',
    name: '比亚迪',
    industry: '汽车整车',
    severity: 'high',
    category: '事件',
    title: '临近解禁窗口',
    message: '18 天内存在解禁窗口',
    evidence: '解禁倒计时 18 天',
    score: 84,
    as_of: '2026-07-10',
  },
]

const timeline = [
  {
    id: 'alert-002594-事件-临近解禁窗口',
    symbol: '002594',
    name: '比亚迪',
    industry: '汽车整车',
    event_date: '2026-07-10',
    due_date: '2026-07-28',
    severity: 'high',
    category: '事件',
    title: '临近解禁窗口',
    detail: '比亚迪 18 天内存在解禁窗口，需关注筹码供给冲击。',
    trigger: '解禁倒计时 18 天',
    status: 'open',
  },
]

const riskExposure = [
  {
    category: '事件',
    event_count: 1,
    high_count: 1,
    medium_count: 0,
    low_count: 0,
    severity_score: 3,
    top_symbol: '002594',
    top_name: '比亚迪',
    top_title: '临近解禁窗口',
  },
]

const watchlistSummary = {
  as_of: '2026-07-10',
  stock_count: 3,
  average_score: 72.7,
  strong_count: 2,
  high_alert_count: 1,
  top_stock: rankings[0],
  highest_risk_alert: alerts[0],
  industry_exposure: [
    { industry: '白酒', count: 1 },
    { industry: '汽车整车', count: 1 },
  ],
}

const industryHeat = [
  {
    industry: '白酒',
    stock_count: 1,
    average_score: 86,
    average_change_pct: 1.18,
    high_alert_count: 0,
    top_symbol: '600519',
    top_name: '贵州茅台',
    top_score: 86,
    heat_level: 'hot',
  },
]

const trend = {
  symbol: '600519',
  name: '贵州茅台',
  as_of: '2026-07-10',
  change_30d_pct: 4.8,
  high: 1518.3,
  low: 1440.2,
  points: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    close: 1440 + index * 2.7,
    ma5: 1438 + index * 2.5,
    ma20: 1435 + index * 2.2,
    volume_ratio: 1.1,
  })),
}

const peers = {
  symbol: '600519',
  name: '贵州茅台',
  industry: '白酒',
  sample_size: 4,
  items: [
    {
      symbol: '600519',
      name: '贵州茅台',
      industry: '白酒',
      total_score: 86,
      change_pct: 1.18,
      pe_ttm: 24.8,
      roe: 31.4,
      main_inflow_million: 412.5,
      relative_label: '当前标的',
    },
  ],
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/stocks')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stocks) })
      }
      if (url.includes('/watchlist')) {
        if (url.includes('/summary')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(watchlistSummary) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stocks) })
      }
      if (url.includes('/reports')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reports) })
      }
      if (url.includes('/notes')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(notes) })
      }
      if (url.includes('/price-alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(priceAlerts) })
      }
      if (url.includes('/rankings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(rankings) })
      }
      if (url.includes('/screeners')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(screenCandidates) })
      }
      if (url.includes('/trend')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(trend) })
      }
      if (url.includes('/peers')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(peers) })
      }
      if (url.includes('/alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(alerts) })
      }
      if (url.includes('/timeline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(timeline) })
      }
      if (url.includes('/risk/exposure')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(riskExposure) })
      }
      if (url.includes('/market/overview')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overview) })
      }
      if (url.includes('/industries/heat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(industryHeat) })
      }
      if (url.includes('/data-sources')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sources) })
      }
      if (url.includes('/system/data-connectors')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(connectorHealth) })
      }
      if (url.includes('/system/refresh-jobs')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshJobs) })
      }
      if (url.includes('/system/storage')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(storageStatus) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(diagnosis) })
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the diagnosis workspace after loading API data', async () => {
    render(<App />)

    await waitFor(() => expect(screen.getByText('强势关注')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /贵州茅台 600519/ })).toBeInTheDocument()
    expect(screen.getByText('AI 诊断摘要')).toBeInTheDocument()
    expect(screen.getByText('证据链')).toBeInTheDocument()
    expect(screen.getByText('市场概览')).toBeInTheDocument()
    expect(screen.getByText('数据源状态')).toBeInTheDocument()
    expect(screen.getByText('数据连接器')).toBeInTheDocument()
    expect(screen.getByText('AKShare')).toBeInTheDocument()
    expect(screen.getByText('缺包')).toBeInTheDocument()
    expect(screen.getByText('刷新全部')).toBeInTheDocument()
    expect(screen.getByText('刷新记录')).toBeInTheDocument()
    expect(screen.getByText('系统存储')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('诊断报告')).toBeInTheDocument()
    expect(screen.getByText('导出')).toBeInTheDocument()
    expect(screen.getByText('预检')).toBeInTheDocument()
    expect(screen.getByText('报告历史')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '研究笔记' })).toBeInTheDocument()
    expect(screen.getByText('观察量能是否继续温和放大')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '价位提醒' })).toBeInTheDocument()
    expect(screen.getByText('突破观察')).toBeInTheDocument()
    expect(screen.getByText('机会排行')).toBeInTheDocument()
    expect(screen.getByText('策略股票池')).toBeInTheDocument()
    const screenerPanel = screen.getByRole('heading', { name: '策略股票池' }).closest('section')!
    expect(within(screenerPanel).getByText('强势关注')).toBeInTheDocument()
    expect(screen.getByText('预警中心')).toBeInTheDocument()
    expect(screen.getByText('自选股体检')).toBeInTheDocument()
    expect(screen.getByText('行业热力')).toBeInTheDocument()
    expect(screen.getByText('跟踪时间线')).toBeInTheDocument()
    expect(screen.getByText('风险敞口')).toBeInTheDocument()
    expect(screen.getByText('平均评分')).toBeInTheDocument()
    expect(screen.getByText('走势回放')).toBeInTheDocument()
    expect(screen.getByText('操作清单')).toBeInTheDocument()
    expect(screen.getByText('观察关键价位')).toBeInTheDocument()
    expect(screen.getByText('同业对比')).toBeInTheDocument()
    expect(screen.getByText(/当前标的/)).toBeInTheDocument()
    expect(screen.getAllByText('临近解禁窗口').length).toBeGreaterThan(0)
    const alertsPanel = screen.getByRole('heading', { name: '预警中心' }).closest('section')!
    expect(within(alertsPanel).getByText('临近解禁窗口')).toBeInTheDocument()
    const history = screen.getByRole('heading', { name: '报告历史' }).closest('section')!
    expect(within(history).getByText(/600519/)).toBeInTheDocument()
    expect(within(history).getByText(/强势关注/)).toBeInTheDocument()
    expect(within(history).getByText(/86 分/)).toBeInTheDocument()
  })
})
