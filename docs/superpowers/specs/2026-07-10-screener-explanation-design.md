# 策略股票池解释增强设计

日期：2026-07-10

## 目标

让“策略股票池”的候选结果不只显示一句命中原因，而是补充三类可复盘信息：

- 命中的策略规则；
- 最强正面证据；
- 可能导致策略失效或需要回避的风险。

本轮只增强解释层，不重写评分模型，不新增平行 API。

## 当前上下文

后端已经通过 `ScreenerService.screen()` 生成 `ScreenCandidate`，API 路由为 `/api/v1/screeners/{preset}`。前端 `ScreenerPanel` 已经展示候选名称、分数、涨跌幅和 `reason`。

现有第三阶段已经加入三个新 preset：

- `breakout-volume`：放量突破；
- `capital-return`：资金回流；
- `risk-avoidance`：风险回避。

下一步应提升这些候选结果的解释质量，而不是扩大模型复杂度。

## 数据结构

在现有 `ScreenCandidate` 上增加三个兼容字段：

- `rule_tags: list[str]`：短标签数组，例如 `["站上均线", "量比放大", "动能为正"]`。
- `positive_evidence: str`：最强正面证据，例如 `技术分 90，价格高于 MA5/MA20，量比 1.16。`。
- `invalidation_risk: str`：策略失效或复核风险，例如 `若跌破 MA20 或量能回落，突破假设降级。`。

字段由后端统一生成，前端只负责展示。字段有默认值，避免老数据或旧测试 fixture 缺字段时崩溃。

## 后端设计

`backend/app/services/screener.py` 继续承担筛选和解释职责。内部把“是否命中”和“如何解释”合并为一个私有解释对象，避免 `reason`、标签和风险文案分散在不同分支中。

每个 preset 的解释策略：

- `strong`：强调综合评分、技术分和趋势结构；失效风险关注跌破关键均线或评分转弱。
- `value`：强调行业估值分位和风险分；失效风险关注基本面或风险评分恶化。
- `capital-risk`：强调主力净流出或资金分偏弱；失效风险提示资金压力未解除前不应追高。
- `breakout-volume`：强调站上 MA5/MA20、量比放大、技术分较高；失效风险关注跌破 MA20 或量能回落。
- `capital-return`：强调主力净流入、资金分和涨幅不过热；失效风险关注资金转负或涨幅过快。
- `risk-avoidance`：强调事件风险、技术转弱或资金承压；失效风险提示风险未解除前只做复核观察。

## 前端设计

`frontend/src/components/screeners/ScreenerPanels.tsx` 在每条候选里增加：

- 一行规则标签；
- 一行正面证据；
- 一行失效风险。

现有列表布局保持不变，只在候选卡片内部增加紧凑信息。没有字段时不渲染空行。

## 测试策略

后端先写失败测试：

- `ScreenerService` 对新 preset 返回非空 `rule_tags`、`positive_evidence` 和 `invalidation_risk`。
- API 响应包含新增字段。

前端先写失败测试：

- App smoke test 的筛选候选 fixture 增加解释字段；
- 断言“命中规则”“正面证据”“失效风险”出现在策略股票池面板。

## 验证

完成后运行：

- 后端：`python -m pytest`
- 前端：`npm test -- --run`
- 前端构建：`npm run build`
- 本地浏览器确认“策略股票池”展示新增解释。

## 不在本轮范围内

- 不改诊断评分权重。
- 不引入 LLM 解释生成。
- 不新增数据库字段。
- 不新增筛选 API 版本。

## 自检

- 无占位内容。
- 字段命名在后端 schema、前端 type 和组件展示中保持一致。
- 范围聚焦于策略解释增强，能作为一个独立实现计划落地。
