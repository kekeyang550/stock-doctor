# 报告导出缓存遥测设计

## 背景

数据可信度面板已经展示 provider 缓存遥测，包括缓存命中总览和股票列表、行情快照、历史行情三类缓存桶。但 HTML 研究报告仍只导出连接器、fallback、缓存新鲜度和覆盖率，离线复盘时缺少缓存命中上下文。

## 目标

- HTML 研究报告的“数据可信度”章节导出缓存命中总览。
- 导出缓存 TTL 和各缓存桶有效/过期条数。
- 对缺失 `cache_status` 的旧 payload 保持兼容。

## 非目标

- 不改变 JSON 报告结构；JSON 已通过 `data_trust.connector_health.cache_status` 原样包含遥测。
- 不新增 PDF 导出能力。

## 方案

`buildResearchReportHtml()` 从 `payload.data_trust.connector_health.cache_status` 读取：

- `ttl_seconds`
- `buckets`
- 每个 bucket 的 `label`、`entries`、`active_entries`、`expired_entries`、`nearest_expires_in_seconds`、`status`

HTML 输出：

- 总览 metric：`缓存命中`
- 总览 metric：`缓存 TTL`
- “缓存桶”明细列表

所有内容继续通过 `escapeHtml()` 输出。
