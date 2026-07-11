# 行情 Provider 缓存 TTL 设计

## 背景

系统已经通过 `/api/v1/system/data-connectors` 暴露 `data_cache_ttl_seconds`，前端“数据可信度”面板也展示了缓存 TTL。但 AKShare provider 的内存缓存仍是进程生命周期内永久有效，配置只影响可视化，不影响实际数据读取。

## 目标

- 让 `STOCK_DOCTOR_DATA_CACHE_TTL_SECONDS` 真正控制 AKShare provider 的内存缓存。
- 覆盖股票列表、远端快照和历史行情三类行情数据。
- 保持 mock provider 行为不变。
- 不引入外部缓存依赖，继续使用进程内缓存。

## 非目标

- 不做跨进程持久化缓存。
- 不改变行情归一化算法。
- 不改变刷新任务状态存储结构。

## 方案

`AkshareMarketDataProvider` 增加 TTL 缓存条目：

- 股票列表缓存：`(created_at, list[StockSummary])`
- 快照缓存：`dict[symbol, (created_at, StockSnapshot)]`
- 历史行情原始行缓存：`dict[symbol, (created_at, list[dict])]`

Provider 默认读取 `settings.data_cache_ttl_seconds`，测试可通过构造参数注入 `cache_ttl_seconds` 和 `clock`。

缓存判断：

- `ttl <= 0` 时视为禁用缓存。
- `now - created_at <= ttl` 时命中缓存。
- 超过 TTL 后重新调用 AKShare 端点，成功结果覆盖缓存。

## 用户价值

- 数据可信度面板展示的缓存 TTL 与真实后端行为一致。
- 真实行情试运行时能降低重复请求，同时避免长期使用陈旧行情。
- 后续可在同一结构上继续扩展缓存命中统计。
