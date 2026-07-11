# 前端工作台模块化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `frontend/src/App.tsx` 中已经成型的面板函数拆到业务组件目录，保持现有视觉和交互行为不变。

**Architecture:** 先做低风险搬迁，不重写状态管理、不重设计 UI、不改 API client。`App.tsx` 继续负责全局数据加载、状态和事件回调；面板组件迁到 `components/system`、`components/hotspots`、`components/screeners`、`components/research`、`components/diagnosis`，通过 props 接收数据和回调。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、lucide-react。

## Global Constraints

- 第一阶段先保持当前视觉和行为不变，不做整套视觉重设计。
- 继续使用 React `useState` 和 `useEffect`，不引入全局状态库。
- 共享 API 类型继续放在 `frontend/src/lib/types.ts`。
- 格式化 helper 尽量放到使用它们的面板附近；多处复用的 helper 放到共享文件。
- 当前源码目录不是 `.git` 工作树，执行计划时不能依赖 commit 成功。
- 每个任务完成后至少运行 `npm test -- --run` 或 `npm run build` 中的一个；阶段收尾运行两者。

---

## 文件结构

- Create: `frontend/src/components/system/SystemPanels.tsx`
  - 系统存储、就绪度、连接器、数据新鲜度、刷新记录。
- Create: `frontend/src/components/hotspots/HotspotPanels.tsx`
  - 热点总览、热点选股池、热点跟踪动作、行业热力、题材热榜、异动雷达。
- Create: `frontend/src/components/screeners/ScreenerPanels.tsx`
  - 自选股体检、行动总览、数据质量总览、机会排行、策略股票池、预警中心、跟踪时间线、风险敞口。
- Create: `frontend/src/components/research/ResearchPanels.tsx`
  - 研究笔记、价位提醒、报告历史。
- Create: `frontend/src/components/diagnosis/DiagnosisPanels.tsx`
  - 诊断工作区、走势、同业对比、诊断变化、复盘行动、数据质量、诊断论证、操作清单、关键价位、证据链、风险提示。
- Create: `frontend/src/lib/formatters.ts`
  - 多处复用的 `formatReportTime`、`formatShortDate`、`formatDelta`、`formatSignedNumber`。
- Modify: `frontend/src/App.tsx`
  - 删除已迁移的面板函数，改为从新组件文件导入；保留 state、effect、handler、页面布局。
- Test: `frontend/src/App.test.tsx`
  - 保持现有 render smoke test 通过。

---

### Task 1: 抽出共享格式化 helper

**Files:**
- Create: `frontend/src/lib/formatters.ts`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces:
  - `formatReportTime(value: string): string`
  - `formatShortDate(value: string): string`
  - `formatDelta(value: number): string`
  - `formatSignedNumber(value: number): string`
- Consumes later: all extracted panel components import these helpers from `../../lib/formatters` or `./lib/formatters` depending on path depth.

- [ ] **Step 1: Create shared formatter file**

Create `frontend/src/lib/formatters.ts`:

```ts
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
```

- [ ] **Step 2: Update App imports and remove duplicate helpers**

In `frontend/src/App.tsx`, import:

```ts
import { formatDelta, formatReportTime, formatShortDate, formatSignedNumber } from './lib/formatters'
```

Remove the local function definitions for `formatReportTime`, `formatShortDate`, `formatDelta`, and `formatSignedNumber`.

- [ ] **Step 3: Verify frontend still renders**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run
```

Expected: existing App test PASS.

---

### Task 2: Extract system panels

**Files:**
- Create: `frontend/src/components/system/SystemPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces exported components:
  - `SystemStoragePanel`
  - `SystemReadinessPanel`
  - `DataConnectorPanel`
  - `FreshnessPanel`
  - `RefreshJobList`
- Consumes types from `../../lib/types`.

- [ ] **Step 1: Move system panel code**

Move these functions unchanged from `App.tsx` into `frontend/src/components/system/SystemPanels.tsx` and export the top-level panels:

```ts
SystemStoragePanel
SystemReadinessPanel
DataConnectorPanel
FreshnessPanel
RefreshJobList
```

Move their local helper rows/labels with them:

```ts
ReadinessCheckRow
readinessStatusLabel
ConnectorRow
connectorStatusLabel
freshnessStatusLabel
```

Import needed icons from `lucide-react` and types from `../../lib/types`.

- [ ] **Step 2: Import system panels in App**

In `frontend/src/App.tsx`, add:

```ts
import {
  DataConnectorPanel,
  FreshnessPanel,
  RefreshJobList,
  SystemReadinessPanel,
  SystemStoragePanel,
} from './components/system/SystemPanels'
```

Remove the moved local function definitions.

- [ ] **Step 3: Verify frontend test**

Run:

```powershell
npm test -- --run
```

Expected: App test PASS and still finds headings `数据连接器`, `数据新鲜度`, `刷新记录`, `系统存储`, `系统就绪度`.

---

### Task 3: Extract hotspot panels

**Files:**
- Create: `frontend/src/components/hotspots/HotspotPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces exported components:
  - `HotspotBriefPanel`
  - `HotspotCandidatesPanel`
  - `HotspotReviewActionsPanel`
  - `IndustryHeatPanel`
  - `ConceptHeatPanel`
  - `MomentumSignalPanel`
- Consumes shared helpers `formatSignedNumber`, `hotspotStatusLabel` local to file, and types from `../../lib/types`.

- [ ] **Step 1: Move hotspot panel code**

Move these functions from `App.tsx` into `frontend/src/components/hotspots/HotspotPanels.tsx`:

```ts
HotspotBriefPanel
HotspotBriefMetric
HotspotCandidatesPanel
HotspotReviewActionsPanel
IndustryHeatPanel
ConceptHeatPanel
MomentumSignalPanel
hotspotStatusLabel
```

Import icons and types required by those functions. Import `formatSignedNumber` from `../../lib/formatters`.

- [ ] **Step 2: Import hotspot panels in App**

In `frontend/src/App.tsx`, add imports from `./components/hotspots/HotspotPanels` for the exported components and remove moved local definitions.

- [ ] **Step 3: Verify frontend test**

Run:

```powershell
npm test -- --run
```

Expected: App test PASS and still finds `热点总览`, `热点选股池`, `热点跟踪动作`, `行业热力`, `题材热榜`, `异动雷达`.

---

### Task 4: Extract screener and research panels

**Files:**
- Create: `frontend/src/components/screeners/ScreenerPanels.tsx`
- Create: `frontend/src/components/research/ResearchPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces screener exports:
  - `WatchlistSummaryPanel`
  - `ReviewActionOverviewPanel`
  - `DataQualityOverviewPanel`
  - `AlertCenter`
  - `RankingPanel`
  - `ScreenerPanel`
  - `TimelinePanel`
  - `RiskExposurePanel`
- Produces research exports:
  - `PriceAlertsPanel`
  - `ResearchNotesPanel`
  - `ReportHistory`

- [ ] **Step 1: Move screener panel code**

Move these functions and their helpers into `frontend/src/components/screeners/ScreenerPanels.tsx`:

```ts
WatchlistSummaryPanel
ReviewActionOverviewPanel
ActionOverviewRow
DataQualityOverviewPanel
SummaryMetric
TimelinePanel
timelineStatusLabel
AlertCenter
severityLabel
RankingPanel
ScreenerPanel
RiskExposurePanel
```

Import `formatShortDate` from `../../lib/formatters`.

- [ ] **Step 2: Move research panel code**

Move these functions and helpers into `frontend/src/components/research/ResearchPanels.tsx`:

```ts
PriceAlertsPanel
directionLabel
ResearchNotesPanel
ReportHistory
```

Import `formatReportTime` from `../../lib/formatters`.

- [ ] **Step 3: Import moved panels in App**

In `frontend/src/App.tsx`, import the screener and research exported components. Remove the moved local function definitions.

- [ ] **Step 4: Verify frontend test**

Run:

```powershell
npm test -- --run
```

Expected: App test PASS and still finds `报告历史`, `研究笔记`, `价位提醒`, `机会排行`, `策略股票池`, `预警中心`, `自选股体检`, `跟踪时间线`, `风险敞口`.

---

### Task 5: Extract diagnosis panels

**Files:**
- Create: `frontend/src/components/diagnosis/DiagnosisPanels.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Produces exported component:
  - `DiagnosisWorkspace`
- Internal helpers stay in the same file:
  - `ReviewActionsPanel`
  - `ActionStat`
  - `ReviewActionRow`
  - `ChecklistPanel`
  - `DataQualityPanel`
  - `DataQualityCheckRow`
  - `DiagnosisChangePanel`
  - `ChangeMetric`
  - `ChangeItemRow`
  - `ThesisPanel`
  - `PeerPanel`
  - `PeerRow`
  - `TrendPanel`
  - `Level`
  - `EvidenceRow`
  - label helpers and `buildSparklinePath`

- [ ] **Step 1: Move diagnosis workspace code**

Move `DiagnosisWorkspace` and all diagnosis-only helper functions into `frontend/src/components/diagnosis/DiagnosisPanels.tsx`.

Import:

```ts
import { BarChart3, CalendarClock, CheckCircle2, Database, FileText, ListChecks, ShieldAlert } from 'lucide-react'
import { ScoreGauge } from '../ScoreGauge'
import { formatDelta, formatReportTime } from '../../lib/formatters'
```

Import all required diagnosis-related types from `../../lib/types`.

- [ ] **Step 2: Import DiagnosisWorkspace in App**

In `frontend/src/App.tsx`, add:

```ts
import { DiagnosisWorkspace } from './components/diagnosis/DiagnosisPanels'
```

Remove the moved local function definitions.

- [ ] **Step 3: Verify frontend test**

Run:

```powershell
npm test -- --run
```

Expected: App test PASS and still finds `AI 诊断摘要`, `走势回放`, `操作清单`, `同业对比`, `诊断变化`, `复盘行动`, `数据质量`, `诊断论证`, `证据链`, `风险提示`.

---

### Task 6: Final frontend verification and project notes

**Files:**
- Modify: `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`

**Interfaces:**
- Verifies frontend modularization and records progress.

- [ ] **Step 1: Run frontend tests**

Run:

```powershell
cd C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\stock-doctor\frontend
npm test -- --run
```

Expected: App test PASS.

- [ ] **Step 2: Run frontend build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build PASS.

- [ ] **Step 3: Update project notes**

Append to `C:\Users\Administrator\Desktop\workspace\project_0010_stock-doctor\项目说明.md`:

```md
## 2026-07-10 前端模块化进展

- 第二阶段开始拆分 `frontend/src/App.tsx`：系统、热点、选股/跟踪、研究、诊断面板将迁移到 `frontend/src/components/*` 业务目录。
- 本阶段目标是保持当前 UI 和交互不变，先降低单文件维护成本。
```

- [ ] **Step 4: Check repository state**

Run:

```powershell
git status --short --branch
```

Expected in current zip workspace: command may report this is not a Git repository.
