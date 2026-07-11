# 行情运行参数可视化设计

## 背景

数据可信度面板已经能展示行情来源、Fallback 状态、缓存命中、新鲜度和刷新记录。但真实行情试运行还缺少几个关键运行口径：单次请求超时、缓存 TTL、新鲜度过期阈值。没有这些信息时，用户只能看到“缓存可用/偏旧”，不知道系统按什么参数判断。

## 目标

- 后端配置新增行情运行参数：
  - `STOCK_DOCTOR_DATA_REQUEST_TIMEOUT_SECONDS`
  - `STOCK_DOCTOR_DATA_CACHE_TTL_SECONDS`
  - `STOCK_DOCTOR_DATA_FRESHNESS_STALE_AFTER_MINUTES`
- `/api/v1/system/data-connectors` 返回 `runtime_config`。
- `DataRefreshJobService.build_freshness()` 默认使用配置化的新鲜度阈值。
- 前端“数据可信度”面板展示请求超时、缓存 TTL 和过期阈值。

## 非目标

- 不改变 AKShare 字段映射。
- 不新增定时任务。
- 不改变缓存实现结构。
- 不引入新的行情 provider。

## 后端设计

`Settings` 增加三个字段，使用 `STOCK_DOCTOR_` 前缀自动读取环境变量。

`DataConnectorRuntimeConfig` 作为 `DataConnectorHealth.runtime_config` 的结构化字段返回，避免前端从说明文案中解析运行参数。

`DataRefreshJobService.build_freshness()` 将 `stale_after_minutes` 改成可选参数，未传入时读取 `settings.data_freshness_stale_after_minutes`。

## 前端设计

`DataConnectorHealth.runtime_config` 在前端类型中设为可选，兼容旧后端响应。

`DataConnectorPanel` 在摘要卡片中新增：

- 请求超时：`N 秒`
- 缓存 TTL：`N 秒`
- 过期阈值：`N 分钟`

如果旧响应缺少 `runtime_config`，前端展示 `--`，过期阈值可从 `freshness.stale_after_minutes` 回退。

## 测试

- 后端测试断言 health service 和接口都返回 `runtime_config`。
- 后端测试断言 freshness 默认读取配置阈值。
- 前端测试断言数据可信度面板展示三项运行参数。
