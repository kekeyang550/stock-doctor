# Stock Doctor 开发进度交接 - 2026-07-13

## 当前分支

- 本地/远端开发分支：`local-codex-progress`
- 远端仓库：`https://github.com/kekeyang550/stock-doctor`
- 本机后端运行：`http://127.0.0.1:8010`
- 本机前端运行：`http://127.0.0.1:30080`

## 本轮已完成

1. 真实数据接入继续增强
   - 新增 `EastmoneyMarketDataProvider`，主链路优先直连东方财富 A 股行情、指数、日 K 线、单股估值详情和资金流。
   - 东方财富报价/K 线不可用时，自动尝试腾讯行情备用源。
   - 东方财富资金流不可用时，新增新浪资金流备用源，诊断资金面不再轻易退回样例值。
   - 本机验证 `600036` 招商银行可通过真实链路生成诊断，主力资金流可显示到证据链。

2. 本地行情参考源
   - 新增通达信本地日线读取器，默认读取 `E:\new_tdx64\vipdoc`。
   - 主行情源可用时做最近收盘价交叉校验；网络 K 线失败时可作为本地兜底。
   - 新增同花顺本地股票名表读取器，默认读取 `D:\同花顺软件\同花顺\stockname\stockname_16_0.txt` 和 `stockname_32_0.txt`。
   - 搜索股票名时可通过同花顺本地名表解析代码，例如“招商银行”解析到 `600036`。

3. 任意 A 股搜索、加入和诊断
   - 搜索框支持 6 位 A 股代码直连查询。
   - 不在默认候选池中的股票也可加入自选并生成诊断。
   - 搜索结果保留 `diagnosable`、数据质量状态和匹配原因。

4. 数据可信度面板增强
   - `/api/v1/system/data-connectors` 增加东方财富、腾讯行情、新浪资金流、通达信本地日线、同花顺本地股票名表、AKShare、Mock、Tushare Pro 的状态展示。
   - 前端将内部来源标记转换为中文说明，例如“新浪资金流兜底”“腾讯估值兜底”“通达信本地 K 线”。
   - 面板继续展示请求超时、缓存 TTL、缓存命中、fallback 状态和最近刷新记录。

5. 策略回测数据血缘
   - 回测服务优先使用真实历史 K 线。
   - 回测报告记录价格来源、历史样本数量、最后交易日和 fallback 原因。
   - 样本可信度、稳定性、收益/回撤、权益曲线、历史对比等现有能力继续保留。

6. 报告与测试
   - README 已补充真实数据 provider、通达信、同花顺和新浪资金流说明。
   - 后端测试补充东方财富、腾讯、通达信、同花顺、新浪资金流路径。
   - 前端测试覆盖数据可信度、导出报告和相关交互。
   - JSON/HTML/Markdown 研究报告已写入连接器明细、缓存遥测、数据质量检查、运行配置和本地路径状态。

7. 运行配置可视化
   - 新增 `/api/v1/system/runtime-config` 只读接口，返回当前 provider、请求超时、缓存 TTL、数据新鲜度阈值和本地路径配置状态。
   - 前端系统区新增“运行配置”面板，可直接看到通达信 `vipdoc`、同花顺股票名表是否已配置且存在。
   - 面板明确提示修改运行参数需要调整后端环境变量并重启服务。
   - 新增 Tushare Pro Token 配置状态展示，只返回是否配置，不返回 token 明文；连接器健康会提示缺包、缺 token 或已具备接入前置条件。
   - `STOCK_DOCTOR_DATA_PROVIDER=tushare` 已可安全启动；在财务字段归一化完成前会委托 Mock 回退，并在连接器健康中标明。
   - Tushare provider 第一阶段已支持在包/token 可用时归一化 PE/PB/ROE/营收增速/利润增速，并把来源写入数据质量报告；行情、历史和失败路径继续安全回退。

## 本机验证结果

- 后端全量测试：`147 passed, 1 warning`
- 前端测试：`35 passed`
- 前端生产构建：通过
- 浏览器验证：`http://127.0.0.1:30080/` 正常渲染，数据可信度面板可见“新浪资金流”，未再显示 `sina-capital-flow` 等内部 token。

## 本地运行配置

后端 `.env` 建议：

```env
STOCK_DOCTOR_DATA_PROVIDER=eastmoney
STOCK_DOCTOR_DATA_REQUEST_TIMEOUT_SECONDS=8
STOCK_DOCTOR_DATA_CACHE_TTL_SECONDS=300
STOCK_DOCTOR_DATA_FRESHNESS_STALE_AFTER_MINUTES=30
STOCK_DOCTOR_TDX_VIPDOC_PATH=E:\new_tdx64\vipdoc
STOCK_DOCTOR_THS_STOCKNAME_PATHS=D:\同花顺软件\同花顺\stockname\stockname_16_0.txt;D:\同花顺软件\同花顺\stockname\stockname_32_0.txt
STOCK_DOCTOR_TUSHARE_TOKEN=<如需 Tushare 财务增强，填入 token>
```

后端启动：

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

前端启动：

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 30080
```

这些值会通过 `/api/v1/system/data-connectors` 和 `/api/v1/system/runtime-config` 返回，并显示在数据可信度/运行配置面板中。报告导出的 JSON、HTML、Markdown 也会保留这些运行假设，便于离线复盘。

## 明天继续开发建议

1. 财务数据第二阶段
   - 已完成 Tushare Pro 包/token 准备度展示、安全 provider 回退和基础财务指标归一化入口。
   - 下一步在 token 可用后扩大到基础资料、复权日线和更多财报字段，继续减少 `growth` 等字段保守估算。

2. 真实数据质量评分
   - 把来源覆盖率、更新时间、fallback 次数、缓存命中率纳入股票级质量评分。
   - 让“需核验 90”这类文案更精准地区分“真实可用”“部分兜底”“样例退回”。

3. 组合风险和回测真实化
   - 组合风险继续加入真实持仓成本、仓位金额和行业集中度阈值。
   - 回测策略可增加可配置买卖规则，并保存每次参数组合。

4. 报告导出增强
   - 已把真实数据来源、通达信校验、同花顺解析、资金流 fallback、数据质量检查和运行配置写入报告“数据可信度”章节。
   - 后续可继续增加公司复盘固定封面、结论页和风险提示模板。

5. GitHub 协作
   - 到公司后先执行 `git fetch --all` 和 `git pull --ff-only origin local-codex-progress`。
   - 若公司也改了同一分支，先看 `git log --oneline --decorate --graph --all -20`，再决定 merge/rebase。
