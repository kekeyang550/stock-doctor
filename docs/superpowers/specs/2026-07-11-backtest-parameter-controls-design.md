# 策略回测参数前端可调设计

## 背景

回测后端已经支持手续费 bps、滑点 bps 和样本数量 limit，前端也能展示成本口径。但当前用户无法在界面里调整这些参数，导出报告中也没有记录“用户当时使用了什么参数”。这会影响不同成本假设下的策略对比和离线复盘。

## 目标

本阶段把关键回测参数开放到前端：

- 手续费 bps。
- 滑点 bps。
- 样本数量 limit。

用户修改参数后，策略回测和周期对比自动按新参数重新请求；JSON/HTML 报告保留当前参数，保证导出后可以还原回测口径。

## 范围

包含：

- 前端 `fetchStrategyBacktest`、`fetchStrategyBacktestComparison` 支持成本和 limit 参数。
- `App.tsx` 新增回测参数状态，并传入策略回测面板和报告 payload。
- `StrategyBacktestPanel` 新增紧凑参数输入区。
- JSON 报告新增 `strategy_backtest_parameters`。
- HTML 报告展示参数摘要。
- 前端测试覆盖参数输入、请求 URL 和导出字段。
- 后端补充周期对比接口接收 `fee_bps`、`slippage_bps` 的测试，确保已有路由参数继续有效。

不包含：

- 参数持久化到本地存储。
- 自定义持有周期列表。
- 前端新增回测预设管理。

## 交互设计

策略回测面板新增“参数”区域，放在成本口径卡片之后：

- 手续费 bps：数字输入，范围 0 到 100。
- 滑点 bps：数字输入，范围 0 到 100。
- 样本数量：数字输入，范围 1 到 30。

输入值变化后，沿用现有 `useEffect` 自动重载，不增加额外“应用”按钮。这样和当前持有周期切换的交互保持一致。

## 数据流

1. `App.tsx` 保存 `backtestFeeBps`、`backtestSlippageBps`、`backtestLimit`。
2. `loadStrategyBacktest()` 将参数传给单周期接口和周期对比接口。
3. 面板显示当前参数和接口返回的成本口径。
4. 导出 JSON 时写入 `strategy_backtest_parameters`。
5. 导出 HTML 时显示“参数口径”。

## 测试策略

- 前端测试：修改手续费为 8，滑点为 12，样本数量为 6 后，请求 URL 包含对应查询参数。
- 前端测试：JSON 导出包含 `strategy_backtest_parameters`。
- 前端测试：HTML 导出包含“参数口径”和当前参数。
- 后端 API 测试：周期对比接口带成本参数时，返回周期统计按净收益计算并保持正常结构。
