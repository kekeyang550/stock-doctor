# Stock Doctor 继续开发设计

日期：2026-07-10

## 目标

沿着三条相互衔接的路线继续开发 Stock Doctor：

1. 让 AKShare 真实行情链路更可用，同时保留 Mock 数据作为稳定兜底。
2. 把过大的 React 工作台拆成可维护的业务面板，先保持现有行为不变。
3. 增加更实用的选股和诊断预设，让真实数据链路产生业务价值。

每个阶段完成后，当前 MVP 都应该仍然可运行、可测试、可继续迭代。

## 当前上下文

- 后端已经有 `MarketDataProvider` 协议、稳定的 `MockMarketDataProvider`，以及 `AkshareMarketDataProvider` 适配边界。
- AKShare 当前已经支持股票列表加载、有限的历史行情技术指标、保守的基本面/资金面兜底，以及 Mock fallback。
- 前端 `App.tsx` 约 2320 行，`styles.css` 约 2700 行。界面功能很多，但都集中在一个大文件里，后续维护成本高。
- 后端已有较完整的 pytest 覆盖，包含诊断、热点、复盘行动、数据质量、连接器、存储和 API 路由。
- 当前本地源码来自 GitHub source zip，不是 `.git` 工作树，因为这台机器访问 GitHub Git 传输失败。

## 总体方案

采用渐进式、兼容优先的推进方式：

- 第一阶段：增强数据接入和可观测性。
- 第二阶段：围绕现有面板拆分前端工作台。
- 第三阶段：增加新的选股策略和诊断解释能力。

不要删除现有 Mock 行为。真实数据失败时，应通过连接器健康、数据新鲜度或数据质量提示暴露问题，而不是让工作台崩掉。

## 第一阶段：真实数据链路

### 后端设计

所有 AKShare 相关调用继续收在 `backend/app/services/akshare_provider.py` 中。Provider 负责把远端返回的行数据归一化为现有的 `StockSummary` 和 `StockSnapshot` schema，让下游诊断服务不需要关心数据来自 Mock 还是 AKShare。

Provider 增强分三步：

- 增加聚焦的行数据归一化 helper，覆盖常见 AKShare 字段变体：股票列表、日线历史、个股资金流、估值/基本面指标。
- 对本进程内成功获取的远端 payload 做内存缓存；远端接口失败时，明确回退到 Mock 或保守估算。
- 记录部分字段来源状态，让连接器健康和数据质量报告能说明哪些字段是真实数据、哪些是保守估算、哪些不可用。

### 市场概览

当前 AKShare provider 的 `get_market_overview()` 直接委托 Mock。后续应优先尝试通过 AKShare 获取指数点位和市场广度；如果远端数据缺失，再回退到 Mock 概览。

最小可用字段：

- `index_name`
- `index_level`
- `index_change_pct`
- 基于股票涨跌幅统计的上涨/下跌数量
- 基于可用行业标签和涨跌幅推导的热门行业

### 刷新任务

保留现有手动刷新任务接口。AKShare 模式下，刷新任务应该预热股票列表缓存，以及全市场或自选股范围内的 snapshot 缓存。刷新历史继续记录 provider、scope、duration、coverage 和 success/failure。

### 错误处理

AKShare endpoint 错误、导入错误、空 payload、字段名异常，都不应该在普通 dashboard 请求里直接冒泡成 API 500。Provider 应该：

- 保留最近一次可读错误；
- 尽可能返回 fallback 数据；
- 把连接器状态标记为 `fallback` 或 `error`；
- 让数据质量报告展示缺失字段或保守估算字段。

### 测试

新增后端测试时使用假的 AKShare module，不依赖真实网络：

- 中文和英文字段名的股票列表归一化；
- 基于历史行情推导技术指标；
- 远端基本面或资金面缺失时生成保守 snapshot；
- 市场概览失败时 fallback；
- AKShare 缺包、在线、fallback 时的连接器健康信息。

## 第二阶段：前端工作台模块化

### 组件边界

把 `frontend/src/App.tsx` 拆成业务导向的组件，第一步先保持当前视觉和行为不变：

- `components/system/`：数据连接器健康、数据新鲜度、刷新任务、系统存储、就绪度、导入/导出。
- `components/hotspots/`：热点总览、热点选股池、热点跟踪动作、行业热力、题材热榜、异动雷达。
- `components/diagnosis/`：诊断工作区、走势、评分、同业对比、数据质量、诊断论证、复盘行动、证据链、风险、关键价位。
- `components/research/`：报告历史、研究笔记、价位提醒。
- `components/screeners/`：机会排行、策略股票池、预警中心、自选股体检、跟踪时间线、风险敞口。

格式化 helper 尽量放到使用它们的面板附近；只有真正多处复用的 helper 才放到共享文件。共享 API 类型继续放在 `frontend/src/lib/types.ts`。

### 状态策略

这一阶段继续使用 React `useState` 和 `useEffect`。暂时不引入全局状态库。只有当数据加载 helper 能明显减少重复或澄清面板职责时，才抽出来。

### 样式策略

不要一上来重做整个 UI。先把 CSS 按组件组拆分，再在拆分过程中修正暴露出来的过宽选择器或布局问题。

建议的 CSS 文件：

- `styles/base.css`
- `styles/layout.css`
- `styles/system.css`
- `styles/hotspots.css`
- `styles/diagnosis.css`
- `styles/research.css`
- `styles/screeners.css`

### 测试

保留现有 render smoke test，再给高风险交互补小型组件测试：

- 刷新任务按钮；
- 热点动作状态更新；
- 复盘行动状态更新；
- 笔记和价位提醒的保存/删除；
- 存储导入预检和应用导入。

## 第三阶段：新选股和诊断预设

### 新选股预设

复用现有 `/screeners/{preset}` 接口，不另起一套平行 API。

新增这些 preset：

- `breakout-volume`：放量突破候选。寻找价格站上短中期均线、量比放大、动能为正且风险可接受的标的。
- `capital-return`：资金回流候选。寻找主力资金明显转强或持续为正，同时价格不过度追高的标的。
- `risk-avoidance`：风险回避池。突出因为 ST、解禁窗口、技术转弱或高风险预警较多而需要回避/复核的标的。

初期继续使用现有 `ScreenCandidate` schema：`reason` 解释命中原因，`risk_note` 明确风险或注意点。

### 诊断增强

这一轮不重写核心评分模型。先增强新 preset 周边的解释质量：

- 展示命中的策略规则；
- 展示最强正面证据；
- 展示最可能使策略失效的风险。

如果现有 `ScreenCandidate` schema 变得太挤，可以等前端拆分完成后，再追加可选字段。

### 前端呈现

把新 preset 加入现有“策略股票池”控制项。列表布局先保持稳定，但标签要清楚：

- 放量突破
- 资金回流
- 风险回避

## 数据流

1. 前端从 `/api/v1` 请求股票、自选股、系统健康、数据新鲜度和选股结果。
2. API routes 通过 provider 边界调用服务。
3. Provider 在配置为 AKShare 时优先尝试真实数据。
4. Provider 返回归一化后的 schema 对象，或 fallback / conservative 等价对象。
5. 诊断、选股、热点和预警服务消费统一 schema，不写 provider 专用逻辑。
6. 前端保持同样的面板结构，但更清楚地展示数据源和数据质量提示。

## 验证计划

每个实施阶段结束时都要跑：

- 后端：`python -m pytest`
- 前端测试：`npm test -- --run`
- 前端构建：`npm run build`
- 本地可运行后做一次手动预览

因为当前项目不是 Git 工作树，在初始化 Git 或完整克隆仓库之前，无法提交 commit。

## 不在本轮范围内

- 自动交易或下单。
- 付费数据源 Token 管理。
- 完整替换诊断评分模型。
- 在前端模块化之前做整套视觉重设计。
- 在 CI 里跑真实 AKShare 网络测试。
