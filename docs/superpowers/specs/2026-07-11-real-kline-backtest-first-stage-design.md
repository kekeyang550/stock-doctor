# 真实历史 K 线回测第一阶段设计

## 背景

当前策略回测使用 `TrendService` 根据快照合成样例走势，适合演示规则命中、持有周期、收益和回撤统计，但不适合做更接近真实研究的历史表现观察。AKShare 适配器已经具备内部 `_call_history_rows()` 能力，但还没有通过 provider 协议暴露，也没有被回测服务使用。

## 目标

- 新增统一的历史日线数据结构和 provider 接口。
- Mock provider 返回确定性历史日线，保证测试和本地体验稳定。
- AKShare provider 暴露 `get_price_history()`，复用已有 `stock_zh_a_hist` 调用和行解析能力。
- 策略回测优先使用 provider 历史日线；当历史日线不足时自动回退到现有合成趋势。
- 前端“策略回测”面板展示当前价格来源，让用户知道结果来自“历史K线”还是“样例趋势”。

## 推荐方案

采用“provider 历史日线接口 + 回测服务 fallback”的方案。

- 在 schema 中新增 `HistoricalPriceBar`。
- 在 `MarketDataProvider` 协议中新增 `get_price_history(symbol: str, days: int = 60) -> list[HistoricalPriceBar]`。
- `MockMarketDataProvider` 生成确定性日线，最后一天价格与 `StockSnapshot.last_price` 对齐。
- `AkshareMarketDataProvider.get_price_history()` 调用 `stock_zh_a_hist`，解析日期、收盘、成交量，返回最近 N 条有效日线；失败返回空列表并记录 `_last_error`。
- `StrategyBacktestService` 新增可选 `market_data_provider`，每笔交易先取历史日线，长度不足时才调用 `TrendService.build_series()`。
- `StrategyBacktestReport` 和 `StrategyBacktestPeriodSummary` 新增 `price_source`，取值为 `historical-kline` 或 `synthetic-trend`。

## 数据流

1. API route 继续收集候选股票快照和诊断结果。
2. route 调用 `strategy_backtest_service.run(...)`。
3. service 针对每个候选股票调用 provider 的 `get_price_history(symbol, days)`。
4. 如果历史日线不少于 `holding_days + 1`，用历史日线计算 entry/exit、收益和最大回撤。
5. 如果历史日线不足或 provider 不支持，回退到 `TrendService.build_series()`。
6. report 返回 `price_source`；前端渲染为“历史K线”或“样例趋势”。

## 错误态

- 历史日线接口异常不让回测失败，只回退到样例趋势。
- 单只股票历史日线不足只影响该股票的价格来源，不影响其他股票。
- 如果一份报告中至少一笔交易使用历史日线，报告 `price_source` 为 `historical-kline`；否则为 `synthetic-trend`。

## 测试

- Provider 测试：Mock provider 返回指定数量历史日线，最后一条收盘价等于快照当前价。
- AKShare provider 测试：`get_price_history()` 能把 fake AKShare 历史行解析为日线。
- 回测服务测试：传入带历史日线的 provider 时，报告 `price_source` 为 `historical-kline`，交易 entry/exit 来自历史日线。
- API 测试：`/api/v1/backtests/strategy` 返回 `price_source`。
- 前端测试：策略回测面板显示“价格来源”和“历史K线”。

## 非目标

- 不做真实撮合、手续费、滑点、停复牌、涨跌停成交限制。
- 不做复权参数配置；AKShare 第一阶段固定使用前复权 `qfq`。
- 不做持久化历史行情缓存。
- 不替换当前趋势图接口；趋势图仍可继续使用现有 `TrendService`。
