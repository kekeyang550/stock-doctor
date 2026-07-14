from datetime import date

from app.schemas.diagnosis import (
    CapitalSnapshot,
    DataConnectorHealth,
    DataConnectorRuntimeConfig,
    DataConnectorStatus,
    FundamentalSnapshot,
    ProviderCacheBucketStatus,
    ProviderCacheStatus,
    RiskSnapshot,
    StockSnapshot,
    TechnicalSnapshot,
)
from app.services.data_quality import DataQualityService
from app.services.market_data import MockMarketDataProvider


def test_data_quality_report_passes_for_complete_mock_snapshot():
    snapshot = MockMarketDataProvider().get_snapshot("600519").model_copy(update={"as_of": date.today().isoformat()})

    report = DataQualityService().build_report(snapshot)

    assert report.status == "pass"
    assert report.score == 100
    assert report.coverage_pct == 100
    assert {check.key for check in report.checks} == {
        "market",
        "source_coverage",
        "technical",
        "fundamental",
        "capital",
        "risk",
        "as_of",
    }


def test_data_quality_report_flags_invalid_fields():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "last_price": -1,
            "technical": TechnicalSnapshot.model_construct(
                ma5=0,
                ma20=1478.4,
                ma60=1439.7,
                rsi14=120,
                macd=8.4,
                volume_ratio=-0.2,
            ),
            "capital": CapitalSnapshot(main_inflow_million=0, northbound_inflow_million=0, turnover_rate=0.42),
            "risk": RiskSnapshot.model_construct(
                pledge_ratio=120,
                unlock_days=-1,
                st_flag=False,
                limit_up_streak=-1,
            ),
        }
    )

    report = DataQualityService().build_report(snapshot)

    assert report.status == "fail"
    assert report.score < 70
    failing_keys = {check.key for check in report.checks if check.status == "fail"}
    assert {"market", "technical", "risk"}.issubset(failing_keys)
    assert any(check.key == "capital" and check.status == "warn" for check in report.checks)


def test_data_quality_report_flags_invalid_optional_financial_ratios():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "fundamental": FundamentalSnapshot(
                pe_ttm=18,
                pb=2.1,
                roe=21,
                revenue_growth=13,
                profit_growth=16,
                industry_pe_percentile=31,
                gross_margin=128,
                debt_to_assets=135,
                cashflow_to_profit=800,
                current_ratio=28,
                quick_ratio=24,
            ),
        }
    )

    report = DataQualityService().build_report(snapshot)
    fundamental_check = next(check for check in report.checks if check.key == "fundamental")

    assert fundamental_check.status == "fail"
    assert "毛利率超出常规区间" in fundamental_check.detail
    assert "资产负债率超出 0-100" in fundamental_check.detail
    assert "现金流利润比超出常规区间" in fundamental_check.detail
    assert "流动比率超出常规区间" in fundamental_check.detail
    assert "速动比率超出常规区间" in fundamental_check.detail


def test_data_quality_report_warns_for_conservative_real_data_fields():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "as_of": date.today().isoformat(),
            "data_sources": ["fundamental-quote-detail", "sina-capital-flow", "tdx-kline"],
            "conservative_fields": ["growth", "northbound"],
        }
    )

    report = DataQualityService().build_report(snapshot)
    source_check = next(check for check in report.checks if check.key == "source_coverage")

    assert report.status == "warn"
    assert report.score == 90
    assert source_check.status == "warn"
    assert "东方财富估值详情" in source_check.detail
    assert "新浪资金流兜底" in source_check.detail
    assert "通达信本地 K 线" in source_check.detail
    assert "成长字段" in source_check.detail
    assert "北向资金" in source_check.detail


def test_data_quality_report_labels_tushare_financial_sources():
    base = MockMarketDataProvider().get_snapshot("600519")
    snapshot = base.model_copy(
        update={
            "as_of": date.today().isoformat(),
            "data_sources": ["tushare-daily-basic", "tushare-fina-indicator", "tushare-stock-basic"],
            "conservative_fields": [],
        }
    )

    report = DataQualityService().build_report(snapshot)
    source_check = next(check for check in report.checks if check.key == "source_coverage")

    assert source_check.status == "pass"
    assert "Tushare 日行情基础指标" in source_check.detail
    assert "Tushare 财务指标" in source_check.detail
    assert "Tushare 基础资料" in source_check.detail


def test_data_quality_report_warns_for_runtime_fallback_and_cache():
    snapshot = MockMarketDataProvider().get_snapshot("600519").model_copy(update={"as_of": date.today().isoformat()})
    health = DataConnectorHealth(
        active_provider="eastmoney",
        fallback_provider="mock",
        runtime_config=DataConnectorRuntimeConfig(
            request_timeout_seconds=8,
            cache_ttl_seconds=300,
            freshness_stale_after_minutes=30,
        ),
        cache_status=ProviderCacheStatus(
            ttl_seconds=300,
            generated_at="2026-07-13T00:00:00Z",
            buckets=[
                ProviderCacheBucketStatus(
                    key="history",
                    label="历史行情",
                    entries=2,
                    active_entries=0,
                    expired_entries=2,
                    nearest_expires_in_seconds=0,
                    hit_count=1,
                    miss_count=4,
                    hit_rate_pct=20,
                    status="expired",
                )
            ],
        ),
        connectors=[
            DataConnectorStatus(
                name="东方财富",
                status="online",
                active=True,
                role="主源",
                package="requests",
                package_installed=True,
                configured_provider="eastmoney",
                latency_ms=None,
                last_checked_at="2026-07-13T00:00:00Z",
                message="在线",
                next_action="继续观察",
            ),
            DataConnectorStatus(
                name="腾讯行情",
                status="fallback",
                active=False,
                role="备用",
                package="requests",
                package_installed=True,
                configured_provider="eastmoney",
                latency_ms=None,
                last_checked_at="2026-07-13T00:00:00Z",
                message="备用",
                next_action="继续观察",
            ),
            DataConnectorStatus(
                name="新浪资金流",
                status="fallback",
                active=False,
                role="备用",
                package="requests",
                package_installed=True,
                configured_provider="eastmoney",
                latency_ms=None,
                last_checked_at="2026-07-13T00:00:00Z",
                message="备用",
                next_action="继续观察",
            ),
            DataConnectorStatus(
                name="通达信本地日线",
                status="fallback",
                active=False,
                role="本地",
                package=None,
                package_installed=True,
                configured_provider="eastmoney",
                latency_ms=None,
                last_checked_at="2026-07-13T00:00:00Z",
                message="备用",
                next_action="继续观察",
            ),
        ],
    )

    report = DataQualityService().build_report(snapshot, connector_health=health)
    runtime_check = next(check for check in report.checks if check.key == "runtime_environment")

    assert report.status == "warn"
    assert report.score == 90
    assert runtime_check.status == "warn"
    assert "fallback" in runtime_check.detail
    assert "历史行情" in runtime_check.detail
    assert "缓存平均命中率 20.0%" in runtime_check.detail
