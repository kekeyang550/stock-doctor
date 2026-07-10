import { Search } from 'lucide-react'
import type { StockSummary } from '../lib/types'

type StockListProps = {
  stocks: StockSummary[]
  watchlist: StockSummary[]
  selectedSymbol: string
  query: string
  onQueryChange: (query: string) => void
  onSelect: (symbol: string) => void
}

export function StockList({ stocks, watchlist, selectedSymbol, query, onQueryChange, onSelect }: StockListProps) {
  const normalized = query.trim().toLowerCase()
  const filtered = stocks.filter((stock) => {
    return (
      stock.symbol.toLowerCase().includes(normalized) ||
      stock.name.toLowerCase().includes(normalized) ||
      stock.industry.toLowerCase().includes(normalized)
    )
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>A 股诊股</h1>
        <span>研究版 MVP</span>
      </div>
      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="代码 / 名称 / 行业" />
      </label>
      <div className="watchlist-block">
        <h2>自选股</h2>
        <div className="watchlist-chips">
          {watchlist.map((stock) => (
            <button
              type="button"
              key={stock.symbol}
              className={stock.symbol === selectedSymbol ? 'chip active' : 'chip'}
              onClick={() => onSelect(stock.symbol)}
            >
              {stock.name}
            </button>
          ))}
        </div>
      </div>
      <div className="stock-list" aria-label="股票列表">
        {filtered.map((stock) => (
          <button
            type="button"
            key={stock.symbol}
            className={stock.symbol === selectedSymbol ? 'stock-row active' : 'stock-row'}
            onClick={() => onSelect(stock.symbol)}
          >
            <span>
              <strong>{stock.name}</strong>
              <small>{stock.symbol} · {stock.industry}</small>
            </span>
            <em className={stock.change_pct >= 0 ? 'up' : 'down'}>
              {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
            </em>
          </button>
        ))}
      </div>
    </aside>
  )
}
