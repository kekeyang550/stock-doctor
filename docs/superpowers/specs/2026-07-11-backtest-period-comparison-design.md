# 策略回测多周期对比设计

## 背景

当前“策略回测”已经支持用户在 `3日 / 5日 / 10日 / 20日` 之间切换，并通过单周期接口刷新样例回测。问题是用户需要逐个点击才能比较不同持有周期的胜率、收益和回撤，不利于快速判断策略适合短持还是中持。

## 目标

- 在不引入真实历史 K 线、手续费、滑点或撮合逻辑的前提下，增加多周期样例回测摘要。
- 后端提供一个批量摘要接口，复用现有 `StrategyBacktestService.run()` 的单周期计算。
- 前端在“策略回测”面板中展示 `3 / 5 / 10 / 20` 日的胜率、平均收益、最大回撤和推荐周期。
- 保持当前单周期切换逻辑不变，用户仍可点击周期查看具体样例交易。

## 推荐方案

采用“后端批量摘要 + 前端只展示摘要”的方案。

- 后端新增 `GET /api/v1/backtests/strategy/periods`。
- 查询参数沿用现有接口：`preset`、`horizon`、`limit`，新增可选 `periods=3,5,10,20`。
- 返回结构包含当前策略、周期、样本数、每个周期的摘要，以及 `recommended_holding_days`。
- 推荐周期选择规则：优先平均收益更高；收益相同则最大回撤更小；仍相同则胜率更高；再相同则周期更短。
- 前端新增 `StrategyBacktestComparison` 类型和 `fetchStrategyBacktestComparison()`。
- `App.tsx` 与单周期回测一起加载对比摘要；对比失败只影响回测面板，不影响股票池和单周期结果。

## 数据结构

后端新增：

```py
class StrategyBacktestPeriodSummary(BaseModel):
    holding_days: int
    trade_count: int
    win_rate: float
    average_return_pct: float
    max_drawdown_pct: float

class StrategyBacktestComparison(BaseModel):
    preset: str
    horizon: str
    sample_size: int
    match_count: int
    recommended_holding_days: int | None
    periods: list[StrategyBacktestPeriodSummary]
    summary: str
```

前端新增同名 TypeScript 类型。

## 前端展示

在“策略回测”面板的单周期指标和摘要之间加入“周期对比”区域：

- 标题显示“周期对比”。
- 每个周期一行或小格，展示 `N日`、`胜率`、`平均收益`、`最大回撤`。
- 推荐周期加 `推荐` 标签。
- 如果对比接口失败，展示轻量提示：“周期对比暂不可用”，保留单周期回测内容。

## 错误态

- 后端 `preset` 不存在仍返回 404。
- `periods` 中无法解析、超出 1-20 或重复的值会被过滤；过滤后为空则回退到 `3,5,10,20`。
- 前端对比摘要失败时不清空单周期回测，只在面板内部显示提示。

## 测试

- 后端服务测试：多周期结果包含 3/5/10/20，推荐周期来自结果之一，摘要不为空。
- 后端 API 测试：`/backtests/strategy/periods` 返回结构和周期列表。
- 前端测试：页面加载后显示“周期对比”、多个周期、推荐标签；接口失败时显示轻量错误且保留单周期回测。

## 非目标

- 不做真实历史 K 线。
- 不做资金曲线、手续费、滑点或换仓逻辑。
- 不持久化回测配置。
- 不改变现有 JSON/HTML 报告格式；报告继续导出当前单周期 `strategy_backtest`。
