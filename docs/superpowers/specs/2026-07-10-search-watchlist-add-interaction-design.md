# 搜索结果加入自选交互保护设计

## 背景

搜索结果列表中，未加入自选且可诊断的股票会显示“加入自选”按钮。当前按钮没有请求中的状态，用户连续点击同一个搜索结果时可能重复发送 `POST /api/v1/watchlist`。

## 目标

给搜索结果的“加入自选”按钮增加行级请求中保护：某个搜索结果正在加入自选时，仅禁用该股票对应按钮，并提供“加入中”的可访问名称。

## 方案

采用行级状态方案。

- 在 `App.tsx` 新增 `addingSearchWatchlistSymbol: string | null`。
- `addSearchResultToWatchlist(symbol)` 调用 `addWatchlistSymbol(symbol)` 前设置该 symbol，在 `finally` 中清空。
- `StockList` 新增 `addingWatchlistSymbol` prop。
- 搜索结果渲染时，若 `stock.symbol === addingWatchlistSymbol`：
  - 禁用该行的加号按钮。
  - `aria-label` 从 `加入自选 {name}` 切换为 `加入中 {name}`。
  - `title` 从“加入自选”切换为“加入中”。
- 其它搜索结果行仍可操作。

## 不做范围

- 不改顶部“加自选 / 已自选”按钮，它已有独立保护。
- 不改后端自选接口。
- 不刷新搜索结果中的 `in_watchlist` 字段，继续沿用现有自选列表刷新行为。
- 不新增 toast 或全局加载遮罩。

## 验证

- 新增前端测试，用未完成的 `POST /api/v1/watchlist` Promise 模拟加入中状态。
- 断言点击“加入自选 平安银行”后，该按钮禁用并变为“加入中 平安银行”。
- Promise 返回后断言自选股 chips 出现“平安银行”，并验证 POST body。
- 跑前端全量测试、前端构建、后端 pytest。
