# 诊断历史趋势洞察实施计划

## 步骤

1. 扩展后端 schema
   - 新增 `DiagnosisTrendInsight`。
   - `DiagnosisChangeReport` 增加 `trend_insight` 字段。

2. 扩展诊断变化服务
   - 增加按股票筛选最近报告的方法。
   - `build_change()` 接受可选历史报告列表。
   - 生成多点 `score_trend` 和 `trend_insight`。

3. 扩展 API
   - `/diagnosis-change/{symbol}` 读取一次报告列表，同时用于上次对比和趋势洞察。
   - 评审动作内部保持兼容，必要时也传入历史列表。

4. 扩展前端类型与 UI
   - `DiagnosisChangeReport` 增加 `trend_insight`。
   - “诊断变化”面板新增趋势洞察卡片。
   - HTML 研究报告导出趋势洞察。

5. 验证
   - 先补失败测试，再实现。
   - 运行后端全量、前端全量、构建和浏览器验证。
