import re


_A_SHARE_SYMBOL_PATTERN = re.compile(
    r"^(?:(?P<prefix>SH|SZ|BJ)[.\-_\s]*)?(?P<code>\d{6})(?:[.\-_\s]*(?P<suffix>SH|SZ|BJ))?$",
    re.IGNORECASE,
)


def normalize_a_share_symbol(value: str | None) -> str:
    text = str(value or "").strip().upper()
    compact = re.sub(r"\s+", "", text)
    match = _A_SHARE_SYMBOL_PATTERN.match(compact)
    if match:
        return match.group("code")
    return text


def looks_like_a_share_symbol(value: str | None) -> bool:
    symbol = normalize_a_share_symbol(value)
    return len(symbol) == 6 and symbol.isdigit()
