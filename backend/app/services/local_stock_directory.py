from dataclasses import dataclass
from pathlib import Path
from time import monotonic
from typing import Iterable

from app.config import settings


@dataclass(frozen=True)
class StockDirectoryEntry:
    symbol: str
    name: str
    source: str


class LocalStockDirectoryProvider:
    """Local A-share code/name index from desktop quote clients."""

    _A_SHARE_PREFIXES = ("000", "001", "002", "003", "300", "301", "600", "601", "603", "605", "688", "689")

    def __init__(
        self,
        stockname_paths: Iterable[str | Path] | None = None,
        cache_ttl_seconds: int = 300,
        clock=monotonic,
    ) -> None:
        if stockname_paths is None:
            stockname_paths = self._settings_paths()
        self._paths = [Path(path) for path in stockname_paths if str(path).strip()]
        self._cache_ttl_seconds = cache_ttl_seconds
        self._clock = clock
        self._cache: tuple[float, tuple[tuple[str, float, int], ...], list[StockDirectoryEntry]] | None = None

    def list_entries(self) -> list[StockDirectoryEntry]:
        fingerprint = self._fingerprint()
        if self._cache is not None:
            created_at, cached_fingerprint, entries = self._cache
            if cached_fingerprint == fingerprint and self._clock() - created_at <= self._cache_ttl_seconds:
                return entries
        by_symbol: dict[str, StockDirectoryEntry] = {}
        for path in self._paths:
            for entry in self._read_ths_stockname_file(path):
                by_symbol.setdefault(entry.symbol, entry)
        entries = sorted(by_symbol.values(), key=lambda item: item.symbol)
        self._cache = (self._clock(), fingerprint, entries)
        return entries

    def lookup(self, symbol: str) -> StockDirectoryEntry | None:
        normalized = symbol.strip().upper()
        return next((entry for entry in self.list_entries() if entry.symbol == normalized), None)

    def search(self, query: str, limit: int = 12) -> list[StockDirectoryEntry]:
        normalized_query = query.strip().lower()
        if not normalized_query:
            return self.list_entries()[: max(1, limit)]
        matches = [
            entry
            for entry in self.list_entries()
            if normalized_query in entry.symbol.lower() or normalized_query in entry.name.lower()
        ]
        matches.sort(
            key=lambda entry: (
                not entry.symbol.lower().startswith(normalized_query),
                not entry.name.lower().startswith(normalized_query),
                entry.symbol,
            )
        )
        return matches[: max(1, limit)]

    def get_data_source(self) -> dict[str, str]:
        paths = [path for path in self._paths if path.exists()]
        if not paths:
            return {
                "name": "同花顺本地股票名表",
                "status": "fallback",
                "role": "本地代码/名称索引未找到；名称搜索仅使用当前行情列表和代码直连。",
            }
        entries = self.list_entries()
        if not entries:
            return {
                "name": "同花顺本地股票名表",
                "status": "fallback",
                "role": "本地代码/名称索引文件存在，但没有解析到可用 A 股代码。",
            }
        latest = max(path.stat().st_mtime for path in paths)
        newest = next(path for path in paths if path.stat().st_mtime == latest)
        return {
            "name": "同花顺本地股票名表",
            "status": "online",
            "role": f"本地代码/名称索引；已加载 {len(entries)} 只 A 股；最新文件 {newest.name}。",
        }

    def _settings_paths(self) -> list[str]:
        configured = getattr(settings, "ths_stockname_paths", "")
        return [item.strip() for item in configured.split(";") if item.strip()]

    def _fingerprint(self) -> tuple[tuple[str, float, int], ...]:
        result = []
        for path in self._paths:
            if not path.exists():
                result.append((str(path), 0.0, 0))
                continue
            stat = path.stat()
            result.append((str(path), stat.st_mtime, stat.st_size))
        return tuple(result)

    def _read_ths_stockname_file(self, path: Path) -> list[StockDirectoryEntry]:
        if not path.exists():
            return []
        text = self._read_text(path)
        entries = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("[") or line.startswith("ConfigVer") or "=" not in line:
                continue
            symbol, payload = line.split("=", 1)
            symbol = symbol.strip().upper()
            name = payload.split("|", 1)[0].strip()
            if self._is_supported_a_share_symbol(symbol) and name:
                entries.append(StockDirectoryEntry(symbol=symbol, name=name, source=str(path)))
        return entries

    def _read_text(self, path: Path) -> str:
        for encoding in ("gbk", "utf-8"):
            try:
                return path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
        return path.read_text(encoding="gbk", errors="ignore")

    def _is_supported_a_share_symbol(self, symbol: str) -> bool:
        return len(symbol) == 6 and symbol.isdigit() and symbol.startswith(self._A_SHARE_PREFIXES)
