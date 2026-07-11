# 策略回测周期对比导出设计

## 背景

策略回测页面已经展示周期对比、推荐周期和推荐依据，但 HTML 报告只导出了单周期回测与策略横向对比。用户导出报告后，无法离线看到 3/5/10/20 日周期对比，也无法还原为什么推荐某个持有周期。

## 目标

增强当前研究报告导出：

- JSON 报告加入 `strategy_backtest_comparison`。
- HTML 报告在策略回测章节加入“周期对比”。
- HTML 展示周期推荐依据和每个周期的交易数、胜率、平均收益、最大回撤、收益回撤比、价格来源、历史样本。

## 非目标

- 不改变回测计算、周期推荐排序或 API 契约。
- 不新增后端接口。
- 不调整页面内策略回测面板布局。

## 前端设计

`buildCurrentResearchReportPayload()` 将现有 `strategyBacktestComparison` 状态写入 JSON payload。

`buildResearchReportHtml()` 从 `payload.strategy_backtest_comparison` 读取：

- `summary`
- `recommendation_reason`
- `recommended_holding_days`
- `periods`

HTML 文案：

- 标题：`周期对比`
- 推荐解释：`周期推荐依据：...`
- 周期行：`N 日 · 推荐` 和指标摘要。

## 测试

在现有 App 导出测试中补充：

- JSON 导出包含 `strategy_backtest_comparison.recommended_holding_days`。
- JSON 导出包含周期推荐依据。
- HTML 导出包含“周期对比”“周期推荐依据”。
- HTML 导出包含推荐周期和周期指标摘要。
