# 报告导出 v2 设计

## 目标

把新完成的策略回测和组合模拟仓位纳入研究报告导出包，让导出的 JSON 不只是当前诊断快照，也能复现用户当时看到的策略验证和组合权重假设。

## 推荐方案

继续使用前端 Blob 导出 JSON，不新增 PDF/Word/HTML 依赖。本阶段把导出格式从 `stock-doctor-report-v1` 升级为 `stock-doctor-report-v2`，新增字段：

- `strategy_backtest`
- `portfolio_weight_inputs`

选择这个方案的原因：

- 当前导出链路已经稳定，有测试覆盖。
- JSON v2 可以作为后续 PDF/HTML/Word 报告生成的数据源。
- 不需要后端文件生成，也不增加打包体积。

## 范围

包含：

- 导出版本号升级为 `stock-doctor-report-v2`。
- 导出当前策略回测报告 `strategy_backtest`。
- 导出用户输入的模拟仓位 `portfolio_weight_inputs`。
- 保留已有 `diagnosis`、`diagnosis_change`、`portfolio_risk`、`data_quality`、`data_trust`。
- 更新导出测试，覆盖回测和模拟仓位字段。

不包含：

- PDF/Word/HTML 排版。
- 服务端生成报告。
- 报告模板编辑器。
- 导出文件加密或压缩。

## 数据结构

顶层字段：

- `version`: `"stock-doctor-report-v2"`
- `exported_at`
- `symbol`
- `horizon`
- `diagnosis`
- `diagnosis_change`
- `portfolio_risk`
- `portfolio_weight_inputs`
- `strategy_backtest`
- `data_quality`
- `data_trust`

`portfolio_weight_inputs` 使用前端当前输入值，保留用户原始输入字符串，便于未来区分“用户输入 80”和后端归一化后的仓位占比。

## 测试

- 更新现有导出测试：先输入一只股票模拟仓位，再导出报告。
- 断言 `version` 为 v2。
- 断言 `strategy_backtest.trade_count` 存在。
- 断言 `portfolio_weight_inputs["600519"]` 为用户输入值。
- 继续断言组合风险和数据可信度字段存在。
