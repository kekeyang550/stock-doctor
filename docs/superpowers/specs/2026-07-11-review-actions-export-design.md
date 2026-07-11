# 复盘行动导出设计

## 背景

前端诊断工作台已经展示“复盘行动”，用户可以看到由风险预警、论证验证等来源生成的后续跟踪事项。但当前研究报告导出只包含诊断、组合风险、策略回测和数据可信度，离线报告里缺少“接下来要做什么”的行动清单。

## 目标

在研究报告导出中加入复盘行动：

- JSON 报告新增 `review_actions` 字段，保留当前标的的行动计划原始结构。
- HTML 报告新增“复盘行动”章节。
- HTML 展示高/中/低优先级数量、待处理/观察中/已完成数量。
- HTML 展示每条行动的标题、优先级、状态、分类、详情和来源。

## 非目标

- 不改变后端 `review-actions` 接口。
- 不新增行动生成算法。
- 不改变页面内复盘行动交互。
- 不引入 PDF/Word 导出依赖。

## 前端设计

`buildCurrentResearchReportPayload()` 直接复用当前页面已加载的 `reviewActions` 状态，写入：

```ts
review_actions: reviewActions
```

`buildResearchReportHtml()` 对 `payload.review_actions` 做防御式读取：

- 缺失时用空对象。
- `items` 不是数组时按空数组处理。
- 计数字段缺失时按 `0` 展示。
- 行动文本继续通过 `escapeHtml()` 输出。

HTML 文案使用用户可读标签：

- `high / medium / low` -> `高优先级 / 中优先级 / 低优先级`
- `pending / watching / done` -> `待处理 / 观察中 / 已完成`

## 测试

扩展现有导出测试：

- JSON 导出断言 `review_actions.pending_count` 和行动标题。
- HTML 导出断言“复盘行动”“待处理”“主力资金流出”“验证论证假设 1”“论证验证”。
