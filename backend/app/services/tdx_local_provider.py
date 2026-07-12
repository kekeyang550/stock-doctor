import struct
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas.diagnosis import HistoricalPriceBar


class TdxLocalHistoryProvider:
    """Read local TongDaXin vipdoc daily K-line files."""

    _RECORD_SIZE = 32

    def __init__(self, vipdoc_path: str | Path | None = None) -> None:
        self._vipdoc_path = Path(vipdoc_path or settings.tdx_vipdoc_path)
        self._last_error: str | None = None
        self._last_reference: dict[str, Any] | None = None

    def get_price_history(self, symbol: str, days: int = 240) -> list[HistoricalPriceBar]:
        path = self._day_file(symbol)
        if not path.exists():
            self._last_error = f"未找到通达信日线文件：{path}"
            return []
        try:
            data = path.read_bytes()
            bars = self._parse_day_bytes(data)
        except Exception as exc:
            self._last_error = str(exc)
            return []
        self._last_error = None
        days = max(2, min(days, 240))
        return bars[-days:]

    def describe(self, symbols: list[str] | None = None) -> dict[str, Any]:
        symbols = symbols or ["600519", "300750", "002594", "000001"]
        reports = []
        for symbol in symbols:
            path = self._day_file(symbol)
            if not path.exists():
                reports.append({"symbol": symbol, "exists": False, "rows": 0, "last_date": None})
                continue
            bars = self.get_price_history(symbol, days=240)
            reports.append(
                {
                    "symbol": symbol,
                    "exists": True,
                    "rows": len(bars),
                    "last_date": bars[-1].date if bars else None,
                    "last_close": bars[-1].close if bars else None,
                    "path": str(path),
                }
            )
        usable = [item for item in reports if item["exists"] and item["rows"] > 0]
        latest_dates = [item["last_date"] for item in usable if item["last_date"]]
        return {
            "path": str(self._vipdoc_path),
            "exists": self._vipdoc_path.exists(),
            "checked_symbols": reports,
            "usable_count": len(usable),
            "latest_date": max(latest_dates) if latest_dates else None,
            "last_error": self._last_error,
            "last_reference": self._last_reference,
        }

    def record_reference_check(self, symbol: str, primary_rows: list[dict[str, Any]]) -> None:
        bars = self.get_price_history(symbol, days=5)
        if not bars or not primary_rows:
            return
        primary = primary_rows[-1]
        try:
            primary_close = float(primary.get("close", 0))
        except (TypeError, ValueError):
            return
        tdx_bar = bars[-1]
        diff_pct = ((primary_close - tdx_bar.close) / tdx_bar.close * 100) if tdx_bar.close > 0 else 0
        self._last_reference = {
            "symbol": symbol,
            "tdx_date": tdx_bar.date,
            "tdx_close": tdx_bar.close,
            "primary_close": round(primary_close, 2),
            "diff_pct": round(diff_pct, 4),
        }

    def get_data_source(self, symbols: list[str] | None = None) -> dict[str, str]:
        status = self.describe(symbols)
        if not status["exists"]:
            return {
                "name": "通达信本地日线",
                "status": "missing-package",
                "role": f"未找到 vipdoc 目录：{status['path']}",
            }
        if status["usable_count"] <= 0:
            return {
                "name": "通达信本地日线",
                "status": "fallback",
                "role": f"vipdoc 可访问，但样本股票日线不可用；路径 {status['path']}",
            }
        detail = f"本地日线可读，样本 {status['usable_count']} 只，最新交易日 {status['latest_date']}。"
        reference = status.get("last_reference")
        if reference:
            detail = (
                f"{detail} 最近校验 {reference['symbol']}：通达信 {reference['tdx_close']}，"
                f"主源 {reference['primary_close']}，差异 {reference['diff_pct']}%。"
            )
        return {
            "name": "通达信本地日线",
            "status": "online",
            "role": f"本地历史 K 线参考/兜底；{detail}",
        }

    def _day_file(self, symbol: str) -> Path:
        normalized = symbol.strip().upper()
        market = "sh" if normalized.startswith(("5", "6", "9")) or normalized == "000300" else "sz"
        return self._vipdoc_path / market / "lday" / f"{market}{normalized}.day"

    def _parse_day_bytes(self, data: bytes) -> list[HistoricalPriceBar]:
        bars = []
        usable_length = len(data) - (len(data) % self._RECORD_SIZE)
        for offset in range(0, usable_length, self._RECORD_SIZE):
            trade_date, _open, _high, _low, close, _amount, volume, _reserved = struct.unpack(
                "<IIIIIfII",
                data[offset:offset + self._RECORD_SIZE],
            )
            if trade_date <= 0 or close <= 0:
                continue
            date_text = str(trade_date)
            if len(date_text) != 8:
                continue
            bars.append(
                HistoricalPriceBar(
                    date=f"{date_text[:4]}-{date_text[4:6]}-{date_text[6:]}",
                    close=round(close / 100, 2),
                    volume=float(max(0, volume)),
                )
            )
        return bars
