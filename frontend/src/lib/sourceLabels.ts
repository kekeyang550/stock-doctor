const sourceTokenLabels: Record<string, string> = {
  'fundamental-quote-detail': '东方财富估值详情',
  'sina-capital-flow': '新浪资金流兜底',
  'tencent-direct-search': '腾讯直接搜码',
  'tencent-quote-detail': '腾讯估值兜底',
  'tencent-quotes': '腾讯报价兜底',
  'tencent-index': '腾讯指数兜底',
  'tencent-kline': '腾讯 K 线兜底',
  'tdx-kline': '通达信本地 K 线',
  'tushare-daily-basic': 'Tushare 日行情基础指标',
  'tushare-fina-indicator': 'Tushare 财务指标',
  'tushare-stock-basic': 'Tushare 基础资料',
  'capital-flow': '资金流',
}

const conservativeTokenLabels: Record<string, string> = {
  'capital-flow': '资金流缺口',
  'fundamental-seed': '财务样例种子',
  'capital-seed': '资金样例种子',
  fundamental: '财务字段',
  technical: '技术指标',
  growth: '成长字段',
  northbound: '北向资金',
}

const connectorTokenLabels = {
  ...sourceTokenLabels,
  ...conservativeTokenLabels,
  'capital-flow': '资金流',
}

export function connectorTelemetry(message?: string) {
  const text = message ?? ''
  const conservativeText = text.match(/([^。]*)使用保守估算/)?.[1] ?? ''
  return {
    enabled: Object.entries(sourceTokenLabels)
      .filter(([token]) => text.includes(token))
      .map(([, label]) => label),
    conservative: Object.entries(conservativeTokenLabels)
      .filter(([token]) => conservativeText.includes(token))
      .map(([, label]) => label),
  }
}

export function humanizeConnectorMessage(message: string) {
  return Object.entries(connectorTokenLabels)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((text, [token, label]) => text.replaceAll(token, label), message)
}
