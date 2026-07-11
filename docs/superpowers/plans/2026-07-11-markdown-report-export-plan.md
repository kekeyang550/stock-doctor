# Markdown 研究报告导出实施计划

1. 前端测试
   - 新增 Markdown 导出测试。
   - 断言关键章节覆盖诊断变化、趋势洞察、组合风险、策略回测、数据可信度。

2. 导出实现
   - 增加 `buildResearchReportMarkdown()`。
   - 复用现有 payload，不新增接口。
   - 增加 Markdown 字段转义辅助函数。

3. UI
   - 顶部工具栏增加“导出MD”按钮。
   - 复用 `exportingReportPackage` 交互保护。

4. 验证
   - 运行前端聚焦测试、全量测试和构建。
   - 浏览器确认按钮可见且页面无错误。
