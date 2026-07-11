# 顶部自选按钮交互保护设计

## 背景

顶部工具栏的“加自选 / 已自选”按钮会调用自选股 add/remove 接口。当前按钮没有请求中的状态，连续点击可能发起重复加入或移出请求，造成状态闪烁和用户误判。

## 目标

给顶部自选按钮增加请求中保护：自选股更新请求未完成前禁用按钮，并显示“更新中”；请求完成后恢复为“加自选”或“已自选”。

## 方案

采用单一局部状态方案。

- 在 `App.tsx` 新增 `updatingWatchlist: boolean`。
- `toggleWatchlist` 发起 `addWatchlistSymbol` 或 `removeWatchlistSymbol` 前设置为 `true`，在 `finally` 中恢复为 `false`。
- 顶部自选按钮根据 `updatingWatchlist`：
  - 设置 `disabled`。
  - 文案从“加自选 / 已自选”切换为“更新中”。
- 成功后继续使用现有逻辑，用接口返回值刷新 `watchlist`。
- 失败后继续使用现有 `setError` 流程。

## 不做范围

- 不改搜索结果里的“加入自选”按钮。
- 不改后端自选接口。
- 不新增批量自选管理。
- 不锁定股票列表、周期切换或报告保存按钮。

## 验证

- 新增前端测试，用未完成的 `DELETE /api/v1/watchlist/600519` Promise 模拟移出自选中状态。
- 断言点击后按钮禁用、显示“更新中”。
- Promise 返回后断言按钮恢复为“加自选”，并验证 DELETE URL。
- 跑前端全量测试、前端构建、后端 pytest。
