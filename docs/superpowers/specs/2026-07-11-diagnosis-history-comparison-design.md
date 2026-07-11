# 诊断历史对比增强设计

## 目标

把现有“诊断变化”从简单分数差升级为更清晰的历史趋势对比，让用户一眼看懂：

- 本次诊断相对上次是增强、转弱、评级变化还是持平。
- 综合分、技术、估值、资金、风险分别如何变化。
- 评级从什么变成什么。
- 风险变化是改善还是恶化，下一步要优先复核什么。

## 范围

本阶段只增强已有 `/api/v1/diagnosis-change/{symbol}` 报告和前端“诊断变化”面板。

包含：

- 后端报告新增趋势结构：`score_trend`、`rating_transition`、`risk_shift`、`key_drivers`。
- 前端新增趋势卡片、评级轨迹、风险变化解释和关键驱动列表。
- 保留原有字段和原有分项变化列表，避免破坏报告、行动计划等已有消费者。

不包含：

- 多份历史报告折线图。
- 独立历史详情页。
- 从真实行情历史回放生成多期诊断。

## 数据结构

新增模型：

- `DiagnosisScoreTrendPoint`
  - `label`: `上次 | 本次`
  - `generated_at`
  - `total`
  - `technical`
  - `valuation`
  - `capital`
  - `risk`

- `DiagnosisRatingTransition`
  - `previous`
  - `current`
  - `changed`
  - `detail`

- `DiagnosisRiskShift`
  - `direction`: `improved | worsened | flat | baseline`
  - `delta`
  - `label`
  - `detail`

- `DiagnosisChangeDriver`
  - `metric`
  - `label`
  - `delta`
  - `direction`
  - `detail`

## 后端规则

- 没有历史报告时：
  - `score_trend` 只包含“本次”。
  - `rating_transition.previous = null`。
  - `risk_shift.direction = baseline`。
  - `key_drivers` 给出一条“首份基线”说明。

- 有历史报告时：
  - `score_trend` 包含“上次”和“本次”。
  - `rating_transition` 表示评级变化。
  - `risk_shift` 解释风险分变化：风险分上升为风险改善，下降为风险恶化。
  - `key_drivers` 选取综合、技术、估值、资金、风险中绝对变化最大的 3 项。

## 前端展示

“诊断变化”面板增强为：

- 顶部仍显示状态和综合分差。
- 新增 `change-trend-strip`：展示上次/本次综合分、风险分和评级。
- 新增 `rating-transition`：显示评级从 A 到 B；无历史时显示“当前为首份复盘基线”。
- 新增 `risk-shift`：显示风险变化方向、分差和解释。
- 新增 `change-driver-list`：展示最多 3 个关键驱动。
- 原有四项分差和变化列表继续保留。

## 测试

后端：

- baseline 报告包含新增字段。
- 有历史报告时，趋势点、评级轨迹、风险变化和关键驱动正确生成。

前端：

- App 测试断言面板展示“趋势对比”“评级轨迹”“风险变化”“关键驱动”等新增内容。
- 保留原有 baseline 文案断言。
