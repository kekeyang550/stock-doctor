import { Plus, Search } from 'lucide-react'
import type { StockSearchResult, StockSummary } from '../lib/types'

type StockListProps = {
  stocks: StockSummary[]
  searchResults: StockSearchResult[]
  watchlist: StockSummary[]
  selectedSymbol: string
  query: string
  onQueryChange: (query: string) => void
  onSelect: (symbol: string) => void
  onAddToWatchlist: (symbol: string) => void
}

export function StockList({
  stocks,
  searchResults,
  watchlist,
  selectedSymbol,
  query,
  onQueryChange,
  onSelect,
  onAddToWatchlist,
}: StockListProps) {
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
      <div className="search-results-block">
        <h2>搜索结果</h2>
        <div className="search-results">
          {searchResults.length ? (
            searchResults.map((stock) => (
              <article key={stock.symbol} className={stock.symbol === selectedSymbol ? 'search-result active' : 'search-result'}>
                <button type="button" onClick={() => onSelect(stock.symbol)}>
                  <strong>{stock.name}</strong>
                  <small>{stock.symbol} · {stock.industry} · {stock.match_reason}</small>
                  <span className={`search-quality ${stock.quality_status}`}>
                    {searchQualityLabel(stock)}
                  </span>
                </button>
                {stock.in_watchlist ? (
                  <em>已自选</em>
                ) : !stock.diagnosable ? (
                  <em>待接快照</em>
                ) : (
                  <button
                    type="button"
                    className="search-add"
                    onClick={() => onAddToWatchlist(stock.symbol)}
                    title="加入自选"
                    aria-label={`加入自选 ${stock.name}`}
                  >
                    <Plus size={15} />
                  </button>
                )}
              </article>
            ))
          ) : (
            <p>暂无匹配标的</p>
          )}
        </div>
      </div>
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
      <h2>全部股票</h2>
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

function searchQualityLabel(stock: StockSearchResult) {
  if (!stock.diagnosable) {
    return '待接快照'
  }
  if (stock.quality_status === 'pass') {
    return `质量可靠 ${stock.quality_score ?? '--'}`
  }
  if (stock.quality_status === 'warn') {
    return `需核验 ${stock.quality_score ?? '--'}`
  }
  if (stock.quality_status === 'fail') {
    return `质量缺口 ${stock.quality_score ?? '--'}`
  }
  return '质量未知'
}
