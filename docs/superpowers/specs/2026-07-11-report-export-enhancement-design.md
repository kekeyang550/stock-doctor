# 报告导出增强设计

## 目标

在当前诊断页提供“一键导出研究报告包”，把用户当前看到的核心研究信息打成结构化 JSON 文件，便于留档、跨设备转移、后续生成 PDF/HTML。

## 本阶段范围

包含：

- 顶部工具栏新增“导出报告”按钮。
- 导出文件包含：
  - 当前诊断 `diagnosis`
  - 诊断变化 `diagnosis_change`
  - 组合风险 `portfolio_risk`
  - 数据可信度 `data_trust`
  - 数据质量 `data_quality`
  - 数据源 `data_sources`
  - 导出时间、标的、周期和格式版本
- 导出时按钮显示“导出中”并禁用，避免重复点击。
- 导出失败沿用全局错误提示。

不包含：

- PDF/Word/HTML 排版导出。
- 服务端生成文件。
- 报告模板编辑器。

## 数据结构

导出 JSON 顶层：

- `version`: `"stock-doctor-report-v1"`
- `exported_at`
- `symbol`
- `horizon`
- `diagnosis`
- `diagnosis_change`
- `portfolio_risk`
- `data_quality`
- `data_trust`

`data_trust` 包含：

- `sources`
- `connector_health`
- `freshness`
- `refresh_jobs`

## 前端行为

- 当 `diagnosis` 为空时按钮禁用。
- 文件名：`stock-doctor-report-{symbol}-{YYYY-MM-DD}.json`。
- 使用浏览器 Blob 下载，不新增依赖。
- 与“存报告”区分：“存报告”写入本地报告历史；“导出报告”下载当前研究快照。

## 测试

- 前端测试点击“导出报告”后，捕获 Blob 内容并断言包含诊断、组合风险、数据可信度和版本号。
- 测试导出时按钮 pending 状态和文件名。
