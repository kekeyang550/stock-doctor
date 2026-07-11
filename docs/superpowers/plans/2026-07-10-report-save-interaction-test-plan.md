# Report Save Interaction Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate report creation requests while the topbar “存报告” action is already saving.

**Architecture:** Keep a `savingReport` boolean in `App.tsx`, set it around `createReport`, and bind it directly to the existing topbar save button. No backend or component extraction changes are needed.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing FastAPI report API.

## Global Constraints

- Keep all files inside `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor`.
- Use TDD: add the failing frontend interaction test before production code.
- Do not change backend API behavior.
- This source directory is not a full Git worktree, so record verification in `项目说明.md` instead of committing.

---

### Task 1: Add Save Report In-Flight State

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Consumes: `createReport(symbol: string, horizon: string): Promise<ReportRecord>`
- Produces: `savingReport: boolean` state bound to the topbar save button

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/App.test.tsx` after the refresh interaction test:

```tsx
it('disables the save report button while a report is being created', async () => {
  render(<App />)

  const saveButton = await screen.findByRole('button', { name: '存报告' })
  const createdReport = {
    id: 'r2',
    generated_at: '2026-07-10T09:00:00Z',
    diagnosis: {
      ...diagnosis,
      generated_at: '2026-07-10T09:00:00Z',
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

  await waitFor(() => expect(screen.getByRole('button', { name: '存报告' })).toBeEnabled())
  expect(screen.getByText(/09:00/)).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/reports',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ symbol: '600519', horizon: 'swing' }),
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

Expected: the new test fails because the save report button is not disabled and still shows “存报告”.

- [ ] **Step 3: Implement minimal production code**

In `frontend/src/App.tsx`, add state:

```tsx
const [savingReport, setSavingReport] = useState(false)
```

In `saveCurrentReport`:

```tsx
setSavingReport(true)
try {
  const report = await createReport(selectedSymbol, horizon)
  setReports((items) => [report, ...items.filter((item) => item.id !== report.id)].slice(0, 20))
} catch (err) {
  setError(err instanceof Error ? err.message : '报告保存失败')
} finally {
  setSavingReport(false)
}
```

In the topbar button:

```tsx
<button className="watch-button" type="button" onClick={saveCurrentReport} disabled={savingReport}>
  <Save size={16} />
  <span>{savingReport ? '保存中' : '存报告'}</span>
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
$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-report-save-interaction.json'
.\.venv\Scripts\python.exe -m pytest
```

Expected: frontend tests pass, frontend build succeeds, backend pytest passes with only the existing upstream deprecation warning.

- [ ] **Step 6: Update project notes**

Append a section to `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md` with the changed files, design doc, plan doc, and actual verification output.
