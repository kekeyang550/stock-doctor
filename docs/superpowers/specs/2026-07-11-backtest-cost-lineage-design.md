# 策略回测成本与交易级血统设计

## 背景

策略回测已能显示报告级价格来源、历史样本和 fallback 状态。但用户继续复盘时，还需要知道每笔样例交易使用的价格来源，以及当前收益统计是否已经扣除了手续费和滑点。否则“平均收益”和“单笔收益”容易被误读为无成本收益。

## 目标

本阶段把回测可信度从报告层扩展到交易层，并加入透明成本假设：

- 报告层显示手续费 bps、滑点 bps、单笔合计成本百分比。
- 每笔交易保留毛收益、成本、净收益。
- 每笔交易展示价格来源、历史样本、最后交易日和 fallback 原因。
- `return_pct` 继续作为主要收益字段，但语义改为净收益，便于前端和旧展示自然使用更保守口径。

## 范围

包含：

- 后端 `StrategyBacktestReport` 增加 `fee_bps`、`slippage_bps`、`round_trip_cost_pct`。
- 后端 `StrategyBacktestTrade` 增加 `gross_return_pct`、`cost_pct`、`price_source`、`history_bar_count`、`history_last_date`、`fallback_reason`。
- API 支持可选 `fee_bps`、`slippage_bps` 查询参数，并限制在合理范围内。
- 前端类型、策略回测面板、HTML 报告同步展示成本口径。
- 测试覆盖后端服务、API、前端展示和 HTML 导出。

不包含：

- 印花税、最低佣金、不同市场费率、真实成交量约束。
- 成本参数在前端可编辑。
- 按交易方向拆分买入/卖出成本。

## 成本规则

- 默认 `fee_bps=5`，`slippage_bps=10`。
- 单笔往返成本百分比：`round_trip_cost_pct = (fee_bps + slippage_bps) * 2 / 100`。
- `gross_return_pct = (exit - entry) / entry * 100`。
- `return_pct = gross_return_pct - round_trip_cost_pct`。
- `average_return_pct`、`best_return_pct`、`worst_return_pct` 继续基于 `return_pct` 计算。

## 交互设计

策略回测面板新增成本口径卡片：

- 手续费：显示 bps。
- 滑点：显示 bps。
- 单笔成本：显示百分比。

交易行把收益文案改为净收益，并在价格行补充“毛收益 / 成本 / 来源”。用户可以快速判断收益是否来自真实 K 线，以及是否扣除成本。

HTML 报告在“策略回测”章节加入成本口径，并在交易明细中展示净收益、毛收益和成本。

## 错误处理

- API 查询参数超出范围时由 FastAPI 校验拒绝。
- 没有交易时仍返回成本假设，便于前端解释统计口径。
- 单笔使用样例趋势 fallback 时，交易行保留 fallback 原因。

## 测试策略

- 后端服务测试：给定 `fee_bps=5`、`slippage_bps=10` 时，断言单笔成本为 `0.3%`，净收益低于毛收益。
- 后端 API 测试：查询参数能进入报告，接口输出成本和交易级来源字段。
- 前端测试：面板显示“成本口径”“手续费”“滑点”“单笔成本”“净收益”。
- HTML 导出测试：报告包含成本口径和毛收益/净收益字段。
