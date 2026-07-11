# Watchlist Toggle Interaction Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate topbar watchlist add/remove requests while the selected symbol is already being updated.

**Architecture:** Keep an `updatingWatchlist` boolean in `App.tsx`, set it around `toggleWatchlist`, and bind it directly to the existing topbar watchlist button. No backend or component extraction changes are needed.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing FastAPI watchlist API.

## Global Constraints

- Keep all files inside `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor`.
- Use TDD: add the failing frontend interaction test before production code.
- Do not change backend API behavior.
- This source directory is not a full Git worktree, so record verification in `项目说明.md` instead of committing.

---

### Task 1: Add Topbar Watchlist In-Flight State

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Consumes: `removeWatchlistSymbol(symbol: string): Promise<StockSummary[]>`
- Consumes: `addWatchlistSymbol(symbol: string): Promise<StockSummary[]>`
- Produces: `updatingWatchlist: boolean` state bound to the topbar watchlist button

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/App.test.tsx` after the report save interaction test:

```tsx
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
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: the new test fails because the topbar watchlist button is not disabled and still shows “已自选”.

- [ ] **Step 3: Implement minimal production code**

In `frontend/src/App.tsx`, add state:

```tsx
const [updatingWatchlist, setUpdatingWatchlist] = useState(false)
```

In `toggleWatchlist`:

```tsx
setUpdatingWatchlist(true)
try {
  const nextWatchlist = isInWatchlist
    ? await removeWatchlistSymbol(selectedSymbol)
    : await addWatchlistSymbol(selectedSymbol)
  setWatchlist(nextWatchlist)
} catch (err) {
  setError(err instanceof Error ? err.message : '自选股更新失败')
} finally {
  setUpdatingWatchlist(false)
}
```

In the topbar button:

```tsx
<button
  className={isInWatchlist ? 'watch-button active' : 'watch-button'}
  type="button"
  onClick={toggleWatchlist}
  disabled={updatingWatchlist}
>
  <Star size={16} />
  <span>{updatingWatchlist ? '更新中' : (isInWatchlist ? '已自选' : '加自选')}</span>
</button>
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
$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-watchlist-toggle-interaction.json'
.\.venv\Scripts\python.exe -m pytest
```

Expected: frontend tests pass, frontend build succeeds, backend pytest passes with only the existing upstream deprecation warning.

- [ ] **Step 6: Update project notes**

Append a section to `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md` with the changed files, design doc, plan doc, and actual verification output.
