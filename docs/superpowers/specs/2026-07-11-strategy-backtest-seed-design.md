# 策略回测雏形设计

## 目标

在现有“策略股票池”基础上增加一个轻量回测视角，让用户看到当前策略在样例数据上的规则命中、持有周期、收益和回撤表现。本阶段只做研究辅助，不做真实交易建议。

## 推荐方案

新增后端接口 `/api/v1/backtests/strategy`，由独立 `StrategyBacktestService` 复用现有 `ScreenerService`、`DiagnosisEngine` 和 `TrendService` 生成样例回测报告。前端新增“策略回测”面板，跟随当前策略和周期刷新。

选择独立接口的原因：

- 不改变 `/screeners/{preset}` 当前候选股列表语义。
- 回测结果需要交易样例、统计指标和规则说明，结构比候选股更复杂。
- 后续可以平滑替换为真实历史行情或更完整回测引擎。

## 范围

本阶段包含：

- 输入：`preset`、`horizon`、`holding_days`、`limit`。
- 规则命中：复用当前策略股票池筛选逻辑，记录命中的候选标的。
- 样例交易：使用 `TrendService` 生成的样例价格序列，按命中日附近买入、持有 `holding_days` 后卖出。
- 统计：命中次数、交易数、胜率、平均收益、最佳/最差收益、最大回撤。
- 前端展示：策略名、持有周期、样例交易数、胜率、平均收益、最大回撤、前几笔交易。

本阶段不包含：

- 真实历史 K 线下载。
- 手续费、滑点、停牌、涨跌停撮合。
- 多因子参数优化、资金曲线图和批量策略对比。
- 自动买卖建议。

## 数据模型

新增模型：

- `StrategyBacktestTrade`
- `StrategyBacktestSummary`
- `StrategyBacktestReport`

报告字段：

- `preset`
- `horizon`
- `holding_days`
- `sample_size`
- `match_count`
- `trade_count`
- `win_rate`
- `average_return_pct`
- `best_return_pct`
- `worst_return_pct`
- `max_drawdown_pct`
- `summary`
- `rule_notes`
- `trades`

交易字段：

- `symbol`
- `name`
- `industry`
- `entry_date`
- `exit_date`
- `entry_price`
- `exit_price`
- `return_pct`
- `max_drawdown_pct`
- `holding_days`
- `rule_tags`
- `signal_reason`

## 计算规则

- 先对全市场样例快照执行当前策略筛选。
- 对命中标的构建最多 30 日样例趋势序列。
- 入口价取可用序列中倒数 `holding_days + 1` 个点；出口价取最后一个点。
- 单笔收益：`(exit_price - entry_price) / entry_price * 100`。
- 单笔最大回撤：从入口后最高价到后续最低价的最大跌幅，结果为负数。
- 汇总最大回撤取所有交易中最差的单笔回撤。

## 前端行为

- `App.tsx` 按当前 `screenerPreset` 和 `horizon` 请求回测报告。
- `ScreenerPanels.tsx` 新增 `StrategyBacktestPanel`。
- 面板放在“策略股票池”附近，作为策略候选的佐证信息。
- 请求失败时显示局部错误态：“策略回测加载失败”；无交易时显示空态：“当前策略暂无可回测样例”。
- 所有文案明确使用“样例回测”，避免用户误解为真实历史收益。

## 测试

后端：

- 服务测试覆盖回测报告、交易收益、胜率和最大回撤。
- API 测试覆盖 `/api/v1/backtests/strategy` 返回结构。

前端：

- 类型和 API 增加 `StrategyBacktestReport`。
- App 测试 mock 回测接口，断言面板展示样例交易数、胜率、平均收益、最大回撤和交易行。
- 覆盖接口失败时的局部错误态。
