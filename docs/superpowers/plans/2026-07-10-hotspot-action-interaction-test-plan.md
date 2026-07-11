# Hotspot Action Interaction Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate status updates on the same hotspot review action while its PATCH request is in flight.

**Architecture:** Reuse the existing review-action row-level protection pattern. Keep state in `App.tsx`, pass the currently updating hotspot action id into `HotspotReviewActionsPanel`, and let each row disable only its own status buttons.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing FastAPI backend contracts.

## Global Constraints

- Keep all files inside `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor`.
- Use TDD: add the failing frontend interaction test before production code.
- Do not change backend API behavior.
- This source directory is not a full Git worktree, so record verification in `项目说明.md` instead of committing.

---

### Task 1: Add Hotspot Action In-Flight State

**Files:**
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/hotspots/HotspotPanels.tsx`
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Consumes: `updateHotspotReviewActionStatus(horizon, mode, actionId, status): Promise<HotspotReviewPlan>`
- Produces: `updatingHotspotActionId: string | null` prop on `HotspotReviewActionsPanel`

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/App.test.tsx` after the existing review-action interaction test:

```tsx
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
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run src/App.test.tsx
```

Expected: the new test fails because the hotspot action status button is not disabled and “更新中” is absent.

- [ ] **Step 3: Implement minimal production code**

In `frontend/src/App.tsx`:

```tsx
const [updatingHotspotActionId, setUpdatingHotspotActionId] = useState<string | null>(null)
```

In `setHotspotActionStatus`:

```tsx
setUpdatingHotspotActionId(actionId)
try {
  const nextPlan = await updateHotspotReviewActionStatus(horizon, hotspotMode, actionId, status)
  setHotspotReviewPlan(nextPlan)
} catch (err) {
  setError(err instanceof Error ? err.message : '热点动作状态更新失败')
} finally {
  setUpdatingHotspotActionId(null)
}
```

Pass the prop:

```tsx
<HotspotReviewActionsPanel
  plan={hotspotReviewPlan}
  updatingActionId={updatingHotspotActionId}
  onSelect={setSelectedSymbol}
  onStatusChange={setHotspotActionStatus}
/>
```

In `frontend/src/components/hotspots/HotspotPanels.tsx`, add `updatingActionId: string | null` to the props. For each row:

```tsx
const updating = item.id === updatingActionId
```

Render:

```tsx
<em>{updating ? '更新中' : priorityLabel(item.priority)}</em>
```

And disable row status buttons:

```tsx
disabled={updating}
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
$env:STOCK_DOCTOR_STATE_PATH = Join-Path $env:TEMP 'stock-doctor-test-state-final-hotspot-action-interaction.json'
.\.venv\Scripts\python.exe -m pytest
```

Expected: frontend tests pass, frontend build succeeds, backend pytest passes with only the existing upstream deprecation warning.

- [ ] **Step 6: Update project notes**

Append a section to `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`:

```md
## 2026-07-10 热点动作交互保护

- 已补充热点跟踪动作状态更新的行级交互保护。
- `App.tsx` 新增 `updatingHotspotActionId`，`HotspotReviewActionsPanel` 接收并禁用当前更新行动行。
- `frontend/src/App.test.tsx` 新增热点动作交互测试。
- 新增设计文档：`docs/superpowers/specs/2026-07-10-hotspot-action-interaction-design.md`。
- 新增实施计划：`docs/superpowers/plans/2026-07-10-hotspot-action-interaction-test-plan.md`。
- 验证结果：记录本轮实际命令输出。
```
