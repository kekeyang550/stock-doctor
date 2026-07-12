import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const stocks = [
  { symbol: '600519', name: '贵州茅台', industry: '白酒', last_price: 1518.3, change_pct: 1.18 },
  { symbol: '000001', name: '平安银行', industry: '股份制银行', last_price: 10.62, change_pct: 0.19 },
]

const stockSearchResults = [
  {
    symbol: '600519',
    name: '贵州茅台',
    industry: '白酒',
    last_price: 1518.3,
    change_pct: 1.18,
    in_watchlist: true,
    diagnosable: true,
    quality_status: 'pass',
    quality_score: 100,
    match_reason: '默认候选',
  },
  {
    symbol: '000001',
    name: '平安银行',
    industry: '股份制银行',
    last_price: 10.62,
    change_pct: 0.19,
    in_watchlist: false,
    diagnosable: true,
    quality_status: 'pass',
    quality_score: 100,
    match_reason: '行业匹配',
  },
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
  runtime_config: {
    request_timeout_seconds: 8,
    cache_ttl_seconds: 300,
    freshness_stale_after_minutes: 30,
  },
  cache_status: {
    ttl_seconds: 300,
    generated_at: '2026-07-10T06:00:00Z',
    buckets: [
      {
        key: 'stock_list',
        label: '股票列表',
        entries: 1,
        active_entries: 1,
        expired_entries: 0,
        nearest_expires_in_seconds: 240,
        hit_count: 5,
        miss_count: 0,
        hit_rate_pct: 100,
        status: 'active',
      },
      {
        key: 'snapshots',
        label: '行情快照',
        entries: 3,
        active_entries: 2,
        expired_entries: 1,
        nearest_expires_in_seconds: 80,
        hit_count: 8,
        miss_count: 2,
        hit_rate_pct: 80,
        status: 'partial',
      },
      {
        key: 'history',
        label: '历史行情',
        entries: 1,
        active_entries: 0,
        expired_entries: 1,
        nearest_expires_in_seconds: 0,
        hit_count: 1,
        miss_count: 3,
        hit_rate_pct: 25,
        status: 'expired',
      },
    ],
  },
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

const freshness = {
  status: 'fresh',
  provider: 'mock',
  last_success_at: '2026-07-10T06:00:01Z',
  age_minutes: 2,
  stale_after_minutes: 30,
  expected_stock_count: 4,
  last_stock_count: 4,
  coverage_pct: 100,
  message: '最近刷新距今 2 分钟，覆盖率 100.0%。',
  next_action: '可以继续使用当前诊断数据。',
}

const dataQuality = {
  symbol: '600519',
  name: '贵州茅台',
  as_of: '2026-07-10',
  status: 'pass',
  score: 100,
  coverage_pct: 100,
  issue_count: 0,
  summary: '数据质量 100 分，当前诊断字段完整。',
  checks: [
    {
      key: 'market',
      label: '行情字段',
      status: 'pass',
      detail: '最新价与涨跌幅字段完整。',
      impact: '直接影响关键价位、涨跌幅排序和短线热度判断。',
    },
    {
      key: 'technical',
      label: '技术指标',
      status: 'pass',
      detail: '均线、RSI、MACD 和量比字段可用于技术评分。',
      impact: '影响技术分、趋势证据和操作清单。',
    },
    {
      key: 'fundamental',
      label: '估值财务',
      status: 'pass',
      detail: '估值、盈利质量与成长性字段完整。',
      impact: '影响估值分、成长性证据和策略股票池。',
    },
  ],
}

const dataQualityOverview = {
  scope: 'watchlist',
  stock_count: 3,
  average_score: 100,
  pass_count: 3,
  warn_count: 0,
  fail_count: 0,
  lowest_report: dataQuality,
  reports: [dataQuality],
}

const thesis = {
  symbol: '600519',
  name: '贵州茅台',
  horizon: 'swing',
  stance: 'bullish',
  confidence: 82,
  bull_case: '贵州茅台的多头假设来自中短期趋势排列较强，综合评分 86。',
  bear_case: '贵州茅台的空头假设主要是暂未触发重大规则风险，但仍需关注公告、业绩和市场系统性波动。',
  trigger: '价格放量站稳中枢 1502.60 后，观察能否挑战压力位 1598.42。',
  invalidation: '若跌破风控线 1396.51 或核心风险继续升温，当前假设失效。',
  evidence: [
    { label: '均线结构', side: 'bull', weight: 90, detail: '中短期趋势排列较强' },
    { label: '主力资金', side: 'bull', weight: 88, detail: '主力净流入明显' },
  ],
  next_checks: ['确认主力资金与北向资金是否连续两日同向。'],
}

const diagnosisChange = {
  symbol: '600519',
  name: '贵州茅台',
  status: 'baseline',
  current_generated_at: '2026-07-10T06:00:00Z',
  previous_generated_at: null,
  score_delta: 0,
  technical_delta: 0,
  valuation_delta: 0,
  capital_delta: 0,
  risk_delta: 0,
  rating_changed: false,
  previous_rating: null,
  current_rating: '强势关注',
  summary: '暂无历史报告，当前诊断作为复盘基线。',
  changes: [
    {
      key: 'baseline',
      label: '复盘基线',
      direction: 'flat',
      detail: '保存当前报告后，后续诊断会自动对比变化。',
    },
  ],
  score_trend: [
    {
      label: '历史1',
      generated_at: '2026-07-08T06:00:00Z',
      total: 72,
      technical: 77,
      valuation: 76,
      capital: 71,
      risk: 73,
      rating: '谨慎观望',
    },
    {
      label: '上次',
      generated_at: '2026-07-09T06:00:00Z',
      total: 79,
      technical: 83,
      valuation: 78,
      capital: 80,
      risk: 78,
      rating: '稳健观察',
    },
    {
      label: '本次',
      generated_at: '2026-07-10T06:00:00Z',
      total: 86,
      technical: 90,
      valuation: 80,
      capital: 88,
      risk: 82,
      rating: '强势关注',
    },
  ],
  trend_insight: {
    sample_count: 3,
    score_direction: 'up',
    risk_direction: 'improved',
    rating_change_count: 2,
    total_high: 86,
    total_low: 72,
    risk_high: 82,
    risk_low: 73,
    summary: '最近 3 次诊断综合分持续走强，评级变化 2 次，风险分持续改善。',
  },
  rating_transition: {
    previous: null,
    current: '强势关注',
    changed: false,
    detail: '当前为首份复盘基线。',
  },
  risk_shift: {
    direction: 'baseline',
    delta: 0,
    label: '风险基线',
    detail: '保存当前报告后，后续会对比风险分变化。',
  },
  key_drivers: [
    {
      metric: 'baseline',
      label: '首份基线',
      delta: 0,
      direction: 'flat',
      detail: '当前诊断已作为后续对比基线。',
    },
  ],
}

const reviewActions = {
  symbol: '600519',
  name: '贵州茅台',
  horizon: 'swing',
  generated_at: '2026-07-10T06:01:00Z',
  high_count: 1,
  medium_count: 1,
  low_count: 0,
  pending_count: 2,
  watching_count: 0,
  done_count: 0,
  items: [
    {
      id: 'alerts-资金-主力资金流出',
      title: '主力资金流出',
      priority: 'high',
      category: '风险预警 · 资金',
      detail: '主力资金净流出较明显，观察弱势是否延续。',
      source: 'alerts',
      status: 'pending',
    },
    {
      id: 'thesis-1',
      title: '验证论证假设 1',
      priority: 'medium',
      category: '论证验证',
      detail: '确认主力资金与北向资金是否连续两日同向。',
      source: 'thesis',
      status: 'pending',
    },
  ],
}

const reviewActionOverview = {
  scope: 'watchlist',
  horizon: 'swing',
  stock_count: 3,
  high_count: 1,
  medium_count: 5,
  low_count: 1,
  pending_count: 7,
  watching_count: 0,
  done_count: 0,
  summaries: [
    {
      symbol: '600519',
      name: '贵州茅台',
      industry: '白酒',
      item_count: 7,
      high_count: 1,
      medium_count: 5,
      low_count: 1,
      top_priority: 'high',
      top_action: '主力资金流出',
      top_detail: '主力资金净流出较明显，观察弱势是否延续。',
    },
  ],
}

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

const systemReadiness = {
  status: 'warn',
  score: 88,
  summary: '系统可继续开发，就绪度 88 分，存在 1 个待完善项。',
  checks: [
    {
      key: 'storage',
      label: '状态存储',
      status: 'pass',
      detail: 'JSON 存储在线，当前 6 条本地记录。',
      next_action: '继续使用导出/导入能力做跨设备备份。',
    },
    {
      key: 'connector',
      label: '数据连接器',
      status: 'pass',
      detail: 'Mock A股样例库 当前启用，状态为 online。',
      next_action: '研发阶段可继续使用 Mock；接近实盘前切换到 AKShare 或 Tushare。',
    },
    {
      key: 'freshness',
      label: '数据新鲜度',
      status: 'pass',
      detail: '最近刷新距今 2 分钟，覆盖率 100.0%。',
      next_action: '可以继续使用当前诊断数据。',
    },
    {
      key: 'refresh_jobs',
      label: '刷新任务',
      status: 'warn',
      detail: '尚未记录刷新任务。',
      next_action: '运行一次全量刷新，建立任务基线。',
    },
  ],
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
    rule_tags: ['站上均线', '量比放大', '动能为正'],
    positive_evidence: '技术分 90，价格高于 MA5/MA20，量比 1.16。',
    invalidation_risk: '若跌破 MA20 或量能回落至 1.0 以下，突破假设降级。',
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

const portfolioRisk = {
  scope: 'watchlist',
  horizon: 'swing',
  stock_count: 3,
  weight_mode: 'equal',
  total_position_weight: 100,
  average_total_score: 72.7,
  average_risk_score: 74.3,
  portfolio_risk_score: 39,
  risk_level: 'medium',
  risk_label: '中等风险',
  summary: '3 只标的组合风险为中等风险，行业集中度最高为 白酒。',
  concentration: {
    top_industry: '白酒',
    top_industry_count: 1,
    top_industry_ratio: 0.3333,
    industry_count: 3,
  },
  industry_exposures: [
    { industry: '白酒', stock_count: 1, weight_pct: 33.33, risk_score: 18.4 },
    { industry: '汽车整车', stock_count: 1, weight_pct: 33.33, risk_score: 23.1 },
    { industry: '股份制银行', stock_count: 1, weight_pct: 33.33, risk_score: 15.2 },
  ],
  distribution: {
    high_count: 1,
    medium_count: 1,
    low_count: 1,
  },
  top_drivers: [
    {
      symbol: '002594',
      name: '比亚迪',
      industry: '汽车整车',
      risk_score: 58,
      total_score: 80,
      alert_count: 1,
      primary_risk: '临近解禁窗口',
      position_weight_pct: 33.33,
    },
  ],
  risk_contributions: [
    { symbol: '002594', name: '比亚迪', industry: '汽车整车', weight_pct: 33.33, risk_score: 58, contribution_score: 14 },
    { symbol: '600519', name: '贵州茅台', industry: '白酒', weight_pct: 33.33, risk_score: 82, contribution_score: 6 },
    { symbol: '000001', name: '平安银行', industry: '股份制银行', weight_pct: 33.33, risk_score: 83, contribution_score: 5.7 },
  ],
  rebalance_actions: [
    {
      symbol: '002594',
      name: '比亚迪',
      industry: '汽车整车',
      current_weight_pct: 33.33,
      suggested_weight_pct: 23.33,
      delta_pct: -10,
      action: 'reduce',
      priority: 'high',
      reason: '风险分 58，风险贡献 14.0，建议先降权。',
    },
    {
      symbol: '600519',
      name: '贵州茅台',
      industry: '白酒',
      current_weight_pct: 33.33,
      suggested_weight_pct: 33.33,
      delta_pct: 0,
      action: 'hold',
      priority: 'low',
      reason: '风险分 82，维持当前仓位并跟踪。',
    },
  ],
  suggestions: [
    '优先复核 比亚迪：临近解禁窗口',
    '1 只标的处于高风险档，先检查风控线和事件窗口。',
  ],
  exposures: riskExposure,
  positions: [
    { symbol: '600519', name: '贵州茅台', industry: '白酒', weight_pct: 33.33 },
    { symbol: '000001', name: '平安银行', industry: '股份制银行', weight_pct: 33.33 },
    { symbol: '002594', name: '比亚迪', industry: '汽车整车', weight_pct: 33.33 },
  ],
}

const strategyBacktest = {
  preset: 'strong',
  horizon: 'swing',
  holding_days: 5,
  price_source: 'historical-kline',
  history_bar_count: 30,
  history_last_date: '2026-06-30',
  fallback_reason: null,
  fee_bps: 5,
  slippage_bps: 10,
  round_trip_cost_pct: 0.3,
  sample_size: 4,
  match_count: 2,
  trade_count: 2,
  win_rate: 50,
  average_return_pct: 1.23,
  best_return_pct: 3.4,
  worst_return_pct: -0.9,
  positive_trade_count: 1,
  negative_trade_count: 1,
  flat_trade_count: 0,
  return_median_pct: 1.25,
  return_p25_pct: -0.9,
  return_p75_pct: 3.4,
  max_drawdown_pct: -2.1,
  return_drawdown_ratio: 0.59,
  return_volatility_pct: 2.75,
  max_consecutive_loss_count: 1,
  best_path_gain_pct: 3.4,
  worst_path_loss_pct: -2.1,
  stability_score: 78,
  stability_label: '稳定',
  stability_notes: ['收益波动较低，样例路径较平滑。', '最长连续亏损 1 笔，回撤压力可控。'],
  sample_confidence_score: 76,
  sample_confidence_label: '高',
  sample_confidence_notes: ['回测交易 8 笔，样本量较充足。', '使用历史 K 线样本，行情口径更接近真实路径。'],
  equity_curve: [
    { step: 0, label: '起点', equity_pct: 0, drawdown_pct: 0, trade_return_pct: 0, symbol: null, name: null },
    { step: 1, label: '贵州茅台', equity_pct: 3.4, drawdown_pct: 0, trade_return_pct: 3.4, symbol: '600519', name: '贵州茅台' },
    { step: 2, label: '宁德时代', equity_pct: 1.3, drawdown_pct: -2.1, trade_return_pct: -2.1, symbol: '300750', name: '宁德时代' },
  ],
  summary: 'strong 在样例数据中命中 2 只标的，形成 2 笔 5 日持有交易。',
  rule_notes: ['综合分和技术分同时较强。', '样例回测不代表真实历史收益。'],
  trades: [
    {
      symbol: '600519',
      name: '贵州茅台',
      industry: '白酒',
      entry_date: '2026-07-05',
      exit_date: '2026-07-10',
      entry_price: 1468.2,
      exit_price: 1518.1,
      gross_return_pct: 3.4,
      cost_pct: 0.3,
      return_pct: 3.4,
      max_drawdown_pct: -1.2,
      holding_days: 5,
      price_source: 'historical-kline',
      history_bar_count: 30,
      history_last_date: '2026-06-30',
      fallback_reason: null,
      rule_tags: ['综合高分', '技术强势'],
      signal_reason: '综合 86，技术 90，趋势结构较强。',
    },
  ],
}

const strategyBacktestComparison = {
  preset: 'strong',
  horizon: 'swing',
  sample_size: 4,
  match_count: 2,
  recommended_holding_days: 10,
  summary: 'strong 已比较 4 个持有周期，当前样例推荐 10 日。',
  recommendation_reason: '推荐 10 日，因为收益回撤比 1.86，平均收益 5.20%，最大回撤 -2.80%，胜率 100.0%。',
  periods: [
    { holding_days: 3, price_source: 'historical-kline', history_bar_count: 30, history_last_date: '2026-06-30', fallback_reason: null, trade_count: 2, win_rate: 50, average_return_pct: 0.8, max_drawdown_pct: -1.5, return_drawdown_ratio: 0.53 },
    { holding_days: 5, price_source: 'historical-kline', history_bar_count: 30, history_last_date: '2026-06-30', fallback_reason: null, trade_count: 2, win_rate: 50, average_return_pct: 1.23, max_drawdown_pct: -2.1, return_drawdown_ratio: 0.59 },
    { holding_days: 10, price_source: 'historical-kline', history_bar_count: 30, history_last_date: '2026-06-30', fallback_reason: null, trade_count: 2, win_rate: 100, average_return_pct: 5.2, max_drawdown_pct: -2.8, return_drawdown_ratio: 1.86 },
    { holding_days: 20, price_source: 'historical-kline', history_bar_count: 30, history_last_date: '2026-06-30', fallback_reason: null, trade_count: 2, win_rate: 50, average_return_pct: 2.4, max_drawdown_pct: -4.6, return_drawdown_ratio: 0.52 },
  ],
}

const strategyBacktestPresetComparison = {
  horizon: 'swing',
  holding_days: 5,
  sample_size: 4,
  recommended_preset: 'strong',
  summary: '已比较 3 个策略，当前样例推荐 强势关注。',
  recommendation_reason: '推荐 强势关注，因为收益回撤比 0.59，平均收益 1.23%，最大回撤 -2.10%，胜率 50.0%，交易 2 笔。',
  presets: [
    {
      preset: 'strong',
      label: '强势关注',
      holding_days: 5,
      price_source: 'historical-kline',
      history_bar_count: 30,
      history_last_date: '2026-06-30',
      fallback_reason: null,
      match_count: 2,
      trade_count: 2,
      win_rate: 50,
      average_return_pct: 1.23,
      max_drawdown_pct: -2.1,
      return_drawdown_ratio: 0.59,
    },
    {
      preset: 'value',
      label: '低估值观察',
      holding_days: 5,
      price_source: 'historical-kline',
      history_bar_count: 30,
      history_last_date: '2026-06-30',
      fallback_reason: null,
      match_count: 1,
      trade_count: 1,
      win_rate: 100,
      average_return_pct: 0.88,
      max_drawdown_pct: -1.4,
      return_drawdown_ratio: 0.63,
    },
    {
      preset: 'capital-risk',
      label: '资金承压',
      holding_days: 5,
      price_source: 'historical-kline',
      history_bar_count: 30,
      history_last_date: '2026-06-30',
      fallback_reason: null,
      match_count: 1,
      trade_count: 1,
      win_rate: 0,
      average_return_pct: -0.42,
      max_drawdown_pct: -3.2,
      return_drawdown_ratio: -0.13,
    },
  ],
}

const strategyBacktestHistory = {
  preset: 'strong',
  horizon: 'swing',
  summary: 'strong 最近 3 次回测可比，平均收益较上次提升 0.45%，稳定评分提升 2 分。',
  average_return_delta: 0.45,
  max_drawdown_delta: -0.2,
  stability_score_delta: 2,
  sample_confidence_delta: 1,
  latest: {
    id: 'bt-3',
    created_at: '2026-07-11T07:50:00Z',
    preset: 'strong',
    horizon: 'swing',
    holding_days: 5,
    limit: 8,
    fee_bps: 5,
    slippage_bps: 10,
    price_source: 'historical-kline',
    sample_confidence_score: 76,
    sample_confidence_label: '高',
    stability_score: 78,
    stability_label: '稳定',
    trade_count: 2,
    win_rate: 50,
    average_return_pct: 1.23,
    max_drawdown_pct: -2.1,
    return_drawdown_ratio: 0.59,
  },
  previous: {
    id: 'bt-2',
    created_at: '2026-07-11T07:40:00Z',
    preset: 'strong',
    horizon: 'swing',
    holding_days: 10,
    limit: 8,
    fee_bps: 5,
    slippage_bps: 10,
    price_source: 'historical-kline',
    sample_confidence_score: 75,
    sample_confidence_label: '高',
    stability_score: 76,
    stability_label: '稳定',
    trade_count: 2,
    win_rate: 50,
    average_return_pct: 0.78,
    max_drawdown_pct: -1.9,
    return_drawdown_ratio: 0.41,
  },
  items: [
    {
      id: 'bt-3',
      created_at: '2026-07-11T07:50:00Z',
      preset: 'strong',
      horizon: 'swing',
      holding_days: 5,
      limit: 8,
      fee_bps: 5,
      slippage_bps: 10,
      price_source: 'historical-kline',
      sample_confidence_score: 76,
      sample_confidence_label: '高',
      stability_score: 78,
      stability_label: '稳定',
      trade_count: 2,
      win_rate: 50,
      average_return_pct: 1.23,
      max_drawdown_pct: -2.1,
      return_drawdown_ratio: 0.59,
    },
    {
      id: 'bt-2',
      created_at: '2026-07-11T07:40:00Z',
      preset: 'strong',
      horizon: 'swing',
      holding_days: 10,
      limit: 8,
      fee_bps: 5,
      slippage_bps: 10,
      price_source: 'historical-kline',
      sample_confidence_score: 75,
      sample_confidence_label: '高',
      stability_score: 76,
      stability_label: '稳定',
      trade_count: 2,
      win_rate: 50,
      average_return_pct: 0.78,
      max_drawdown_pct: -1.9,
      return_drawdown_ratio: 0.41,
    },
  ],
}

const strategyBacktestActions = {
  preset: 'strong',
  horizon: 'swing',
  generated_at: '2026-07-12T03:20:00Z',
  action_count: 2,
  high_count: 0,
  medium_count: 1,
  low_count: 1,
  pending_count: 2,
  watching_count: 0,
  done_count: 0,
  actions: [
    {
      id: 'backtest-period-mismatch',
      priority: 'medium',
      category: '周期选择',
      title: '切换推荐持有周期复测',
      detail: '周期横向对比给出不同持有天数，建议切换后重新查看交易样本。',
      trigger: '推荐 10 日，因为收益回撤比 1.86。',
      metric: '当前 5 日 / 推荐 10 日',
      status: 'pending',
    },
    {
      id: 'backtest-positive-followup',
      priority: 'low',
      category: '策略确认',
      title: '沉淀正向策略样本',
      detail: '当前收益和回撤结构相对健康，可以保存报告作为后续对比基线。',
      trigger: '平均收益 1.23%，收益回撤比 0.59。',
      metric: '平均收益 1.23%',
      status: 'pending',
    },
  ],
}

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
    heat_score: 89,
    average_score: 86,
    average_change_pct: 1.18,
    average_main_inflow_million: 412.5,
    high_alert_count: 0,
    top_symbol: '600519',
    top_name: '贵州茅台',
    top_score: 86,
    heat_level: 'hot',
    momentum_label: '价量共振',
  },
]

const conceptHeat = [
  {
    concept: '新能源汽车',
    stock_count: 1,
    heat_score: 92,
    average_change_pct: 2.85,
    average_main_inflow_million: 638.9,
    top_symbol: '002594',
    top_name: '比亚迪',
    reason: '比亚迪领涨，价格与资金同步增强。',
    heat_level: 'hot',
  },
]

const momentumSignals = [
  {
    symbol: '002594',
    name: '比亚迪',
    industry: '汽车整车',
    signal_score: 91,
    change_pct: 2.85,
    volume_ratio: 1.58,
    main_inflow_million: 638.9,
    signal_level: 'surging',
    title: '强势异动',
    reason: '涨幅居前；量比放大；主力净流入明显',
  },
]

const hotspotBrief = {
  status: 'hot',
  summary: '热点强度较高，行业主线为汽车整车，题材焦点为新能源汽车，异动代表为比亚迪。',
  top_industry: industryHeat[0],
  top_concept: conceptHeat[0],
  top_signal: momentumSignals[0],
  focus_symbols: ['600519', '002594'],
}

const hotspotCandidates = [
  {
    symbol: '002594',
    name: '比亚迪',
    industry: '汽车整车',
    concept: '新能源汽车',
    heat_score: 88,
    diagnosis_score: 84,
    signal_score: 91,
    change_pct: 2.85,
    main_inflow_million: 638.9,
    reason: '新能源汽车题材；诊断分 84；强势异动，量比放大。',
    risk_note: '18 天内存在解禁窗口，需关注供给冲击。',
    next_action: '短线热度存在，但需同步跟踪解禁窗口和成交承接。',
  },
]

const hotspotReviewPlan = {
  horizon: 'swing',
  mode: 'balanced',
  generated_at: '2026-07-10T08:00:00Z',
  candidate_count: 1,
  high_count: 1,
  medium_count: 0,
  low_count: 0,
  pending_count: 1,
  watching_count: 0,
  done_count: 0,
  actions: [
    {
      id: 'hotspot-002594-新能源汽车',
      symbol: '002594',
      name: '比亚迪',
      concept: '新能源汽车',
      priority: 'high',
      title: '盘中复核 比亚迪 热点承接',
      detail: '短线热度存在，但需同步跟踪解禁窗口和成交承接。',
      trigger: '解禁窗口叠加热点，若放量滞涨需降低优先级。',
      check_window: '今日盘中 + 解禁日前后',
      status: 'pending',
    },
  ],
}

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
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (url.includes('/stocks/search')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stockSearchResults) })
      }
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
      if (url.includes('/backtests/strategy/presets')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(strategyBacktestPresetComparison) })
      }
      if (url.includes('/backtests/strategy/periods')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(strategyBacktestComparison) })
      }
      if (url.includes('/backtests/strategy/history')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(strategyBacktestHistory) })
      }
      if (url.includes('/backtests/strategy/actions')) {
        if (init?.method === 'PATCH') {
          const nextActions = strategyBacktestActions.actions.map((action) =>
            url.includes(action.id) ? { ...action, status: 'done' } : action,
          )
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...strategyBacktestActions,
              pending_count: 1,
              done_count: 1,
              actions: nextActions,
            }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(strategyBacktestActions) })
      }
      if (url.includes('/backtests/strategy')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(strategyBacktest) })
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
      if (url.includes('/diagnosis-change')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(diagnosisChange) })
      }
      if (url.includes('/thesis')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(thesis) })
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
      if (url.includes('/risk/portfolio')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(portfolioRisk) })
      }
      if (url.includes('/market/overview')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overview) })
      }
      if (url.includes('/industries/heat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(industryHeat) })
      }
      if (url.includes('/concepts/heat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(conceptHeat) })
      }
      if (url.includes('/momentum/signals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(momentumSignals) })
      }
      if (url.includes('/hotspots/brief')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotBrief) })
      }
      if (url.includes('/hotspots/review-actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotReviewPlan) })
      }
      if (url.includes('/hotspots/candidates')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotCandidates) })
      }
      if (url.includes('/review-actions?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reviewActionOverview) })
      }
      if (url.includes('/review-actions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reviewActions) })
      }
      if (url.includes('/data-sources')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sources) })
      }
      if (url.includes('/data-quality?scope=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(dataQualityOverview) })
      }
      if (url.includes('/data-quality')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(dataQuality) })
      }
      if (url.includes('/system/data-connectors')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(connectorHealth) })
      }
      if (url.includes('/system/refresh-jobs')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshJobs) })
      }
      if (url.includes('/system/freshness')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(freshness) })
      }
      if (url.includes('/system/readiness')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(systemReadiness) })
      }
      if (url.includes('/system/storage')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(storageStatus) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(diagnosis) })
    }))
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('renders the diagnosis workspace after loading API data', async () => {
    render(<App />)

    await waitFor(() => expect(screen.getByText('强势关注')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: /贵州茅台 600519/ })).toBeInTheDocument()
    const searchResults = screen.getByText('搜索结果').closest('div')!
    expect(within(searchResults).getByText('平安银行')).toBeInTheDocument()
    expect(within(searchResults).getAllByText('质量可靠 100').length).toBeGreaterThan(0)
    expect(within(searchResults).getByLabelText('加入自选 平安银行')).toBeInTheDocument()
    expect(screen.getByText('AI 诊断摘要')).toBeInTheDocument()
    expect(screen.getByText('证据链')).toBeInTheDocument()
    expect(screen.getByText('市场概览')).toBeInTheDocument()
    expect(screen.getByText('数据源状态')).toBeInTheDocument()
    const trustPanel = screen.getByRole('heading', { name: '数据可信度' }).closest('section')!
    expect(within(trustPanel).getByText('行情来源')).toBeInTheDocument()
    expect(within(trustPanel).getByText('请求超时')).toBeInTheDocument()
    expect(within(trustPanel).getByText('8 秒')).toBeInTheDocument()
    expect(within(trustPanel).getByText('缓存 TTL')).toBeInTheDocument()
    expect(within(trustPanel).getByText('300 秒')).toBeInTheDocument()
    expect(within(trustPanel).getByText('缓存命中')).toBeInTheDocument()
    expect(within(trustPanel).getByText('股票列表')).toBeInTheDocument()
    expect(within(trustPanel).getByText('1/1 有效')).toBeInTheDocument()
    expect(within(trustPanel).getByText(/命中 5 \/ 未命中 0 · 命中率 100.0%/)).toBeInTheDocument()
    expect(within(trustPanel).getByText('行情快照')).toBeInTheDocument()
    expect(within(trustPanel).getByText('2/3 有效')).toBeInTheDocument()
    expect(within(trustPanel).getByText(/命中 8 \/ 未命中 2 · 命中率 80.0%/)).toBeInTheDocument()
    expect(within(trustPanel).getByText('历史行情')).toBeInTheDocument()
    expect(within(trustPanel).getByText('0/1 有效')).toBeInTheDocument()
    expect(within(trustPanel).getByText('过期阈值')).toBeInTheDocument()
    expect(within(trustPanel).getByText('30 分钟')).toBeInTheDocument()
    expect(within(trustPanel).getAllByText('mock').length).toBeGreaterThan(0)
    expect(within(trustPanel).getByText('正在使用回退源')).toBeInTheDocument()
    expect(within(trustPanel).getByText('缓存可用')).toBeInTheDocument()
    expect(within(trustPanel).getByText('最近成功')).toBeInTheDocument()
    expect(within(trustPanel).getByText('AKShare')).toBeInTheDocument()
    expect(within(trustPanel).getByText('缺包')).toBeInTheDocument()
    expect(within(trustPanel).getByText('刷新全部')).toBeInTheDocument()
    expect(screen.getAllByText('数据新鲜度').length).toBeGreaterThan(0)
    expect(screen.getByText('新鲜')).toBeInTheDocument()
    expect(screen.getAllByText('100.0%').length).toBeGreaterThan(0)
    expect(screen.getByText('刷新记录')).toBeInTheDocument()
    expect(screen.getByText('系统存储')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('诊断报告')).toBeInTheDocument()
    expect(screen.getByText('导出')).toBeInTheDocument()
    expect(screen.getByText('预检')).toBeInTheDocument()
    const readinessPanel = screen.getByRole('heading', { name: '系统就绪度' }).closest('section')!
    expect(within(readinessPanel).getByText('88')).toBeInTheDocument()
    expect(within(readinessPanel).getByText('状态存储')).toBeInTheDocument()
    expect(within(readinessPanel).getByText('刷新任务')).toBeInTheDocument()
    const qualityOverviewPanel = screen.getByRole('heading', { name: '数据质量总览' }).closest('section')!
    expect(within(qualityOverviewPanel).getByText('平均质量')).toBeInTheDocument()
    expect(within(qualityOverviewPanel).getByText('贵州茅台')).toBeInTheDocument()
    const hotspotPanel = screen.getByRole('heading', { name: '热点总览' }).closest('section')!
    expect(within(hotspotPanel).getByText('热点强')).toBeInTheDocument()
    expect(within(hotspotPanel).getByText('新能源汽车')).toBeInTheDocument()
    const hotspotPool = screen.getByRole('heading', { name: '热点选股池' }).closest('section')!
    expect(within(hotspotPool).getByText('比亚迪')).toBeInTheDocument()
    expect(within(hotspotPool).getByText(/成交承接/)).toBeInTheDocument()
    expect(within(hotspotPool).getByText('资金')).toBeInTheDocument()
    expect(within(hotspotPool).getByText('异动')).toBeInTheDocument()
    const hotspotReviewPanel = screen.getByRole('heading', { name: '热点跟踪动作' }).closest('section')!
    expect(within(hotspotReviewPanel).getByText('盘中复核 比亚迪 热点承接')).toBeInTheDocument()
    expect(within(hotspotReviewPanel).getByText('今日盘中 + 解禁日前后')).toBeInTheDocument()
    expect(within(hotspotReviewPanel).getByRole('button', { name: '全部' })).toBeInTheDocument()
    expect(within(hotspotReviewPanel).getAllByText('待处理').length).toBeGreaterThan(0)
    expect(screen.getByText('报告历史')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '研究笔记' })).toBeInTheDocument()
    expect(screen.getByText('观察量能是否继续温和放大')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '价位提醒' })).toBeInTheDocument()
    expect(screen.getByText('突破观察')).toBeInTheDocument()
    expect(screen.getByText('机会排行')).toBeInTheDocument()
    expect(screen.getByText('策略股票池')).toBeInTheDocument()
    const screenerPanel = screen.getByRole('heading', { name: '策略股票池' }).closest('section')!
    expect(within(screenerPanel).getByText('强势关注')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('放量突破')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('资金回流')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('风险回避')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('命中规则')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('站上均线')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('正面证据')).toBeInTheDocument()
    expect(within(screenerPanel).getByText('失效风险')).toBeInTheDocument()
    expect(screen.getByText('预警中心')).toBeInTheDocument()
    expect(screen.getByText('自选股体检')).toBeInTheDocument()
    expect(screen.getByText('行业热力')).toBeInTheDocument()
    expect(screen.getByText(/价量共振/)).toBeInTheDocument()
    const conceptPanel = screen.getByRole('heading', { name: '题材热榜' }).closest('section')!
    expect(within(conceptPanel).getByText('新能源汽车')).toBeInTheDocument()
    expect(screen.getByText('异动雷达')).toBeInTheDocument()
    const actionOverviewPanel = screen.getByRole('heading', { name: '行动总览' }).closest('section')!
    expect(within(actionOverviewPanel).getByText('主力资金流出')).toBeInTheDocument()
    expect(within(actionOverviewPanel).getByText(/600519/)).toBeInTheDocument()
    expect(screen.getByText('跟踪时间线')).toBeInTheDocument()
    expect(screen.getByText('组合风险')).toBeInTheDocument()
    expect(screen.getByText('平均评分')).toBeInTheDocument()
    expect(screen.getByText('走势回放')).toBeInTheDocument()
    expect(screen.getByText('操作清单')).toBeInTheDocument()
    expect(screen.getByText('观察关键价位')).toBeInTheDocument()
    expect(screen.getByText('同业对比')).toBeInTheDocument()
    const changePanel = screen.getByRole('heading', { name: '诊断变化' }).closest('section')!
    expect(within(changePanel).getByText('复盘基线')).toBeInTheDocument()
    expect(within(changePanel).getByText('当前为首份复盘基线')).toBeInTheDocument()
    expect(within(changePanel).getByText('趋势对比')).toBeInTheDocument()
    expect(within(changePanel).getByText('历史1 · 谨慎观望')).toBeInTheDocument()
    expect(within(changePanel).getByText('上次 · 稳健观察')).toBeInTheDocument()
    expect(within(changePanel).getByText('本次 · 强势关注')).toBeInTheDocument()
    expect(within(changePanel).getByText('综合 86 / 风险 82')).toBeInTheDocument()
    expect(within(changePanel).getByText('趋势洞察')).toBeInTheDocument()
    expect(within(changePanel).getByText('综合趋势')).toBeInTheDocument()
    expect(within(changePanel).getByText('持续走强')).toBeInTheDocument()
    expect(within(changePanel).getByText('评级变化 2 次')).toBeInTheDocument()
    expect(within(changePanel).getByText('评级轨迹')).toBeInTheDocument()
    expect(within(changePanel).getByText('强势关注')).toBeInTheDocument()
    expect(within(changePanel).getByText('风险变化')).toBeInTheDocument()
    expect(within(changePanel).getByText('风险基线')).toBeInTheDocument()
    expect(within(changePanel).getByText('关键驱动')).toBeInTheDocument()
    expect(within(changePanel).getByText('当前诊断已作为后续对比基线。')).toBeInTheDocument()
    const reviewPanel = screen.getByRole('heading', { name: '复盘行动' }).closest('section')!
    expect(within(reviewPanel).getAllByText('高优先').length).toBeGreaterThan(0)
    expect(within(reviewPanel).getByText('主力资金流出')).toBeInTheDocument()
    expect(within(reviewPanel).getByText('验证论证假设 1')).toBeInTheDocument()
    const qualityPanel = screen.getByRole('heading', { name: '数据质量' }).closest('section')!
    expect(within(qualityPanel).getAllByText('可靠').length).toBeGreaterThan(0)
    expect(within(qualityPanel).getByText('行情字段')).toBeInTheDocument()
    expect(within(qualityPanel).getByText('技术指标')).toBeInTheDocument()
    const thesisPanel = screen.getByRole('heading', { name: '诊断论证' }).closest('section')!
    expect(within(thesisPanel).getByText('多头假设')).toBeInTheDocument()
    expect(within(thesisPanel).getByText('空头假设')).toBeInTheDocument()
    expect(within(thesisPanel).getByText('均线结构')).toBeInTheDocument()
    expect(screen.getByText(/当前标的/)).toBeInTheDocument()
    expect(screen.getAllByText('临近解禁窗口').length).toBeGreaterThan(0)
    const alertsPanel = screen.getByRole('heading', { name: '预警中心' }).closest('section')!
    expect(within(alertsPanel).getByText('临近解禁窗口')).toBeInTheDocument()
    const history = screen.getByRole('heading', { name: '报告历史' }).closest('section')!
    expect(within(history).getByText(/600519/)).toBeInTheDocument()
    expect(within(history).getByText(/强势关注/)).toBeInTheDocument()
    expect(within(history).getByText(/86 分/)).toBeInTheDocument()
  })

  it('keeps diagnosis change panel visible when legacy change data omits enhanced fields', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    const legacyDiagnosisChange = {
      symbol: diagnosisChange.symbol,
      name: diagnosisChange.name,
      status: diagnosisChange.status,
      current_generated_at: diagnosisChange.current_generated_at,
      previous_generated_at: diagnosisChange.previous_generated_at,
      score_delta: diagnosisChange.score_delta,
      technical_delta: diagnosisChange.technical_delta,
      valuation_delta: diagnosisChange.valuation_delta,
      capital_delta: diagnosisChange.capital_delta,
      risk_delta: diagnosisChange.risk_delta,
      rating_changed: diagnosisChange.rating_changed,
      previous_rating: diagnosisChange.previous_rating,
      current_rating: diagnosisChange.current_rating,
      summary: diagnosisChange.summary,
      changes: diagnosisChange.changes,
    }
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      if (String(url).includes('/diagnosis-change')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(legacyDiagnosisChange) } as Response)
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const changePanel = await waitFor(() => {
      const panel = screen.getByRole('heading', { name: '诊断变化' }).closest('section')
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    expect(within(changePanel).getByText('复盘基线')).toBeInTheDocument()
    expect(within(changePanel).getByText('暂无趋势对比数据')).toBeInTheDocument()
    expect(within(changePanel).getByText('暂无关键驱动数据')).toBeInTheDocument()
  })

  it('shows a diagnosis failure state when market diagnosis times out', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/diagnosis/600519')) {
        return Promise.reject(new Error('行情接口超时'))
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    await waitFor(() => expect(screen.getByText('行情数据加载失败')).toBeInTheDocument())
    const diagnosisFailure = screen.getByText('行情数据加载失败').closest('.state-panel') as HTMLElement
    expect(within(diagnosisFailure).getByText('行情接口超时')).toBeInTheDocument()
    expect(within(diagnosisFailure).getByText('可能是行情源、网络或接口超时导致，当前诊断没有更新。')).toBeInTheDocument()
    expect(within(diagnosisFailure).getByRole('button', { name: '重试诊断' })).toBeInTheDocument()
    expect(screen.queryByText('正在生成诊断...')).not.toBeInTheDocument()
  })

  it('shows panel-level errors when candidate APIs fail', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/screeners')) {
        return Promise.reject(new Error('策略接口超时'))
      }
      if (target.includes('/hotspots/candidates')) {
        return Promise.reject(new Error('热点候选接口超时'))
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const screenerPanel = await waitFor(() => {
      const panel = document.querySelector('.screener-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略股票池加载失败')
      return panel as HTMLElement
    })
    expect(within(screenerPanel).getByText('策略接口超时')).toBeInTheDocument()
    expect(within(screenerPanel).getByRole('button', { name: '重试策略池' })).toBeInTheDocument()

    const hotspotPanel = await waitFor(() => {
      const panel = document.querySelector('.hotspot-candidates-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('热点选股池加载失败')
      return panel as HTMLElement
    })
    expect(within(hotspotPanel).getByText('热点候选接口超时')).toBeInTheDocument()
    expect(within(hotspotPanel).getByRole('button', { name: '重试热点池' })).toBeInTheDocument()
  })

  it('shows actionable empty states when there are no candidate stocks', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/screeners')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
      }
      if (target.includes('/hotspots/candidates')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const screenerPanel = await waitFor(() => {
      const panel = document.querySelector('.screener-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('当前策略没有候选股票')
      return panel as HTMLElement
    })
    expect(within(screenerPanel).getByText('可以切换策略，或等待下一轮行情刷新后再看。')).toBeInTheDocument()

    const hotspotPanel = await waitFor(() => {
      const panel = document.querySelector('.hotspot-candidates-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('当前热点模式没有候选股票')
      return panel as HTMLElement
    })
    expect(within(hotspotPanel).getByText('可以切换均衡/激进模式，或等待热点数据刷新。')).toBeInTheDocument()
  })

  it('shows portfolio risk summary with concentration, distribution, drivers and exposures', async () => {
    render(<App />)

    const riskPanel = await waitFor(() => {
      const panel = document.querySelector('.exposure-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('组合风险')
      return panel as HTMLElement
    })

    expect(within(riskPanel).getByText('风险压力')).toBeInTheDocument()
    expect(within(riskPanel).getByText('39')).toBeInTheDocument()
    expect(within(riskPanel).getAllByText('中等风险').length).toBeGreaterThan(0)
    expect(within(riskPanel).getByText('行业集中')).toBeInTheDocument()
    expect(riskPanel).toHaveTextContent('白酒 33.3%')
    expect(within(riskPanel).getByText('行业暴露')).toBeInTheDocument()
    expect(riskPanel).toHaveTextContent('汽车整车 33.3%')
    expect(within(riskPanel).getByText('风险分布')).toBeInTheDocument()
    expect(riskPanel).toHaveTextContent('高 1 / 中 1 / 低 1')
    expect(within(riskPanel).getByText('风险贡献')).toBeInTheDocument()
    expect(riskPanel).toHaveTextContent('比亚迪 · 汽车整车')
    expect(riskPanel).toHaveTextContent('贡献 14.0')
    expect(within(riskPanel).getByText('再平衡建议')).toBeInTheDocument()
    expect(riskPanel).toHaveTextContent('比亚迪 · 降权 · 33.3% → 23.3%')
    expect(riskPanel).toHaveTextContent('风险分 58，风险贡献 14.0，建议先降权。')
    expect(within(riskPanel).getByText('优先复核 比亚迪：临近解禁窗口')).toBeInTheDocument()
    expect(within(riskPanel).getByText('事件')).toBeInTheDocument()
    expect(within(riskPanel).getByText('临近解禁窗口')).toBeInTheDocument()
  })

  it('refreshes portfolio risk with simulated position weights', async () => {
    const weightedRisk = {
      ...portfolioRisk,
      weight_mode: 'custom',
      total_position_weight: 80,
      average_total_score: 86,
      average_risk_score: 82,
      concentration: {
        ...portfolioRisk.concentration,
        top_industry_ratio: 1,
      },
      positions: [
        { symbol: '600519', name: '贵州茅台', industry: '白酒', weight_pct: 80 },
        { symbol: '000001', name: '平安银行', industry: '股份制银行', weight_pct: 0 },
        { symbol: '002594', name: '比亚迪', industry: '汽车整车', weight_pct: 0 },
      ],
    }
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/risk/portfolio') && target.includes('weights=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(weightedRisk) } as Response)
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const weightInput = await screen.findByLabelText('模拟仓位 贵州茅台')
    fireEvent.change(weightInput, { target: { value: '80' } })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/risk/portfolio'))
      const portfolioCalls = vi.mocked(fetch).mock.calls
        .map((call) => decodeURIComponent(String(call[0])))
        .filter((url) => url.includes('/risk/portfolio'))
      expect(portfolioCalls.some((url) => url.includes('weights=600519:80'))).toBe(true)
    })
    const riskPanel = screen.getByRole('heading', { name: '组合风险' }).closest('section')!
    await waitFor(() => expect(riskPanel).toHaveTextContent('自定义权重'))
    expect(riskPanel).toHaveTextContent('总权重 80.0%')
  })

  it('shows strategy backtest summary with sample trades and drawdown', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略回测')
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByText('样例交易')).toBeInTheDocument()
    expect(within(backtestPanel).getAllByText('胜率').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('平均收益').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('最大回撤').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('收益回撤比').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getByText('收益分布')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('权益曲线')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('累计收益')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('路径最大回撤')).toBeInTheDocument()
    expect(within(backtestPanel).getByText(/宁德时代/)).toBeInTheDocument()
    expect(within(backtestPanel).getByText('稳定性')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('收益波动')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('最长连续亏损')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('最佳连续收益')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('最差连续亏损')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('稳定评分')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('稳定等级')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('稳定性说明')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('78')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('样本可信度')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('可信等级')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('可信度说明')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('76')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('历史对比')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('平均收益变化')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('稳定评分变化')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('最近回测')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('回测复盘动作')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('切换推荐持有周期复测')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('当前 5 日 / 推荐 10 日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('2')).toBeInTheDocument()
    expect(within(backtestPanel).getAllByText('50.0%').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('+1.23%').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('-2.10%').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('0.59').length).toBeGreaterThan(0)
    expect(backtestPanel).toHaveTextContent('胜 1 / 负 1 / 平 0')
    expect(backtestPanel).toHaveTextContent('中位+1.25%')
    expect(backtestPanel).toHaveTextContent('P25 -0.90%')
    expect(backtestPanel).toHaveTextContent('P75 +3.40%')
    expect(within(backtestPanel).getByText('价格来源')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('历史K线')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('历史样本')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('30 根')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('最后交易日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('2026-06-30')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('成本口径')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('手续费')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('5 bps')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('滑点')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('10 bps')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('单笔成本')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('0.30%')).toBeInTheDocument()
    expect(within(backtestPanel).getAllByText('贵州茅台').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getByText('600519 · 白酒 · 5 日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('净收益 +3.40%')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('毛收益 +3.40% · 成本 0.30% · 历史K线')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('综合高分')).toBeInTheDocument()
  })

  it('updates a strategy backtest action status', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('回测复盘动作')
      return panel as HTMLElement
    })
    const action = within(backtestPanel).getByText('切换推荐持有周期复测').closest('article')!

    fireEvent.click(within(action).getByRole('button', { name: '已完成' }))

    await waitFor(() => {
      const patchCall = vi.mocked(fetch).mock.calls.find((call) =>
        String(call[0]).includes('/backtests/strategy/actions/backtest-period-mismatch') &&
        call[1]?.method === 'PATCH',
      )
      expect(patchCall).toBeTruthy()
      expect(action).toHaveTextContent('已完成')
      expect(backtestPanel).toHaveTextContent('已完成 1')
    })
  })

  it('shows strategy backtest period comparison with the recommended holding period', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('周期对比')
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByText('strong 已比较 4 个持有周期，当前样例推荐 10 日。')).toBeInTheDocument()
    expect(within(backtestPanel).getAllByText('推荐依据').length).toBeGreaterThan(0)
    expect(backtestPanel).toHaveTextContent('推荐 10 日，因为收益回撤比 1.86，平均收益 5.20%，最大回撤 -2.80%，胜率 100.0%。')
    expect(within(backtestPanel).getByText('3日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('10日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('20日')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('策略推荐')).toBeInTheDocument()
    expect(backtestPanel).toHaveTextContent('推荐 强势关注，因为收益回撤比 0.59，平均收益 1.23%，最大回撤 -2.10%，胜率 50.0%，交易 2 笔。')
    expect(within(backtestPanel).getAllByText('平均收益').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('最大回撤').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getAllByText('收益回撤比').length).toBeGreaterThan(0)
    expect(within(backtestPanel).getByText('+5.20%')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('1.86')).toBeInTheDocument()
  })

  it('keeps the selected strategy backtest when period comparison fails', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/backtests/strategy/periods')) {
        return Promise.reject(new Error('周期对比接口超时'))
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('周期对比暂不可用')
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByText('周期对比接口超时')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('样例交易')).toBeInTheDocument()
    expect(within(backtestPanel).getAllByText('贵州茅台').length).toBeGreaterThan(0)
  })

  it('reloads strategy backtest when the holding period changes', async () => {
    const tenDayBacktest = {
      ...strategyBacktest,
      holding_days: 10,
      summary: 'strong 在样例数据中命中 2 只标的，形成 2 笔 10 日持有交易。',
      trades: strategyBacktest.trades.map((trade) => ({ ...trade, holding_days: 10, return_pct: 5.2 })),
    }
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/backtests/strategy?') && target.includes('holding_days=10')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(tenDayBacktest) } as Response)
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略回测')
      return panel as HTMLElement
    })

    fireEvent.click(within(backtestPanel).getByRole('button', { name: '10日' }))

    await waitFor(() => {
      const backtestCalls = vi.mocked(fetch).mock.calls.map((call) => String(call[0])).filter((url) => url.includes('/backtests/strategy'))
      expect(backtestCalls.some((url) => url.includes('holding_days=10'))).toBe(true)
    })
    expect(backtestPanel).toHaveTextContent('10 日样例持有')
    expect(backtestPanel).toHaveTextContent('600519 · 白酒 · 10 日')
    expect(backtestPanel).toHaveTextContent('+5.20%')
  })

  it('reloads strategy backtest when fee, slippage, and sample limit change', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略回测')
      return panel as HTMLElement
    })

    const feeInput = within(backtestPanel).getByLabelText('回测手续费 bps')
    const slippageInput = within(backtestPanel).getByLabelText('回测滑点 bps')
    const limitInput = within(backtestPanel).getByLabelText('回测样本数量')

    fireEvent.change(feeInput, { target: { value: '8' } })
    fireEvent.change(slippageInput, { target: { value: '12' } })
    fireEvent.change(limitInput, { target: { value: '6' } })

    await waitFor(() => {
      const backtestCalls = vi.mocked(fetch).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/backtests/strategy'))
      expect(backtestCalls.some((url) => url.includes('fee_bps=8'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('slippage_bps=12'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('limit=6'))).toBe(true)
    })
  })

  it('shows strategy preset comparison with the current backtest parameters', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略对比')
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByText('强势关注')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('低估值观察')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('资金承压')).toBeInTheDocument()
    expect(within(backtestPanel).getByText('策略推荐')).toBeInTheDocument()

    const backtestCalls = vi.mocked(fetch).mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.includes('/backtests/strategy/presets'))
    expect(backtestCalls.some((url) => (
      url.includes('holding_days=5')
      && url.includes('fee_bps=5')
      && url.includes('slippage_bps=10')
      && url.includes('limit=8')
    ))).toBe(true)
  })

  it('uses saved strategy backtest parameters on first load', async () => {
    window.localStorage.setItem('stock-doctor-backtest-parameters-v1', JSON.stringify({
      holding_days: 10,
      fee_bps: 8,
      slippage_bps: 12,
      limit: 6,
    }))

    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByLabelText('回测手续费 bps')).toHaveValue(8)
    expect(within(backtestPanel).getByLabelText('回测滑点 bps')).toHaveValue(12)
    expect(within(backtestPanel).getByLabelText('回测样本数量')).toHaveValue(6)

    await waitFor(() => {
      const backtestCalls = vi.mocked(fetch).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/backtests/strategy'))
      expect(backtestCalls.some((url) => url.includes('holding_days=10'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('fee_bps=8'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('slippage_bps=12'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('limit=6'))).toBe(true)
    })
  })

  it('saves changed strategy backtest parameters to local storage', async () => {
    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })

    fireEvent.click(within(backtestPanel).getByRole('button', { name: '10日' }))
    fireEvent.change(within(backtestPanel).getByLabelText('回测手续费 bps'), { target: { value: '8' } })
    fireEvent.change(within(backtestPanel).getByLabelText('回测滑点 bps'), { target: { value: '12' } })
    fireEvent.change(within(backtestPanel).getByLabelText('回测样本数量'), { target: { value: '6' } })

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem('stock-doctor-backtest-parameters-v1') ?? '{}')).toEqual({
        holding_days: 10,
        fee_bps: 8,
        slippage_bps: 12,
        limit: 6,
      })
    })
  })

  it('falls back to default strategy backtest parameters when local storage is invalid', async () => {
    window.localStorage.setItem('stock-doctor-backtest-parameters-v1', 'not-json')

    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })

    expect(within(backtestPanel).getByLabelText('回测手续费 bps')).toHaveValue(5)
    expect(within(backtestPanel).getByLabelText('回测滑点 bps')).toHaveValue(10)
    expect(within(backtestPanel).getByLabelText('回测样本数量')).toHaveValue(8)

    await waitFor(() => {
      const backtestCalls = vi.mocked(fetch).mock.calls
        .map((call) => String(call[0]))
        .filter((url) => url.includes('/backtests/strategy'))
      expect(backtestCalls.some((url) => url.includes('holding_days=5'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('fee_bps=5'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('slippage_bps=10'))).toBe(true)
      expect(backtestCalls.some((url) => url.includes('limit=8'))).toBe(true)
    })
  })

  it('shows a local strategy backtest error when the backtest API fails', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/backtests/strategy')) {
        return Promise.reject(new Error('回测接口超时'))
      }
      return defaultFetch(url, options)
    })

    render(<App />)

    const backtestPanel = await waitFor(() => {
      const panel = document.querySelector('.strategy-backtest-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('策略回测加载失败')
      return panel as HTMLElement
    })
    expect(within(backtestPanel).getByText('回测接口超时')).toBeInTheDocument()
    expect(within(backtestPanel).getByRole('button', { name: '重试回测' })).toBeInTheDocument()

    const screenerPanel = screen.getByRole('heading', { name: '策略股票池' }).closest('section')!
    expect(within(screenerPanel).getByText('强势关注')).toBeInTheDocument()
  })

  it('disables refresh buttons while a refresh job is running and shows the new job', async () => {
    render(<App />)

    await waitFor(() => expect(screen.getByText('刷新全部')).toBeInTheDocument())
    const connectorPanel = screen.getByText('刷新全部').closest('section')!
    const refreshedJob = {
      ...refreshJobs[0],
      id: 'job-2',
      finished_at: '2026-07-10T06:05:00Z',
      duration_ms: 18,
      message: '已刷新全市场样例范围，覆盖 5 只标的，自选股 3 只。',
    }
    const refreshedFreshness = {
      ...freshness,
      age_minutes: 0,
      last_stock_count: 5,
      expected_stock_count: 5,
      message: '刚刚刷新完成，覆盖率 100.0%。',
    }
    const refreshedReadiness = {
      ...systemReadiness,
      status: 'pass',
      score: 96,
      summary: '系统数据刚刚刷新完成，就绪度 96 分。',
    }
    let refreshJobList = refreshJobs
    let resolveRefresh: () => void = () => {
      throw new Error('refresh request resolver was not initialized')
    }
    const refreshRequest = new Promise<void>((resolve) => {
      resolveRefresh = resolve
    })

    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/system/refresh-jobs') && options?.method === 'POST') {
        return refreshRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(refreshedJob),
        } as Response))
      }
      if (target.includes('/system/refresh-jobs')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshJobList) } as Response)
      }
      if (target.includes('/system/freshness')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshedFreshness) } as Response)
      }
      if (target.includes('/system/readiness')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshedReadiness) } as Response)
      }
      if (target.includes('/stocks')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stocks) } as Response)
      }
      if (target.includes('/watchlist/summary')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(watchlistSummary) } as Response)
      }
      if (target.includes('/watchlist')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(stocks) } as Response)
      }
      if (target.includes('/market/overview')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overview) } as Response)
      }
      if (target.includes('/data-sources')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(sources) } as Response)
      }
      if (target.includes('/system/data-connectors')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(connectorHealth) } as Response)
      }
      if (target.includes('/system/storage')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(storageStatus) } as Response)
      }
      if (target.includes('/data-quality?scope=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(dataQualityOverview) } as Response)
      }
      if (target.includes('/reports')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reports) } as Response)
      }
      if (target.includes('/momentum/signals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(momentumSignals) } as Response)
      }
      if (target.includes('/hotspots/brief')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotBrief) } as Response)
      }
      if (target.includes('/hotspots/candidates')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotCandidates) } as Response)
      }
      if (target.includes('/hotspots/review-actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(hotspotReviewPlan) } as Response)
      }
      if (target.includes('/review-actions?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reviewActionOverview) } as Response)
      }
      if (target.includes('/review-actions/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(reviewActions) } as Response)
      }
      if (target.includes('/alerts')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(alerts) } as Response)
      }
      if (target.includes('/timeline')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(timeline) } as Response)
      }
      if (target.includes('/risk/portfolio')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(portfolioRisk) } as Response)
      }
      if (target.includes('/risk/exposure')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(riskExposure) } as Response)
      }
      if (target.includes('/industries/heat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(industryHeat) } as Response)
      }
      if (target.includes('/concepts/heat')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(conceptHeat) } as Response)
      }
      if (target.includes('/rankings')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(rankings) } as Response)
      }
      if (target.includes('/screeners')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(screenCandidates) } as Response)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(diagnosis) } as Response)
    })

    const refreshAll = within(connectorPanel).getByRole('button', { name: '刷新全部' })
    fireEvent.click(refreshAll)

    expect(refreshAll).toBeDisabled()
    expect(within(connectorPanel).getByText('刷新中')).toBeInTheDocument()

    refreshJobList = [refreshedJob, ...refreshJobs]
    resolveRefresh()

    await waitFor(() => expect(within(connectorPanel).getAllByText(refreshedJob.message).length).toBeGreaterThan(0))
    expect(within(connectorPanel).getAllByText('刚刚刷新完成，覆盖率 100.0%。').length).toBeGreaterThan(0)
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/system/refresh-jobs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ scope: 'all' }),
      }),
    )
  })

  it('shows an inline data refresh failure message while keeping cached data visible', async () => {
    render(<App />)

    const connectorPanel = await waitFor(() => {
      const panel = document.querySelector('.connector-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      expect(panel).toHaveTextContent('数据可信度')
      return panel as HTMLElement
    })
    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/system/refresh-jobs') && options?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 504, json: () => Promise.resolve({}) } as Response)
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(within(connectorPanel).getByRole('button', { name: '刷新全部' }))

    await waitFor(() => expect(within(connectorPanel).getByText('刷新失败')).toBeInTheDocument())
    expect(within(connectorPanel).getByText('刷新任务失败：504')).toBeInTheDocument()
    expect(within(connectorPanel).getByText('已保留当前缓存数据，请检查行情源或稍后重试。')).toBeInTheDocument()
    expect(within(connectorPanel).getByText('缓存可用')).toBeInTheDocument()
  })

  it('disables the save report button while a report is being created', async () => {
    render(<App />)

    const toolbar = await waitFor(() => {
      const node = document.querySelector('.topbar .toolbar') as HTMLElement | null
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    const saveButton = within(toolbar).getByRole('button', { name: '存报告' })
    const createdReport = {
      id: 'r2',
      generated_at: '2026-07-10T09:00:00Z',
      diagnosis: {
        ...diagnosis,
        name: '保存测试报告',
      },
    }
    let resolveCreate: () => void = () => {
      throw new Error('report resolver was not initialized')
    }
    const createRequest = new Promise<void>((resolve) => {
      resolveCreate = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/reports') && options?.method === 'POST') {
        return createRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(createdReport),
        } as Response))
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveTextContent('保存中')

    resolveCreate()

    await waitFor(() => expect(within(toolbar).getByRole('button', { name: '存报告' })).toBeEnabled())
    expect(screen.getByText('保存测试报告')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/reports',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ symbol: '600519', horizon: 'swing' }),
      }),
    )
  })

  it('exports the current research report with diagnosis, portfolio risk, strategy backtest, and data trust context', async () => {
    const NativeBlob = Blob
    let reportBlobParts: BlobPart[] = []
    vi.stubGlobal('Blob', vi.fn(function (parts?: BlobPart[], options?: BlobPropertyBag) {
      reportBlobParts = parts ?? []
      return new NativeBlob(parts, options)
    }))
    const createdUrls: Blob[] = []
    const createObjectURL = vi.fn((blob: Blob) => {
      createdUrls.push(blob)
      return 'blob:stock-doctor-report'
    })
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))

    const anchor = Document.prototype.createElement.call(document, 'a') as HTMLAnchorElement
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'a') return anchor
      return Document.prototype.createElement.call(document, tagName, options)
    })

    render(<App />)

    const weightInput = await screen.findByLabelText('模拟仓位 贵州茅台')
    fireEvent.change(weightInput, { target: { value: '80' } })

    const toolbar = await waitFor(() => {
      const node = document.querySelector('.topbar .toolbar') as HTMLElement | null
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    const exportButton = within(toolbar).getByRole('button', { name: '导出报告' })
    fireEvent.click(exportButton)

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    const exported = JSON.parse(String(reportBlobParts[0]))
    expect(exported.version).toBe('stock-doctor-report-v2')
    expect(exported.symbol).toBe('600519')
    expect(exported.horizon).toBe('swing')
    expect(exported.diagnosis.symbol).toBe('600519')
    expect(exported.portfolio_risk.risk_label).toBe('中等风险')
    expect(exported.strategy_backtest.trade_count).toBe(2)
    expect(exported.strategy_backtest_parameters).toEqual({
      fee_bps: 5,
      slippage_bps: 10,
      limit: 8,
      holding_days: 5,
    })
    expect(exported.strategy_backtest_comparison.recommended_holding_days).toBe(10)
    expect(exported.strategy_backtest_comparison.recommendation_reason).toContain('收益回撤比 1.86')
    expect(exported.strategy_backtest_actions.actions.map((item: { title: string }) => item.title)).toContain('切换推荐持有周期复测')
    expect(exported.strategy_preset_comparison.recommended_preset).toBe('strong')
    expect(exported.strategy_preset_comparison.presets.map((item: { label: string }) => item.label)).toEqual([
      '强势关注',
      '低估值观察',
      '资金承压',
    ])
    expect(exported.review_actions.pending_count).toBe(2)
    expect(exported.review_actions.items.map((item: { title: string }) => item.title)).toContain('验证论证假设 1')
    expect(exported.portfolio_weight_inputs['600519']).toBe('80')
    expect(exported.data_trust.connector_health.active_provider).toBe('mock')
    expect(exported.data_trust.freshness.status).toBe('fresh')
    expect(anchor.download).toBe(`stock-doctor-report-600519-${new Date().toISOString().slice(0, 10)}.json`)
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stock-doctor-report')
  })

  it('exports a readable HTML research report from the current v2 payload', async () => {
    const NativeBlob = Blob
    let reportBlobParts: BlobPart[] = []
    vi.stubGlobal('Blob', vi.fn(function (parts?: BlobPart[], options?: BlobPropertyBag) {
      reportBlobParts = parts ?? []
      return new NativeBlob(parts, options)
    }))
    const createObjectURL = vi.fn(() => 'blob:stock-doctor-html-report')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))

    const anchor = Document.prototype.createElement.call(document, 'a') as HTMLAnchorElement
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'a') return anchor
      return Document.prototype.createElement.call(document, tagName, options)
    })

    render(<App />)

    const toolbar = await waitFor(() => {
      const node = document.querySelector('.topbar .toolbar') as HTMLElement | null
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    fireEvent.click(within(toolbar).getByRole('button', { name: '导出HTML' }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    const html = String(reportBlobParts[0])
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('贵州茅台')
    expect(html).toContain('诊断变化')
    expect(html).toContain('暂无历史报告，当前诊断作为复盘基线。')
    expect(html).toContain('评级轨迹')
    expect(html).toContain('风险变化')
    expect(html).toContain('关键驱动')
    expect(html).toContain('当前诊断已作为后续对比基线。')
    expect(html).toContain('趋势洞察')
    expect(html).toContain('最近 3 次诊断综合分持续走强')
    expect(html).toContain('评级变化 2 次')
    expect(html).toContain('组合风险')
    expect(html).toContain('行业暴露')
    expect(html).toContain('汽车整车 · 权重 33.33%')
    expect(html).toContain('风险贡献')
    expect(html).toContain('<strong>比亚迪</strong>')
    expect(html).toContain('002594 · 汽车整车 · 权重 33.33% · 风险分 58 · 贡献 14')
    expect(html).toContain('再平衡建议')
    expect(html).toContain('降权 · 当前 33.33% · 建议 23.33% · 调整 -10%')
    expect(html).toContain('策略回测')
    expect(html).toContain('历史K线')
    expect(html).toContain('历史样本')
    expect(html).toContain('30 根')
    expect(html).toContain('最后交易日')
    expect(html).toContain('2026-06-30')
    expect(html).toContain('成本口径')
    expect(html).toContain('手续费')
    expect(html).toContain('5 bps')
    expect(html).toContain('滑点')
    expect(html).toContain('10 bps')
    expect(html).toContain('单笔成本')
    expect(html).toContain('0.3%')
    expect(html).toContain('参数口径')
    expect(html).toContain('样本数量')
    expect(html).toContain('8')
    expect(html).toContain('周期对比')
    expect(html).toContain('周期推荐依据')
    expect(html).toContain('推荐 10 日，因为收益回撤比 1.86')
    expect(html).toContain('10 日 · 推荐')
    expect(html).toContain('交易 2 · 胜率 100%')
    expect(html).toContain('策略横向对比')
    expect(html).toContain('策略推荐依据')
    expect(html).toContain('推荐 强势关注，因为收益回撤比 0.59')
    expect(html).toContain('强势关注')
    expect(html).toContain('低估值观察')
    expect(html).toContain('资金承压')
    expect(html).toContain('收益回撤比')
    expect(html).toContain('0.59')
    expect(html).toContain('收益分布')
    expect(html).toContain('胜 1 / 负 1 / 平 0')
    expect(html).toContain('<span>中位</span><strong>+1.25%</strong>')
    expect(html).toContain('P25 -0.90% · P75 +3.40%')
    expect(html).toContain('权益曲线')
    expect(html).toContain('路径最大回撤')
    expect(html).toContain('宁德时代')
    expect(html).toContain('稳定性')
    expect(html).toContain('收益波动')
    expect(html).toContain('最长连续亏损')
    expect(html).toContain('最佳连续收益')
    expect(html).toContain('最差连续亏损')
    expect(html).toContain('稳定评分')
    expect(html).toContain('稳定等级')
    expect(html).toContain('稳定性说明')
    expect(html).toContain('收益波动较低')
    expect(html).toContain('样本可信度')
    expect(html).toContain('可信等级')
    expect(html).toContain('可信度说明')
    expect(html).toContain('行情口径更接近真实路径')
    expect(html).toContain('历史对比')
    expect(html).toContain('稳定评分变化')
    expect(html).toContain('最近回测')
    expect(html).toContain('回测复盘动作')
    expect(html).toContain('切换推荐持有周期复测')
    expect(html).toContain('当前 5 日 / 推荐 10 日')
    expect(html).toContain('净收益')
    expect(html).toContain('毛收益')
    expect(html).toContain('缓存命中')
    expect(html).toContain('股票列表')
    expect(html).toContain('1/1 有效')
    expect(html).toContain('行情快照')
    expect(html).toContain('2/3 有效')
    expect(html).toContain('命中 8 / 未命中 2 · 命中率 80.0%')
    expect(html).toContain('历史行情')
    expect(html).toContain('0/1 有效')
    expect(html).toContain('复盘行动')
    expect(html).toContain('待处理')
    expect(html).toContain('主力资金流出')
    expect(html).toContain('验证论证假设 1')
    expect(html).toContain('论证验证')
    expect(html).toContain('数据可信度')
    expect(anchor.download).toBe(`stock-doctor-report-600519-${new Date().toISOString().slice(0, 10)}.html`)
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stock-doctor-html-report')
  })

  it('exports a readable Markdown research report from the current v2 payload', async () => {
    const NativeBlob = Blob
    let reportBlobParts: BlobPart[] = []
    let reportBlobOptions: BlobPropertyBag | undefined
    vi.stubGlobal('Blob', vi.fn(function (parts?: BlobPart[], options?: BlobPropertyBag) {
      reportBlobParts = parts ?? []
      reportBlobOptions = options
      return new NativeBlob(parts, options)
    }))
    const createObjectURL = vi.fn(() => 'blob:stock-doctor-md-report')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const anchor = Document.prototype.createElement.call(document, 'a') as HTMLAnchorElement
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'a') return anchor as unknown as HTMLAnchorElement
      return Document.prototype.createElement.call(document, tagName, options)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('强势关注')).toBeInTheDocument())

    const toolbar = await waitFor(() => {
      const node = document.querySelector('.topbar .toolbar') as HTMLElement | null
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    fireEvent.click(within(toolbar).getByRole('button', { name: '导出MD' }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    const markdown = String(reportBlobParts[0])
    expect(reportBlobOptions?.type).toBe('text/markdown')
    expect(markdown).toContain('# 贵州茅台 研究报告')
    expect(markdown).toContain('## 诊断变化')
    expect(markdown).toContain('趋势洞察')
    expect(markdown).toContain('最近 3 次诊断综合分持续走强')
    expect(markdown).toContain('## 组合风险')
    expect(markdown).toContain('再平衡建议')
    expect(markdown).toContain('## 策略回测')
    expect(markdown).toContain('历史对比')
    expect(markdown).toContain('### 回测复盘动作')
    expect(markdown).toContain('切换推荐持有周期复测')
    expect(markdown).toContain('## 数据可信度')
    expect(markdown).toContain('缓存桶')
    expect(anchor.download).toBe(`stock-doctor-report-600519-${new Date().toISOString().slice(0, 10)}.md`)
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stock-doctor-md-report')
  })

  it('disables the topbar watchlist button while the selected stock is updating', async () => {
    render(<App />)

    const toolbar = await waitFor(() => {
      const node = document.querySelector('.topbar .toolbar') as HTMLElement | null
      expect(node).not.toBeNull()
      return node as HTMLElement
    })
    const watchButton = within(toolbar).getByRole('button', { name: '已自选' })
    const nextWatchlist = stocks.filter((stock) => stock.symbol !== '600519')
    let resolveUpdate: () => void = () => {
      throw new Error('watchlist resolver was not initialized')
    }
    const updateRequest = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/watchlist/600519') && options?.method === 'DELETE') {
        return updateRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(nextWatchlist),
        } as Response))
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(watchButton)

    expect(watchButton).toBeDisabled()
    expect(watchButton).toHaveTextContent('更新中')

    resolveUpdate()

    await waitFor(() => expect(within(toolbar).getByRole('button', { name: '加自选' })).toBeEnabled())
    expect(fetch).toHaveBeenCalledWith('/api/v1/watchlist/600519', { method: 'DELETE' })
  })

  it('disables a search result add button while that stock is being added to the watchlist', async () => {
    render(<App />)

    const searchResults = await waitFor(() => {
      const block = document.querySelector('.search-results-block') as HTMLElement | null
      expect(block).not.toBeNull()
      return block as HTMLElement
    })
    const addButton = within(searchResults).getByLabelText('加入自选 平安银行')
    const nextWatchlist = [stocks[0], { ...stocks[1], name: '平安银行已加入' }]
    let resolveAdd: () => void = () => {
      throw new Error('search watchlist resolver was not initialized')
    }
    const addRequest = new Promise<void>((resolve) => {
      resolveAdd = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/watchlist') && options?.method === 'POST') {
        return addRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(nextWatchlist),
        } as Response))
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(addButton)

    expect(addButton).toBeDisabled()
    expect(within(searchResults).getByLabelText('加入中 平安银行')).toBeDisabled()

    resolveAdd()

    await waitFor(() => {
      const watchlistBlock = document.querySelector('.watchlist-block') as HTMLElement | null
      expect(watchlistBlock).not.toBeNull()
      expect(watchlistBlock).toHaveTextContent('平安银行已加入')
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/watchlist',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ symbol: '000001' }),
      }),
    )
  })

  it('protects note save and delete actions while requests are pending', async () => {
    render(<App />)

    const notesPanel = await waitFor(() => {
      const panel = document.querySelector('.notes-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const textarea = within(notesPanel).getByPlaceholderText('记录复盘、观察点或待验证假设')
    fireEvent.change(textarea, { target: { value: '新的复盘笔记' } })

    const savedNote = {
      id: 'n2',
      symbol: '600519',
      body: '新的复盘笔记',
      created_at: '2026-07-10T06:30:00Z',
    }
    let resolveSave: () => void = () => {
      throw new Error('note save resolver was not initialized')
    }
    let resolveDelete: () => void = () => {
      throw new Error('note delete resolver was not initialized')
    }
    const saveRequest = new Promise<void>((resolve) => {
      resolveSave = resolve
    })
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/notes') && options?.method === 'POST') {
        return saveRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(savedNote),
        } as Response))
      }
      if (target.includes('/notes/n1') && options?.method === 'DELETE') {
        return deleteRequest.then(() => ({ ok: true } as Response))
      }
      return defaultFetch(url, options)
    })

    const saveButton = within(notesPanel).getByRole('button', { name: '保存' })
    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveTextContent('保存中')

    resolveSave()

    await waitFor(() => expect(within(notesPanel).getByText('新的复盘笔记')).toBeInTheDocument())
    const noteRow = within(notesPanel).getByText('观察量能是否继续温和放大').closest('article')!
    const deleteButton = within(noteRow).getByLabelText('删除研究笔记')
    fireEvent.click(deleteButton)

    expect(deleteButton).toBeDisabled()
    expect(within(notesPanel).getByLabelText('删除中研究笔记')).toBeDisabled()

    resolveDelete()

    await waitFor(() => expect(within(notesPanel).queryByText('观察量能是否继续温和放大')).not.toBeInTheDocument())
  })

  it('protects price alert save and delete actions while requests are pending', async () => {
    render(<App />)

    const alertsPanel = await waitFor(() => {
      const panel = document.querySelector('.price-alert-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const input = within(alertsPanel).getByPlaceholderText('自定义价位')
    fireEvent.change(input, { target: { value: '1490' } })

    const savedAlert = {
      ...priceAlerts[0],
      id: 'pa2',
      target_price: 1490,
      label: '自定义价位',
      status: 'active',
    }
    let resolveSave: () => void = () => {
      throw new Error('price alert save resolver was not initialized')
    }
    let resolveDelete: () => void = () => {
      throw new Error('price alert delete resolver was not initialized')
    }
    const saveRequest = new Promise<void>((resolve) => {
      resolveSave = resolve
    })
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/price-alerts') && options?.method === 'POST') {
        return saveRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(savedAlert),
        } as Response))
      }
      if (target.includes('/price-alerts/pa1') && options?.method === 'DELETE') {
        return deleteRequest.then(() => ({ ok: true } as Response))
      }
      return defaultFetch(url, options)
    })

    const saveButton = within(alertsPanel).getByRole('button', { name: '保存' })
    fireEvent.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveTextContent('保存中')
    expect(within(alertsPanel).getByRole('button', { name: /风控/ })).toBeDisabled()

    resolveSave()

    await waitFor(() => expect(within(alertsPanel).getByText('自定义价位')).toBeInTheDocument())
    const alertRow = within(alertsPanel).getByText('突破观察').closest('article')!
    const deleteButton = within(alertRow).getByLabelText('删除价位提醒')
    fireEvent.click(deleteButton)

    expect(deleteButton).toBeDisabled()
    expect(within(alertsPanel).getByLabelText('删除中价位提醒')).toBeDisabled()

    resolveDelete()

    await waitFor(() => expect(within(alertsPanel).queryByText('突破观察')).not.toBeInTheDocument())
  })

  it('protects storage export, preview, and import actions while requests are pending', async () => {
    const createObjectURL = vi.fn(() => 'blob:stock-doctor-state')
    const revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))

    render(<App />)

    const storagePanel = await waitFor(() => {
      const panel = document.querySelector('.storage-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const exportSnapshot = {
      exported_at: '2026-07-10T07:00:00Z',
      backend: 'json',
      watchlist: ['600519'],
      reports,
      notes,
      price_alerts: priceAlerts,
      review_action_statuses: [],
    }
    const preview = {
      mode: 'merge',
      can_import: true,
      collections: storageStatus.collections,
      total_records: 6,
      warnings: [],
      skipped_records: 0,
    }
    const importResult = {
      ...preview,
      imported_at: '2026-07-10T07:05:00Z',
      status: 'imported',
      storage: { ...storageStatus, total_records: 7 },
    }
    let resolveExport: () => void = () => {
      throw new Error('storage export resolver was not initialized')
    }
    let resolvePreview: () => void = () => {
      throw new Error('storage preview resolver was not initialized')
    }
    let resolveImport: () => void = () => {
      throw new Error('storage import resolver was not initialized')
    }
    const exportRequest = new Promise<void>((resolve) => {
      resolveExport = resolve
    })
    const previewRequest = new Promise<void>((resolve) => {
      resolvePreview = resolve
    })
    const importRequest = new Promise<void>((resolve) => {
      resolveImport = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/system/export')) {
        return exportRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(exportSnapshot),
        } as Response))
      }
      if (target.includes('/system/import/preview') && options?.method === 'POST') {
        return previewRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(preview),
        } as Response))
      }
      if (target.includes('/system/import') && options?.method === 'POST') {
        return importRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(importResult),
        } as Response))
      }
      return defaultFetch(url, options)
    })

    const exportButton = within(storagePanel).getByRole('button', { name: '导出' })
    fireEvent.click(exportButton)

    expect(exportButton).toBeDisabled()
    expect(exportButton).toHaveTextContent('导出中')

    resolveExport()

    await waitFor(() => expect(exportButton).toHaveTextContent('导出'))
    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stock-doctor-state')

    const importInput = within(storagePanel).getByLabelText('预检')
    const file = new File([JSON.stringify(exportSnapshot)], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(JSON.stringify(exportSnapshot)),
    })
    fireEvent.change(importInput, { target: { files: [file] } })

    await waitFor(() => expect(within(storagePanel).getByLabelText('预检中')).toBeDisabled())

    resolvePreview()

    await waitFor(() => expect(within(storagePanel).getByText('backup.json')).toBeInTheDocument())
    const importButton = within(storagePanel).getByRole('button', { name: '导入' })
    fireEvent.click(importButton)

    expect(importButton).toBeDisabled()
    expect(importButton).toHaveTextContent('导入中')

    resolveImport()

    await waitFor(() => expect(within(storagePanel).queryByText('backup.json')).not.toBeInTheDocument())
  })

  it('shows local failure feedback when note save fails and keeps the draft', async () => {
    render(<App />)

    const notesPanel = await waitFor(() => {
      const panel = document.querySelector('.notes-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const textarea = within(notesPanel).getByPlaceholderText('记录复盘、观察点或待验证假设')
    fireEvent.change(textarea, { target: { value: '失败后仍保留的笔记' } })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/notes') && options?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) } as Response)
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(within(notesPanel).getByRole('button', { name: '保存' }))

    await waitFor(() => expect(within(notesPanel).getByText('研究笔记操作失败')).toBeInTheDocument())
    expect(within(notesPanel).getByText('保存笔记失败：503')).toBeInTheDocument()
    expect(within(notesPanel).getByText('草稿和已有笔记已保留，请稍后重试。')).toBeInTheDocument()
    expect(textarea).toHaveValue('失败后仍保留的笔记')
  })

  it('shows local failure feedback when a price alert delete fails and keeps the alert', async () => {
    render(<App />)

    const alertsPanel = await waitFor(() => {
      const panel = document.querySelector('.price-alert-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const alertRow = within(alertsPanel).getByText('突破观察').closest('article')!

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/price-alerts/pa1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: false, status: 504, json: () => Promise.resolve({}) } as Response)
      }
      return defaultFetch(url, options)
    })

    fireEvent.click(within(alertRow).getByLabelText('删除价位提醒'))

    await waitFor(() => expect(within(alertsPanel).getByText('价位提醒操作失败')).toBeInTheDocument())
    expect(within(alertsPanel).getByText('删除价位提醒失败：504')).toBeInTheDocument()
    expect(within(alertsPanel).getByText('输入内容和已有提醒已保留，请稍后重试。')).toBeInTheDocument()
    expect(within(alertsPanel).getByText('突破观察')).toBeInTheDocument()
  })

  it('shows local failure feedback for import preview and apply failures', async () => {
    render(<App />)

    const storagePanel = await waitFor(() => {
      const panel = document.querySelector('.storage-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const exportSnapshot = {
      exported_at: '2026-07-10T07:00:00Z',
      backend: 'json',
      watchlist: ['600519'],
      reports,
      notes,
      price_alerts: priceAlerts,
      review_action_statuses: [],
    }
    const preview = {
      mode: 'merge',
      can_import: true,
      collections: storageStatus.collections,
      total_records: 6,
      warnings: [],
      skipped_records: 0,
    }
    let previewShouldFail = true

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/system/import/preview') && options?.method === 'POST') {
        if (previewShouldFail) {
          return Promise.resolve({ ok: false, status: 422, json: () => Promise.resolve({}) } as Response)
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(preview) } as Response)
      }
      if (target.includes('/system/import') && options?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response)
      }
      return defaultFetch(url, options)
    })

    const failedFile = new File([JSON.stringify(exportSnapshot)], 'bad-backup.json', { type: 'application/json' })
    Object.defineProperty(failedFile, 'text', {
      value: () => Promise.resolve(JSON.stringify(exportSnapshot)),
    })
    fireEvent.change(within(storagePanel).getByLabelText('预检'), { target: { files: [failedFile] } })

    await waitFor(() => expect(within(storagePanel).getByText('系统存储操作失败')).toBeInTheDocument())
    expect(within(storagePanel).getByText('导入预检失败：422')).toBeInTheDocument()
    expect(within(storagePanel).getByText('当前本地数据和导入状态已保留，请检查备份文件后重试。')).toBeInTheDocument()

    previewShouldFail = false
    const goodFile = new File([JSON.stringify(exportSnapshot)], 'good-backup.json', { type: 'application/json' })
    Object.defineProperty(goodFile, 'text', {
      value: () => Promise.resolve(JSON.stringify(exportSnapshot)),
    })
    fireEvent.change(within(storagePanel).getByLabelText('预检'), { target: { files: [goodFile] } })

    await waitFor(() => expect(within(storagePanel).getByText('good-backup.json')).toBeInTheDocument())
    expect(within(storagePanel).queryByText('导入预检失败：422')).not.toBeInTheDocument()

    fireEvent.click(within(storagePanel).getByRole('button', { name: '导入' }))

    await waitFor(() => expect(within(storagePanel).getByText('数据导入失败：500')).toBeInTheDocument())
    expect(within(storagePanel).getByText('good-backup.json')).toBeInTheDocument()
  })

  it('disables a review action row while its status is updating', async () => {
    render(<App />)

    const reviewPanel = await waitFor(() => {
      const panel = document.querySelector('.review-actions-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const actionRow = within(reviewPanel).getByText('主力资金流出').closest('article')!
    const updatedReviewActions = {
      ...reviewActions,
      pending_count: 1,
      done_count: 1,
      items: reviewActions.items.map((item) => (
        item.id === 'alerts-资金-主力资金流出' ? { ...item, status: 'done' } : item
      )),
    }
    const updatedOverview = {
      ...reviewActionOverview,
      pending_count: 6,
      done_count: 1,
    }
    let resolveUpdate: () => void = () => {
      throw new Error('review action resolver was not initialized')
    }
    const updateRequest = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/review-actions/600519/alerts-%E8%B5%84%E9%87%91-%E4%B8%BB%E5%8A%9B%E8%B5%84%E9%87%91%E6%B5%81%E5%87%BA') && options?.method === 'PATCH') {
        return updateRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(updatedReviewActions),
        } as Response))
      }
      if (target.includes('/review-actions?')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(updatedOverview) } as Response)
      }
      return defaultFetch(url, options)
    })

    const doneButton = within(actionRow).getByRole('button', { name: '完成' })
    fireEvent.click(doneButton)

    expect(doneButton).toBeDisabled()
    expect(within(actionRow).getByText('更新中')).toBeInTheDocument()

    resolveUpdate()

    await waitFor(() => expect(within(actionRow).getByRole('button', { name: '完成' })).toHaveClass('selected'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/review-actions/600519/alerts-%E8%B5%84%E9%87%91-%E4%B8%BB%E5%8A%9B%E8%B5%84%E9%87%91%E6%B5%81%E5%87%BA?horizon=swing',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
    )
  })

  it('disables a hotspot action row while its status is updating', async () => {
    render(<App />)

    const hotspotPanel = await waitFor(() => {
      const panel = document.querySelector('.hotspot-review-panel') as HTMLElement | null
      expect(panel).not.toBeNull()
      return panel as HTMLElement
    })
    const actionRow = within(hotspotPanel).getByText('盘中复核 比亚迪 热点承接').closest('article')!
    const updatedPlan = {
      ...hotspotReviewPlan,
      pending_count: 0,
      done_count: 1,
      actions: hotspotReviewPlan.actions.map((item) => (
        item.id === 'hotspot-002594-新能源汽车' ? { ...item, status: 'done' } : item
      )),
    }
    let resolveUpdate: () => void = () => {
      throw new Error('hotspot action resolver was not initialized')
    }
    const updateRequest = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })

    const defaultFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation((url: string | URL | Request, options?: RequestInit) => {
      const target = String(url)
      if (target.includes('/hotspots/review-actions/hotspot-002594-%E6%96%B0%E8%83%BD%E6%BA%90%E6%B1%BD%E8%BD%A6') && options?.method === 'PATCH') {
        return updateRequest.then(() => ({
          ok: true,
          json: () => Promise.resolve(updatedPlan),
        } as Response))
      }
      return defaultFetch(url, options)
    })

    const doneButton = within(actionRow).getByRole('button', { name: '完成' })
    fireEvent.click(doneButton)

    expect(doneButton).toBeDisabled()
    expect(within(actionRow).getByText('更新中')).toBeInTheDocument()

    resolveUpdate()

    await waitFor(() => expect(within(actionRow).getByRole('button', { name: '完成' })).toHaveClass('selected'))
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/hotspots/review-actions/hotspot-002594-%E6%96%B0%E8%83%BD%E6%BA%90%E6%B1%BD%E8%BD%A6?horizon=swing&mode=balanced',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      }),
    )
  })
})
