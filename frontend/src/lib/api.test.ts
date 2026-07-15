import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPortfolioRisk, fetchTushareProbe } from './api'

function mockJsonResponse(payload: unknown = {}) {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response
}

describe('api symbol normalization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes portfolio weight and holding symbols before querying', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(mockJsonResponse(input)))
    vi.stubGlobal('fetch', fetchMock)

    await fetchPortfolioRisk(
      'swing',
      'watchlist',
      { SH600519: '80', '000001.SZ': 20, empty: '0' },
      '100000',
      { sz000001: { shares: '100', cost_price: '9.5' }, '600519-SH': { shares: 50, cost_price: 1518 } },
    )

    const url = String(fetchMock.mock.calls[0][0])
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('weights')).toBe('600519:80,000001:20')
    expect(params.get('holdings')).toBe('000001:100:9.5,600519:50:1518')
    expect(params.get('portfolio_value')).toBe('100000')
  })

  it('normalizes tushare probe symbols before querying', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => Promise.resolve(mockJsonResponse(input)))
    vi.stubGlobal('fetch', fetchMock)

    await fetchTushareProbe('SZ000001')

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/system/tushare-probe?symbol=000001')
  })
})
