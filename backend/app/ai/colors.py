"""Map free-text colour names (as LOST112 writes them) to our colour codes.

LOST112 does not use one spelling: "검정", "검정색", "검은색" and "까만색" all
occur, so matching bare roots misses most of them. Keywords are matched
longest-first without overlap so that "검은색" is BLACK and never also SILVER
via its "은색" tail.
"""

import re

_COLOR_KEYWORDS: dict[str, tuple[str, ...]] = {
    "BLACK": ("검정", "검은", "검둥", "까만", "까망", "블랙", "먹색", "흑색"),
    "WHITE": ("흰", "하얀", "하양", "화이트", "백색", "우유색"),
    "GRAY": ("회색", "회", "그레이", "쥐색", "잿빛", "차콜"),
    "NAVY": ("남색", "네이비", "곤색", "감색"),
    "BEIGE": ("베이지", "아이보리", "크림", "살구", "카멜"),
    "RED": ("빨강", "빨간", "붉은", "적색", "레드", "버건디", "자홍"),
    "BLUE": ("파랑", "파란", "청색", "푸른", "블루", "하늘", "스카이", "청"),
    "GREEN": ("초록", "녹색", "연두", "그린", "카키", "올리브", "청록", "민트", "에메랄드"),
    "YELLOW": ("노랑", "노란", "황색", "옐로", "레몬", "겨자"),
    "PINK": ("분홍", "핑크", "연분홍"),
    "PURPLE": ("보라", "자주", "퍼플", "바이올렛", "자색", "라벤더"),
    "BROWN": ("갈색", "밤색", "브라운", "고동", "커피색", "초콜릿"),
    "ORANGE": ("주황", "오렌지", "귤색"),
    "SILVER": ("은색", "은빛", "실버"),
    "GOLD": ("금색", "금빛", "골드"),
    "TRANSPARENT": ("투명", "무색"),
}

_CODE_BY_KEYWORD = {kw: code for code, kws in _COLOR_KEYWORDS.items() for kw in kws}
_PATTERN = re.compile("|".join(sorted(map(re.escape, _CODE_BY_KEYWORD), key=len, reverse=True)))


def color_codes_from_text(raw: str | None) -> list[str]:
    """Colour codes found in `raw`, in order of appearance, without duplicates."""
    if not raw:
        return []
    compact = re.sub(r"\s+", "", raw)
    return list(dict.fromkeys(_CODE_BY_KEYWORD[m.group()] for m in _PATTERN.finditer(compact)))
