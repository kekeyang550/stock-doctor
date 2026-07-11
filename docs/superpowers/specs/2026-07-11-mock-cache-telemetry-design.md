# Mock 数据源缓存遥测设计

## 背景

AKShare provider 已经暴露缓存桶和命中率遥测，但默认开发模式使用 Mock 数据源。用户打开本地页面时，数据可信度面板会显示“暂无遥测”，容易误以为功能没有生效。

## 目标

- Mock provider 也暴露基础缓存遥测。
- 默认本地页面能看到股票列表、行情快照、历史行情三类缓存桶。
- 保持 Mock provider deterministic，不引入 TTL 过期复杂度。

## 非目标

- 不改变 Mock 行情数据本身。
- 不给 Mock provider 增加真实 TTL 过期逻辑。
- 不改变 AKShare provider 行为。

## 方案

`MockMarketDataProvider` 新增进程内访问计数：

- `stock_list`
- `snapshots`
- `history`

每次调用 `list_stocks()`、`get_snapshot()`、`get_price_history()` 记录一次命中。因为 Mock 数据全部在内存中，`miss_count` 保持 0，`hit_rate_pct` 在访问后为 100。

`get_cache_status()` 返回三类缓存桶：

- 股票列表：1 个内存数据集
- 行情快照：当前 `_snapshots` 数量
- 历史行情：已访问过历史行情的 symbol 数量

## 用户价值

- 默认本地开发模式也能看到“缓存命中/命中率”。
- 用户无需切到 AKShare 就能理解数据可信度面板的遥测含义。
- 真实数据源和 Mock 数据源的 UI 口径统一。
