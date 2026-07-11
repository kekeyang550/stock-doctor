# 策略回测历史对比设计

## 背景

策略回测已经具备周期对比、策略横向对比、权益曲线、稳定评分和样本可信度。但这些信息只反映“当前一次回测”，用户刷新参数、切换周期或等待行情更新后，很难回看上一次结果，也无法判断收益、回撤、稳定性是否在变好。

## 目标

- 每次单策略回测成功后保存一条轻量历史摘要。
- 提供后端接口查询最近回测历史和趋势对比。
- 前端在“策略回测”面板展示最近回测变化：平均收益、最大回撤、稳定评分、样本可信度。
- JSON/HTML 报告同步导出最近回测历史，便于离线复盘。

## 非目标

- 不保存每笔交易明细，避免 state 文件膨胀。
- 不做复杂统计显著性分析。
- 不改变当前回测算法、推荐排序、候选筛选或报告主 payload 格式。

## 后端数据模型

新增 Pydantic 模型：

- `StrategyBacktestHistoryItem`
  - `id: str`
  - `created_at: str`
  - `preset: str`
  - `horizon: str`
  - `holding_days: int`
  - `limit: int`
  - `fee_bps: float`
  - `slippage_bps: float`
  - `price_source: str`
  - `sample_confidence_score: int`
  - `sample_confidence_label: str`
  - `stability_score: int`
  - `stability_label: str`
  - `trade_count: int`
  - `win_rate: float`
  - `average_return_pct: float`
  - `max_drawdown_pct: float`
  - `return_drawdown_ratio: float`

- `StrategyBacktestHistoryComparison`
  - `preset: str`
  - `horizon: str`
  - `items: list[StrategyBacktestHistoryItem]`
  - `latest: StrategyBacktestHistoryItem | None`
  - `previous: StrategyBacktestHistoryItem | None`
  - `average_return_delta: float`
  - `max_drawdown_delta: float`
  - `stability_score_delta: int`
  - `sample_confidence_delta: int`
  - `summary: str`

## 持久化

`StateStore` 新增：

- `load_strategy_backtests() -> list[dict[str, Any]]`
- `save_strategy_backtests(records: list[dict[str, Any]]) -> None`

保存 key 为 `strategy_backtests`。每次保存时：

- 只保存摘要字段。
- 新记录放在最前。
- 去重依据为 `preset + horizon + holding_days + limit + fee_bps + slippage_bps + created_at`，保留最近结果。
- 总数上限 100 条。

## 服务设计

新增 `StrategyBacktestHistoryService`：

- `record(report, preset, horizon, holding_days, limit, fee_bps, slippage_bps, state_store, now=None)`
- `compare(preset, horizon, state_store, limit=8)`

`GET /api/v1/backtests/strategy` 在生成 report 后调用 `record()`。新增：

`GET /api/v1/backtests/strategy/history?preset=...&horizon=...&limit=8`

返回最近同 preset/horizon 的历史摘要。

## 前端设计

新增类型：

- `StrategyBacktestHistoryItem`
- `StrategyBacktestHistoryComparison`

新增 API：

- `fetchStrategyBacktestHistory(preset, horizon, limit = 8)`

`StrategyBacktestPanel` 新增 props：

- `history: StrategyBacktestHistoryComparison | null`
- `historyError: string | null`

展示位置：放在“稳定性”卡片后、“周期对比”前。展示内容：

- 标题“历史对比”
- 摘要文案
- 最新 vs 上次的平均收益、最大回撤、稳定评分、样本可信度变化
- 最近 4 条历史列表

历史加载失败只显示局部错误，不影响当前回测。

## 报告导出

研究报告 payload 新增 `strategy_backtest_history`。HTML 报告“策略回测”章节新增“历史对比”，导出摘要和最近历史项。

## 测试策略

- 后端 storage 测试覆盖 JSON/SQLite 保存与读取 `strategy_backtests`。
- 后端 API 测试覆盖回测后可查询历史，且历史包含稳定评分和可信度。
- 前端 App 测试覆盖面板展示“历史对比”、变化指标、最近历史。
- 前端 HTML 导出测试覆盖“历史对比”章节。
- 完整验证：后端 pytest、前端 vitest、前端 build、浏览器非白屏和控制台 error 检查。

## 自审

- 无 TBD/TODO。
- 范围聚焦在摘要级历史，不保存交易明细。
- 新接口和旧回测接口兼容，不影响既有调用。
- 前端错误态是局部错误，不拖垮回测主面板。
