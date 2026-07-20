import re
import unicodedata

COLOR_SYNONYMS: dict[str, str] = {
    "검정": "BLACK",
    "검은색": "BLACK",
    "블랙": "BLACK",
    "흰색": "WHITE",
    "하얀색": "WHITE",
    "화이트": "WHITE",
    "남색": "NAVY",
    "네이비": "NAVY",
    "베이지": "BEIGE",
    "크림": "BEIGE",
    "회색": "GRAY",
    "그레이": "GRAY",
}

CATEGORY_LABELS: dict[str, str] = {
    "WALLET": "지갑·카드지갑",
    "PHONE": "휴대전화",
    "EARPHONE": "이어폰·헤드폰",
    "BAG": "가방·파우치",
    "ID_CARD": "신분증·카드",
    "ELECTRONICS": "전자기기",
    "CLOTHING": "의류",
    "JEWELRY": "귀금속·시계",
    "KEY": "열쇠",
    "ETC": "기타",
}

COLOR_LABELS: dict[str, str] = {
    "BLACK": "검정",
    "WHITE": "흰색",
    "NAVY": "남색",
    "BEIGE": "베이지",
    "GRAY": "회색",
}

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_whitespace(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def standardize_color_text(raw: str) -> str | None:
    """Map a free-text color mention to a standard color code, if recognized."""
    normalized = normalize_whitespace(raw)
    for synonym, code in COLOR_SYNONYMS.items():
        if synonym in normalized:
            return code
    return None


def build_normalized_text(
    category_code: str,
    title: str,
    color_codes: list[str],
    description: str | None,
) -> str:
    """Build the AI-input sentence per spec §7.1. Region/date are scored separately
    and intentionally excluded."""
    category_label = CATEGORY_LABELS.get(category_code, category_code)
    color_labels = ", ".join(COLOR_LABELS.get(code, code) for code in color_codes) or "정보없음"
    parts = [
        f"[카테고리] {category_label}",
        f"[물품명] {normalize_whitespace(title)}",
        f"[색상] {color_labels}",
    ]
    if description:
        parts.append(f"[설명] {normalize_whitespace(description)}")
    return "\n".join(parts)
