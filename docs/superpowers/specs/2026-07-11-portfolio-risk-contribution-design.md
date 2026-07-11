# 组合风险贡献增强设计

## 背景

组合风险面板已经支持等权/自定义权重、风险压力、行业集中度、风险分布和首要拖累。但用户仍然需要更直接回答两个问题：

- 组合主要暴露在哪些行业？
- 哪些单票对组合风险压力贡献最大？

## 目标

- 后端组合风险报告新增 `industry_exposures`。
- 后端组合风险报告新增 `risk_contributions`。
- 前端“组合风险”面板展示行业暴露和单票风险贡献。
- HTML 研究报告同步导出行业暴露和风险贡献。

## 非目标

- 不计算相关系数矩阵。
- 不引入 VaR / 波动率模型。
- 不新增持仓成本、盈亏或真实交易账户。
- 不改变模拟仓位输入方式。

## 后端设计

`PortfolioIndustryExposure` 字段：

- `industry`
- `stock_count`
- `weight_pct`
- `risk_score`

行业暴露按行业权重和风险压力排序。

`PortfolioRiskContribution` 字段：

- `symbol`
- `name`
- `industry`
- `weight_pct`
- `risk_score`
- `contribution_score`

单票贡献公式：

```text
contribution_score = max(0, 100 - risk_score) * normalized_weight
```

该公式保持轻量、可解释，适合当前研究版。后续如接入波动率和相关性，可以替换为更严谨的风险贡献模型。

## 前端设计

`RiskExposurePanel` 在模拟仓位之后新增两组紧凑列表：

- 行业暴露：展示行业、权重、标的数和风险压力。
- 风险贡献：展示个股、行业、权重和贡献分。

旧后端响应缺少字段时按空数组处理，不影响面板渲染。

## 报告导出

HTML 研究报告的“组合风险”章节新增：

- `行业暴露`
- `风险贡献`

所有字段继续通过 `escapeHtml()` 输出。

JSON 报告无需额外字段改造，因为 `portfolio_risk` 会自然包含新增字段。

## 测试

- 后端测试断言 `industry_exposures` 和 `risk_contributions` 存在并排序。
- 自定义权重测试断言 80/20 仓位下白酒行业暴露为 80%，贵州茅台贡献大于 0。
- 前端测试断言组合风险面板展示“行业暴露 / 风险贡献”。
- HTML 导出测试断言报告包含行业暴露和单票风险贡献。
