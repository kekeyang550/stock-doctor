# 可写操作交互保护实施计划

日期：2026-07-11

## 任务 1：补测试

- 在 `frontend/src/App.test.tsx` 新增笔记保存/删除 pending 测试。
- 新增价位提醒保存/删除 pending 测试。
- 新增系统存储导出、预检、导入 pending 测试。

## 任务 2：接入 App 状态

- 新增 `savingNote`、`deletingNoteId`。
- 新增 `savingPriceAlert`、`deletingPriceAlertId`。
- 新增 `exportingStorage`、`previewingImport`、`applyingImport`。
- 所有状态在请求前设置，在 finally 中恢复。

## 任务 3：更新组件

- `ResearchNotesPanel` 接收保存和删除状态，控制按钮禁用和文案。
- `PriceAlertsPanel` 接收保存和删除状态，控制预设按钮、自定义输入、保存按钮和行级删除按钮。
- `SystemStoragePanel` 接收导出、预检、导入状态，控制按钮、文件输入和文案。
- 为 `.file-action.disabled` 补视觉样式。

## 任务 4：验证与记录

- 跑新增前端用例。
- 跑完整前端测试和构建。
- 跑后端测试，确认前端状态改动没有破坏 API 契约。
- 更新项目说明。
