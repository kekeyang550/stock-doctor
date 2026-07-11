# 缓存命中率遥测设计

## 背景

数据可信度面板已经展示 provider 缓存桶条目、有效条目和过期条目，但“缓存命中情况”仍偏静态。真实调试时，还需要知道某类数据是否正在被缓存命中，还是频繁穿透到远端接口。

## 目标

- 每个缓存桶暴露 `hit_count`、`miss_count`、`hit_rate_pct`。
- 前端数据可信度面板展示命中率。
- HTML 研究报告同步导出命中率。

## 非目标

- 不做跨进程持久化统计。
- 不新增可视化图表。
- 不改变缓存 TTL 策略。

## 方案

`AkshareMarketDataProvider` 为三类缓存维护计数器：

- `stock_list`
- `snapshots`
- `history`

缓存命中时增加 hit，缓存不存在或过期并继续尝试加载时增加 miss。`get_cache_status()` 将计数写入每个 bucket。

前端在缓存桶卡片 detail 中展示：

`命中 X / 未命中 Y · 命中率 Z%`

HTML 报告的缓存桶明细同步导出。
