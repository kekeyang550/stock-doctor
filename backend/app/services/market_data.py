from app.schemas.diagnosis import (
    CapitalSnapshot,
    FundamentalSnapshot,
    MarketOverview,
    RiskSnapshot,
    StockSnapshot,
    StockSummary,
    TechnicalSnapshot,
)
from app.services.storage import StateStore, create_state_store


class MockMarketDataProvider:
    """Deterministic seed data until real AKShare/Tushare connectors are added."""

    def __init__(self, state_store: StateStore | None = None) -> None:
        self._state_store = state_store or create_state_store()
        self._default_watchlist = ["600519", "300750", "002594"]
        self._watchlist_symbols = self._state_store.load_watchlist(self._default_watchlist)
        self._snapshots = {
            "600519": StockSnapshot(
                symbol="600519",
                name="贵州茅台",
                industry="白酒",
                last_price=1518.3,
                change_pct=1.18,
                as_of="2026-07-10",
                technical=TechnicalSnapshot(
                    ma5=1502.6, ma20=1478.4, ma60=1439.7, rsi14=62.5, macd=8.4, volume_ratio=1.16
                ),
                fundamental=FundamentalSnapshot(
                    pe_ttm=24.8, pb=8.3, roe=31.4, revenue_growth=14.2, profit_growth=15.7, industry_pe_percentile=54
                ),
                capital=CapitalSnapshot(
                    main_inflow_million=412.5, northbound_inflow_million=188.2, turnover_rate=0.42
                ),
                risk=RiskSnapshot(pledge_ratio=0.8, unlock_days=None, st_flag=False, limit_up_streak=0),
            ),
            "300750": StockSnapshot(
                symbol="300750",
                name="宁德时代",
                industry="电池",
                last_price=214.8,
                change_pct=-0.74,
                as_of="2026-07-10",
                technical=TechnicalSnapshot(
                    ma5=217.1, ma20=222.6, ma60=208.3, rsi14=46.2, macd=-1.9, volume_ratio=0.92
                ),
                fundamental=FundamentalSnapshot(
                    pe_ttm=18.6, pb=3.9, roe=22.1, revenue_growth=8.5, profit_growth=10.8, industry_pe_percentile=37
                ),
                capital=CapitalSnapshot(
                    main_inflow_million=-155.6, northbound_inflow_million=91.4, turnover_rate=0.88
                ),
                risk=RiskSnapshot(pledge_ratio=2.7, unlock_days=42, st_flag=False, limit_up_streak=0),
            ),
            "002594": StockSnapshot(
                symbol="002594",
                name="比亚迪",
                industry="汽车整车",
                last_price=284.2,
                change_pct=2.85,
                as_of="2026-07-10",
                technical=TechnicalSnapshot(
                    ma5=273.4, ma20=265.9, ma60=251.2, rsi14=70.8, macd=7.2, volume_ratio=1.74
                ),
                fundamental=FundamentalSnapshot(
                    pe_ttm=22.4, pb=4.6, roe=24.8, revenue_growth=17.3, profit_growth=18.2, industry_pe_percentile=61
                ),
                capital=CapitalSnapshot(
                    main_inflow_million=638.9, northbound_inflow_million=244.0, turnover_rate=1.36
                ),
                risk=RiskSnapshot(pledge_ratio=4.1, unlock_days=18, st_flag=False, limit_up_streak=0),
            ),
            "000001": StockSnapshot(
                symbol="000001",
                name="平安银行",
                industry="股份制银行",
                last_price=10.62,
                change_pct=0.19,
                as_of="2026-07-10",
                technical=TechnicalSnapshot(
                    ma5=10.55, ma20=10.48, ma60=10.21, rsi14=58.7, macd=0.07, volume_ratio=0.81
                ),
                fundamental=FundamentalSnapshot(
                    pe_ttm=4.9, pb=0.52, roe=10.7, revenue_growth=2.8, profit_growth=3.3, industry_pe_percentile=29
                ),
                capital=CapitalSnapshot(
                    main_inflow_million=73.4, northbound_inflow_million=-28.6, turnover_rate=0.31
                ),
                risk=RiskSnapshot(pledge_ratio=1.2, unlock_days=None, st_flag=False, limit_up_streak=0),
            ),
        }

    def list_stocks(self) -> list[StockSummary]:
        return [
            StockSummary(
                symbol=s.symbol,
                name=s.name,
                industry=s.industry,
                last_price=s.last_price,
                change_pct=s.change_pct,
            )
            for s in self._snapshots.values()
        ]

    def get_market_overview(self) -> MarketOverview:
        changes = [snapshot.change_pct for snapshot in self._snapshots.values()]
        advancing = len([change for change in changes if change >= 0])
        declining = len(changes) - advancing
        hot_industries = [
            snapshot.industry
            for snapshot in sorted(self._snapshots.values(), key=lambda item: item.change_pct, reverse=True)
        ][:3]
        return MarketOverview(
            as_of="2026-07-10",
            index_name="沪深 300",
            index_level=4216.38,
            index_change_pct=0.72,
            advancing=advancing,
            declining=declining,
            hot_industries=hot_industries,
            risk_notes=["成交额温和放大", "高位题材股波动率上升", "财报窗口期需关注业绩预告"],
        )

    def get_data_sources(self) -> list[dict[str, str]]:
        return [
            {"name": "Mock A股样例库", "status": "online", "role": "MVP 诊断回归数据"},
            {"name": "AKShare", "status": "planned", "role": "行情、指数、板块、资金流"},
            {"name": "Tushare Pro", "status": "planned", "role": "财务、基础资料、复权日线"},
        ]

    def get_watchlist(self) -> list[StockSummary]:
        summaries = {stock.symbol: stock for stock in self.list_stocks()}
        return [summaries[symbol] for symbol in self._watchlist_symbols if symbol in summaries]

    def add_to_watchlist(self, symbol: str) -> bool:
        normalized = symbol.strip().upper()
        if normalized not in self._snapshots:
            return False
        if normalized not in self._watchlist_symbols:
            self._watchlist_symbols.append(normalized)
            self._state_store.save_watchlist(self._watchlist_symbols)
        return True

    def remove_from_watchlist(self, symbol: str) -> None:
        normalized = symbol.strip().upper()
        self._watchlist_symbols = [item for item in self._watchlist_symbols if item != normalized]
        self._state_store.save_watchlist(self._watchlist_symbols)

    def replace_watchlist(self, symbols: list[str]) -> list[StockSummary]:
        next_symbols = []
        for symbol in symbols:
            normalized = symbol.strip().upper()
            if normalized in self._snapshots and normalized not in next_symbols:
                next_symbols.append(normalized)
        self._watchlist_symbols = next_symbols
        self._state_store.save_watchlist(self._watchlist_symbols)
        return self.get_watchlist()

    def get_snapshot(self, symbol: str) -> StockSnapshot | None:
        normalized = symbol.strip().upper()
        return self._snapshots.get(normalized)
