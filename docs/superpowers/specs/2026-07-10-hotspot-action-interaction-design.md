# 热点跟踪动作交互保护设计

## 背景

热点跟踪动作和个股复盘行动都支持状态切换。个股复盘行动已经具备行级“更新中”保护，热点跟踪动作仍可能在一次 PATCH 未返回前被重复点击，导致重复请求或状态闪烁。

## 目标

为热点跟踪动作补齐同样的行级交互保护：某条动作状态更新期间，只锁定当前动作行的状态按钮，并给用户明确的“更新中”反馈。

## 方案

采用局部状态方案，不抽象新通用组件。

- 在 `App.tsx` 新增 `updatingHotspotActionId: string | null`。
- 在 `setHotspotActionStatus` 调用 `updateHotspotReviewActionStatus(...)` 前设置当前 action id，成功或失败后清空。
- 将该状态传给 `HotspotReviewActionsPanel`。
- 面板渲染每条热点动作时，若 `item.id === updatingActionId`：
  - 当前行动行的状态按钮禁用。
  - 行内优先级标签位置显示“更新中”。
- 其它热点动作行仍可操作，保持行级而非全局锁定。

## 不做范围

- 不改后端接口。
- 不新增批量状态更新。
- 不重构复盘行动和热点动作的通用组件，避免超出当前交互修复范围。

## 验证

- 新增前端测试，构造未完成的 PATCH Promise，点击热点动作“完成”后断言按钮禁用且显示“更新中”。
- 释放 Promise 后断言按钮变为 selected，并验证 PATCH URL 和 body。
- 跑前端全量测试、前端构建、后端 pytest。
