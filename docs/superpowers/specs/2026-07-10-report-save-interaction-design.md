# 报告保存交互保护设计

## 背景

顶部工具栏的“存报告”会调用 `POST /api/v1/reports` 创建诊断报告。当前按钮没有保存中的状态，用户连续点击时可能发出重复请求，造成重复保存、列表闪动或误以为保存失败。

## 目标

给“存报告”增加明确的 in-flight 保护：保存请求未完成前禁用按钮，并显示“保存中”，请求完成后恢复为“存报告”。

## 方案

采用单一局部状态方案。

- 在 `App.tsx` 新增 `savingReport: boolean`。
- `saveCurrentReport` 发起 `createReport(selectedSymbol, horizon)` 前设置 `savingReport = true`，在 `finally` 中恢复为 `false`。
- 顶部“存报告”按钮根据 `savingReport`：
  - 设置 `disabled`。
  - 文案从“存报告”切换为“保存中”。
- 成功后继续沿用现有逻辑，把新报告插入 `reports` 列表顶部，并按 20 条截断。
- 失败后继续使用现有 `setError` 流程。

## 不做范围

- 不改后端报告接口。
- 不改变报告历史排序和截断策略。
- 不增加 toast 或全局任务队列。
- 不锁定“加自选”“周期切换”“刷新诊断”等其它按钮。

## 验证

- 新增前端测试，用未完成的 `POST /api/v1/reports` Promise 模拟保存中状态。
- 断言点击后按钮禁用、显示“保存中”。
- Promise 返回后断言按钮恢复“存报告”，报告历史出现新报告，并验证 POST body。
- 跑前端全量测试、前端构建、后端 pytest。
