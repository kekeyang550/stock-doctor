# 策略回测数据血统设计

## 背景

上一阶段已让策略回测优先使用 provider 历史 K 线，并在历史数据不足或 provider 异常时回退到样例趋势。当前界面只显示“历史K线 / 样例趋势”，用户仍难以判断本次回测用了多少历史样本、最后一根 K 线日期，以及是否发生 fallback。

## 目标

本阶段补强“回测可信度”而不改变交易算法。用户在策略回测面板和导出报告中，应能直接看到：

- 价格来源：历史 K 线或样例趋势。
- 历史样本条数：本次用于回测的最小有效 K 线数量。
- 最后交易日：历史数据最后一根 K 线日期。
- Fallback 原因：无 provider、provider 异常、历史样本不足，或未发生 fallback。

## 范围

包含：

- 后端 `StrategyBacktestReport` 和 `StrategyBacktestPeriodSummary` 增加数据血统字段。
- `StrategyBacktestService` 在构建价格序列时返回元信息，并聚合成报告级摘要。
- 前端策略回测面板展示更完整的数据可信度卡片。
- JSON 报告自然携带新增字段，HTML 报告新增回测数据血统摘要。
- 后端和前端测试覆盖历史 K 线、fallback 和展示/导出。

不包含：

- 手续费、滑点、停复牌、交易日历和撮合模型。
- 历史 K 线缓存持久化。
- 单笔交易逐笔记录每只股票的数据源细节。

## 数据模型

`StrategyBacktestReport` 新增：

- `history_bar_count: int`：若使用历史 K 线，表示参与回测股票中可用历史点数的最小值；若全部 fallback，则为 0。
- `history_last_date: str | None`：历史 K 线最后日期；若无历史 K 线则为 `None`。
- `fallback_reason: str | None`：未 fallback 时为 `None`；fallback 时返回用户可读原因。

`StrategyBacktestPeriodSummary` 新增同名字段，用于周期对比卡片展示每个持有周期的数据来源状态。

## 交互设计

策略回测面板把原有“价格来源”标签扩展成一张紧凑数据血统卡：

- 第一行展示价格来源和 fallback 状态。
- 第二行展示历史样本和最后交易日。
- 若发生 fallback，显示明确原因，例如“历史样本不足，已回退样例趋势”。

HTML 报告在“策略回测”章节加入同样的价格来源、样本条数、最后交易日和 fallback 原因，便于离线复盘。

## 错误处理

- provider 不存在：`price_source=synthetic-trend`，`fallback_reason=未配置历史行情 provider，已回退样例趋势`。
- provider 抛异常：`fallback_reason=历史行情读取失败，已回退样例趋势`。
- 历史点数不足：`fallback_reason=历史K线样本不足，已回退样例趋势`。
- 部分股票 fallback、部分股票历史可用：报告仍标记为 `historical-kline`，并给出最小历史样本条数；fallback 原因记录“部分标的历史K线不可用，已混合使用样例趋势”。

## 测试策略

- 后端服务测试：历史 provider 返回足够数据时，断言样本条数、最后日期和无 fallback。
- 后端服务测试：provider 抛异常或历史不足时，断言回退样例趋势和 fallback 原因。
- API 测试：回测接口和周期对比接口输出新增字段。
- 前端测试：策略回测面板展示价格来源、历史样本、最后交易日和 fallback 文案。
- 前端导出测试：HTML 报告包含回测价格来源和历史样本摘要。
