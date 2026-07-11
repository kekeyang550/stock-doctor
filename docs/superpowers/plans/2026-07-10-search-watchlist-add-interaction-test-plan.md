# Search Watchlist Add Interaction Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate add-to-watchlist requests from the same search result row while the request is in flight.

**Architecture:** Keep the currently adding search-result symbol in `App.tsx`, pass it to `StockList`, and let `StockList` disable only the matching search result add button. No backend changes are needed.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing FastAPI watchlist API.

## Global Constraints

- Keep all files inside `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor`.
- Use TDD: add the failing frontend interaction test before production code.
- Do not change backend API behavior.
- This source directory is not a full Git worktree, so record verification in `项目说明.md` instead of committing.

---

### Task 1: Add Search Result Add-To-Watchlist In-Flight State

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/StockList.tsx`
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Consumes: `addWatchlistSymbol(symbol: string): Promise<StockSummary[]>`
- Produces: `addingWatchlistSymbol: string | null` prop on `StockList`

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/App.test.tsx` after the topbar watchlist interaction test:

```tsx
it('disables a search result add button while that stock is being added to the watchlist', async () => {
  render(<App />)

  const searchResults = await screen.findByText('搜索结果').then((node) => node.closest('div')!)
  const addButton = within(searchResults).getByLabelText('加入自选 平安银行')
  const nextWatchlist = [...stocks]
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

  await waitFor(() => expect(screen.getByText('自选股').closest('div')!).toHaveTextContent('平安银行'))
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/watchlist',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ symbol: '000001' }),
    }),
  )
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: the new test fails because the search result add button is not disabled and does not expose “加入中 平安银行”.

- [ ] **Step 3: Implement minimal production code**

In `frontend/src/App.tsx`, add state:

```tsx
const [addingSearchWatchlistSymbol, setAddingSearchWatchlistSymbol] = useState<string | null>(null)
```

In `addSearchResultToWatchlist`:

```tsx
setAddingSearchWatchlistSymbol(symbol)
try {
  const nextWatchlist = await addWatchlistSymbol(symbol)
  setWatchlist(nextWatchlist)
} catch (err) {
  setError(err instanceof Error ? err.message : '自选股更新失败')
} finally {
  setAddingSearchWatchlistSymbol(null)
}
```

Pass to `StockList`:

```tsx
<StockList
  ...
  addingWatchlistSymbol={addingSearchWatchlistSymbol}
/>
```

In `frontend/src/components/StockList.tsx`, add the prop and use it:

```tsx
addingWatchlistSymbol: string | null
```

For the search add button:

```tsx
const adding = stock.symbol === addingWatchlistSymbol
```

```tsx
disabled={adding}
title={adding ? '加入中' : '加入自选'}
aria-label={`${adding ? '加入中' : '加入自选'} ${stock.name}`}
```

- [ ] **Step 4: Run focused frontend test**

Run:

```powershell
npm test -- --run src/App.test.tsx
```

Expected: all tests in `App.test.tsx` pass.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm test -- --run
npm run build
```

Then:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\backend
$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-search-watchlist-add-interaction.json'
.\.venv\Scripts\python.exe -m pytest
```

Expected: frontend tests pass, frontend build succeeds, backend pytest passes with only the existing upstream deprecation warning.

- [ ] **Step 6: Update project notes**

Append a section to `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md` with the changed files, design doc, plan doc, and actual verification output.
