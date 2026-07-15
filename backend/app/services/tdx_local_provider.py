import struct
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas.diagnosis import HistoricalPriceBar, TdxProbeCandidate, TdxProbeResult
from app.services.symbols import normalize_a_share_symbol


class TdxLocalHistoryProvider:
    """Read local TongDaXin vipdoc daily K-line files."""

    _RECORD_SIZE = 32
    _SAMPLE_SYMBOLS = ("600519", "300750", "002594", "000001")
    _COMMON_ROOTS = (
        Path("E:/股票"),
        Path("E:/证券"),
        Path("E:/聚富财经论坛专用炒股软件"),
        Path("E:/操盘手2012"),
        Path("E:/Program Files"),
        Path("E:/Program Files (x86)"),
        Path("D:/同花顺软件"),
        Path("D:/股票"),
        Path("D:/证券"),
    )
    _DISCOVERY_CACHE: Path | None = None
    _DISCOVERY_DONE = False
    _MAX_STALE_DAYS = 30

    def __init__(self, vipdoc_path: str | Path | None = None) -> None:
        configured = Path(vipdoc_path or settings.tdx_vipdoc_path)
        self._configured_vipdoc_path = configured
        self._vipdoc_path = self.resolve_vipdoc_path(configured)
        self._auto_discovered = self._normalize(configured) != self._normalize(self._vipdoc_path)
        self._last_error: str | None = None
        self._last_reference: dict[str, Any] | None = None

    def get_price_history(self, symbol: str, days: int = 240) -> list[HistoricalPriceBar]:
        return self._read_price_history(symbol, days=days, allow_stale=False)

    def _read_price_history(self, symbol: str, days: int = 240, allow_stale: bool = False) -> list[HistoricalPriceBar]:
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
        if bars and not allow_stale and self._is_stale(bars[-1].date):
            self._last_error = f"通达信日线已过期：{bars[-1].date}"
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
            bars = self._read_price_history(symbol, days=240, allow_stale=True)
            reports.append(
                {
                    "symbol": symbol,
                    "exists": True,
                    "rows": len(bars),
                    "last_date": bars[-1].date if bars else None,
                    "last_close": bars[-1].close if bars else None,
                    "stale": self._is_stale(bars[-1].date) if bars else True,
                    "path": str(path),
                }
            )
        usable = [item for item in reports if item["exists"] and item["rows"] > 0 and not item.get("stale")]
        stale = [item for item in reports if item["exists"] and item["rows"] > 0 and item.get("stale")]
        latest_dates = [item["last_date"] for item in usable if item["last_date"]]
        all_latest_dates = [item["last_date"] for item in reports if item.get("last_date")]
        return {
            "configured_path": str(self._configured_vipdoc_path),
            "path": str(self._vipdoc_path),
            "auto_discovered": self._auto_discovered,
            "exists": self._vipdoc_path.exists(),
            "checked_symbols": reports,
            "usable_count": len(usable),
            "stale_count": len(stale),
            "latest_date": max(latest_dates) if latest_dates else max(all_latest_dates) if all_latest_dates else None,
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
                "role": f"未找到 vipdoc 目录：{status['configured_path']}",
            }
        if status["usable_count"] <= 0:
            if status["stale_count"] > 0:
                return {
                    "name": "通达信本地日线",
                    "status": "fallback",
                    "role": f"vipdoc 可访问但样本日线已过期，最新交易日 {status['latest_date']}；路径 {status['path']}",
                }
            return {
                "name": "通达信本地日线",
                "status": "fallback",
                "role": f"vipdoc 可访问，但样本股票日线不可用；路径 {status['path']}",
            }
        detail = f"本地日线可读，样本 {status['usable_count']} 只，最新交易日 {status['latest_date']}。"
        if status["auto_discovered"]:
            detail = f"{detail} 已自动使用 {status['path']}。"
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

    def probe_vipdoc(self) -> TdxProbeResult:
        candidates = self._probe_candidates()
        selected = next((candidate for candidate in candidates if candidate.selected), None)
        usable = [candidate for candidate in candidates if candidate.exists and not candidate.stale and candidate.sample_count > 0]
        stale = [candidate for candidate in candidates if candidate.exists and candidate.stale and candidate.sample_count > 0]
        if selected is not None and selected in usable:
            status = "pass"
            message = "通达信 vipdoc 可用，可作为本地历史 K 线参考与兜底。"
            next_action = "继续定期在通达信客户端补全日线，保持最新交易日接近当前日期。"
        elif usable:
            status = "warn"
            message = "发现可用 vipdoc，但当前配置未指向最优路径。"
            next_action = f"建议将 STOCK_DOCTOR_TDX_VIPDOC_PATH 设置为 {usable[0].path} 后重启后端。"
        elif stale:
            status = "warn"
            message = "发现 vipdoc，但样本日线已经过期，当前不会用于诊断或回测兜底。"
            next_action = "请在通达信客户端重新下载日线，或确认最新 vipdoc 目录后更新 STOCK_DOCTOR_TDX_VIPDOC_PATH。"
        else:
            status = "fail"
            message = "未发现可读的通达信 vipdoc 日线目录。"
            next_action = "请确认通达信安装位置，并在下载日线后配置 STOCK_DOCTOR_TDX_VIPDOC_PATH。"
        return TdxProbeResult(
            configured_path=str(self._configured_vipdoc_path),
            resolved_path=str(self._vipdoc_path),
            generated_at=datetime.now(timezone.utc).isoformat(),
            status=status,
            message=message,
            next_action=next_action,
            candidates=candidates,
        )

    @classmethod
    def resolve_vipdoc_path(cls, configured_path: str | Path | None = None) -> Path:
        configured = Path(configured_path or settings.tdx_vipdoc_path)
        if cls._is_usable_vipdoc(configured):
            return configured
        discovered = cls.discover_vipdoc_path()
        return discovered or configured

    @classmethod
    def discover_vipdoc_path(cls) -> Path | None:
        if cls._DISCOVERY_DONE:
            return cls._DISCOVERY_CACHE
        candidates = cls._discover_candidate_paths()
        scored = [
            (cls._candidate_score(candidate), candidate)
            for candidate in cls._dedupe_paths(candidates)
            if cls._is_vipdoc_shape(candidate)
        ]
        usable = [(score, path) for score, path in scored if score[2] > 0]
        if not usable:
            cls._DISCOVERY_CACHE = None
            cls._DISCOVERY_DONE = True
            return None
        usable.sort(key=lambda item: item[0], reverse=True)
        cls._DISCOVERY_CACHE = usable[0][1]
        cls._DISCOVERY_DONE = True
        return cls._DISCOVERY_CACHE

    def _probe_candidates(self) -> list[TdxProbeCandidate]:
        paths = [self._configured_vipdoc_path]
        paths.extend(self._discover_candidate_paths())
        candidates = []
        for path in self._dedupe_paths(paths):
            latest, coverage, rows = self._candidate_score(path)
            latest_date = self._format_yyyymmdd(latest)
            exists = self._is_vipdoc_shape(path)
            stale = self._is_stale(latest_date) if latest_date else True
            if not exists:
                note = "未找到 sh/lday 或 sz/lday 目录。"
            elif coverage <= 0:
                note = "目录形态正确，但样本股票日线缺失。"
            elif stale:
                note = f"样本最新交易日 {latest_date}，已过期。"
            else:
                note = f"样本最新交易日 {latest_date}，可用于本地 K 线参考。"
            candidates.append(
                TdxProbeCandidate(
                    path=str(path),
                    selected=self._normalize(path) == self._normalize(self._vipdoc_path),
                    exists=exists,
                    sample_count=coverage,
                    row_count=rows,
                    latest_date=latest_date,
                    stale=stale,
                    note=note,
                )
            )
        candidates.sort(key=lambda item: (item.selected, not item.stale, item.latest_date or "", item.sample_count, item.row_count), reverse=True)
        return candidates

    @classmethod
    def _discover_candidate_paths(cls) -> list[Path]:
        candidates: list[Path] = []
        for root in cls._COMMON_ROOTS:
            if not root.exists():
                continue
            candidates.extend(cls._direct_vipdoc_candidates(root))
            try:
                candidates.extend(path for path in root.rglob("vipdoc") if path.is_dir())
            except OSError:
                continue
        return candidates

    def _day_file(self, symbol: str) -> Path:
        normalized = normalize_a_share_symbol(symbol)
        market = "sh" if normalized.startswith(("5", "6", "9")) or normalized == "000300" else "sz"
        folder = self._vipdoc_path / market / "lday"
        lower = folder / f"{market}{normalized}.day"
        upper = folder / f"{market.upper()}{normalized}.day"
        return lower if lower.exists() or not upper.exists() else upper

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

    @classmethod
    def _direct_vipdoc_candidates(cls, root: Path) -> list[Path]:
        names = ("vipdoc", "Vipdoc", "VIPDOC")
        return [root / name for name in names if (root / name).is_dir()]

    @classmethod
    def _is_vipdoc_shape(cls, path: Path) -> bool:
        return (path / "sh" / "lday").is_dir() or (path / "sz" / "lday").is_dir()

    @classmethod
    def _is_usable_vipdoc(cls, path: Path) -> bool:
        _latest, _coverage, rows = cls._candidate_score(path)
        return rows > 0

    @classmethod
    def _candidate_score(cls, path: Path) -> tuple[int, int, int]:
        if not cls._is_vipdoc_shape(path):
            return (0, 0, 0)
        rows = 0
        coverage = 0
        latest = 0
        for symbol in cls._SAMPLE_SYMBOLS:
            market = "sh" if symbol.startswith(("5", "6", "9")) or symbol == "000300" else "sz"
            folder = path / market / "lday"
            for filename in (f"{market}{symbol}.day", f"{market.upper()}{symbol}.day"):
                day_file = folder / filename
                if not day_file.exists():
                    continue
                coverage += 1
                rows += max(1, day_file.stat().st_size // cls._RECORD_SIZE)
                date_hint = cls._latest_date_hint(day_file)
                if date_hint > latest:
                    latest = date_hint
                break
        return (latest, coverage, rows)

    @classmethod
    def _latest_date_hint(cls, path: Path) -> int:
        try:
            size = path.stat().st_size
            if size < cls._RECORD_SIZE:
                return 0
            with path.open("rb") as handle:
                handle.seek(size - cls._RECORD_SIZE)
                raw = handle.read(cls._RECORD_SIZE)
            trade_date = struct.unpack("<I", raw[:4])[0]
            text = str(trade_date)
            return trade_date if len(text) == 8 else 0
        except OSError:
            return 0

    @classmethod
    def _dedupe_paths(cls, paths: list[Path]) -> list[Path]:
        seen: set[str] = set()
        deduped: list[Path] = []
        for path in paths:
            key = cls._normalize(path)
            if key in seen:
                continue
            seen.add(key)
            deduped.append(path)
        return deduped

    @staticmethod
    def _normalize(path: Path) -> str:
        return str(path).rstrip("\\/").lower()

    @classmethod
    def _is_stale(cls, date_text: str | None) -> bool:
        if not date_text:
            return True
        try:
            latest = date.fromisoformat(date_text)
        except ValueError:
            return True
        return (date.today() - latest).days > cls._MAX_STALE_DAYS

    @staticmethod
    def _format_yyyymmdd(value: int) -> str | None:
        text = str(value)
        if len(text) != 8:
            return None
        return f"{text[:4]}-{text[4:6]}-{text[6:]}"
