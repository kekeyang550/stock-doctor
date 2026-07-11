# 策略回测收益回撤比设计

## 背景

当前策略回测已经展示平均收益和最大回撤，也支持周期对比、多策略对比。用户仍需要自己把收益和回撤放在一起判断：同样 2% 收益，如果最大回撤一个是 -1%、另一个是 -6%，风险性价比明显不同。

## 目标

新增“收益回撤比”，让回测摘要直接表达每承担 1 个百分点回撤对应的平均收益。覆盖范围：

- 单策略回测报告
- 周期对比摘要
- 多策略对比摘要
- 前端策略回测面板
- JSON / HTML 报告导出

## 公式

`return_drawdown_ratio = average_return_pct / abs(max_drawdown_pct)`

规则：

- 当 `max_drawdown_pct` 为 0 时返回 0，避免无限值。
- 保留两位小数。
- 平均收益为负时，收益回撤比也为负。

## 后端设计

在 Pydantic schema 中新增字段：

- `StrategyBacktestReport.return_drawdown_ratio`
- `StrategyBacktestPeriodSummary.return_drawdown_ratio`
- `StrategyBacktestPresetSummary.return_drawdown_ratio`

`StrategyBacktestService.run()` 计算单策略字段，周期对比和多策略对比复用报告里的值。推荐逻辑加入收益回撤比：优先收益回撤比更高，其次平均收益更高、最大回撤更小、胜率更高。

## 前端设计

在“策略回测”面板中：

- 主指标区新增“收益回撤比”
- 周期对比卡新增“收益回撤比”
- 策略对比卡新增“收益回撤比”

报告导出：

- JSON 直接带后端字段。
- HTML 策略回测章节展示单策略、周期/策略摘要中的收益回撤比。

## 测试

后端：

- 服务层断言单策略报告、周期摘要、多策略摘要都包含收益回撤比。
- API 断言三个相关接口都返回该字段。

前端：

- Mock 数据加入收益回撤比。
- App 测试断言面板展示“收益回撤比”。
- 导出测试断言 HTML 包含该指标。
