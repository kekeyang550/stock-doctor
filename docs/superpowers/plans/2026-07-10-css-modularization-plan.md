# 前端 CSS 模块化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单个 `frontend/src/styles.css` 拆成按业务边界组织的 CSS 文件，同时保持现有 UI 和交互不变。

**Architecture:** 保留 `frontend/src/styles.css` 作为唯一入口文件，内部通过 `@import` 引入 `frontend/src/styles/*.css`。按照已完成的组件目录边界拆分样式：base、layout、diagnosis、research、screeners、system、hotspots。

**Tech Stack:** React/Vite 前端，普通 CSS，Vitest smoke test，Vite production build。

## Global Constraints

- 不改组件类名。
- 不改视觉设计。
- 不引入 CSS modules、Sass 或新依赖。
- 不删除现有样式规则，只移动到更小文件。
- 当前项目不是 Git 工作树，无法提交 commit。

---

### Task 1: 建立 CSS 入口和分组文件

**Files:**
- Modify: `frontend/src/styles.css`
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/layout.css`
- Create: `frontend/src/styles/diagnosis.css`
- Create: `frontend/src/styles/research.css`
- Create: `frontend/src/styles/screeners.css`
- Create: `frontend/src/styles/system.css`
- Create: `frontend/src/styles/hotspots.css`

**Interfaces:**
- Consumes: `frontend/src/main.tsx` existing `import './styles.css'`
- Produces: `styles.css` manifest that imports all split files in order

- [ ] **Step 1: Capture baseline**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: PASS before moving CSS.

- [ ] **Step 2: Split CSS mechanically**

Move existing CSS rules into group files. Keep import order:

```css
@import './styles/base.css';
@import './styles/layout.css';
@import './styles/diagnosis.css';
@import './styles/research.css';
@import './styles/screeners.css';
@import './styles/system.css';
@import './styles/hotspots.css';
```

- [ ] **Step 3: Run frontend test**

Run: `cd frontend; npm test -- --run src/App.test.tsx`

Expected: PASS.

- [ ] **Step 4: Run frontend build**

Run: `cd frontend; npm run build`

Expected: PASS.

### Task 2: Browser verification and project note

**Files:**
- Modify: `项目说明.md`

- [ ] **Step 1: Restart local services**

Restart Vite dev server if needed and open `http://127.0.0.1:30080/`.

- [ ] **Step 2: Browser smoke check**

Verify the main dashboard still renders panels including “策略股票池”“数据连接器”“热点总览”。

- [ ] **Step 3: Update project note**

Record CSS modularization and verification results in `项目说明.md`.
