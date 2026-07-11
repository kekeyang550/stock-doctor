export function formatReportTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function formatDelta(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

export function formatSignedNumber(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}`
}
