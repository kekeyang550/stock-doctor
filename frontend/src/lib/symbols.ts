export function normalizeAShareSymbol(value: unknown) {
  const text = String(value ?? '').trim().toUpperCase()
  const compact = text.replace(/\s+/g, '')
  const match = compact.match(/^(?:(SH|SZ|BJ)[.\-_\s]*)?(\d{6})(?:[.\-_\s]*(SH|SZ|BJ))?$/i)
  return match ? match[2] : text
}
