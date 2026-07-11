# 缓存遥测面板设计

## 背景

数据可信度面板已经展示行情来源、刷新时间、fallback 状态和缓存 TTL。Provider 层也已经让 TTL 真正生效，但用户仍看不到当前缓存里到底有哪些数据、是否仍在有效期内。

## 目标

- 后端数据连接器健康接口暴露缓存状态摘要。
- 前端“数据可信度”面板展示股票列表、快照、历史行情三类缓存。
- 显示缓存条数、命中状态、最短剩余有效期，帮助判断数据是否来自热缓存。

## 非目标

- 不统计全生命周期 hit/miss 次数。
- 不持久化缓存遥测。
- 不新增独立接口。

## 方案

新增 schema：

- `ProviderCacheBucketStatus`
  - `key`
  - `label`
  - `entries`
  - `active_entries`
  - `expired_entries`
  - `nearest_expires_in_seconds`
  - `status`
- `ProviderCacheStatus`
  - `ttl_seconds`
  - `generated_at`
  - `buckets`

`AkshareMarketDataProvider.get_cache_status()` 基于当前内存缓存计算三类 bucket：

- 股票列表
- 快照
- 历史行情

`DataConnectorHealthService` 通过可选 `provider.get_cache_status()` 透传，前端在 `runtime_config` 附近展示。

## 用户价值

- 用户能直观看到缓存是否真的命中。
- 真实行情调试时，可以区分“接口没请求”和“缓存还有效”。
- 为后续增加 hit/miss 计数和手动清缓存打基础。
