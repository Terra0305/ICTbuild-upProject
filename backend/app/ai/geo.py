"""Region and proximity helpers for location-aware matching.

LOST112 does not return a normalised region or coordinates for found items; the
only location signal is the free-text storage place (e.g. "광주동부경찰서"). We
resolve a province code from keywords and, for a small gazetteer of well-known
places, approximate coordinates so nearby candidates can be ranked by distance.
Coordinates are approximate (building-level accuracy is not needed for a
1-5 km decision).
"""

import math

# (keyword, 시·도 코드) — longer / more specific keywords first.
_REGION_KEYWORDS: tuple[tuple[str, str], ...] = (
    ("서울", "11"),
    ("부산", "26"),
    ("대구", "27"),
    ("인천", "28"),
    ("광주광역시", "29"),
    ("광주서부", "29"),
    ("광주동부", "29"),
    ("광주남부", "29"),
    ("광주북부", "29"),
    ("광주광산", "29"),
    ("광주지방", "29"),
    ("광주", "29"),
    ("조선대", "29"),
    ("전남대", "29"),
    ("대전", "30"),
    ("울산", "31"),
    ("세종", "36"),
    ("경기", "41"),
    ("수원", "41"),
    ("성남", "41"),
    ("강원", "42"),
    ("충북", "43"),
    ("충청북도", "43"),
    ("충남", "44"),
    ("충청남도", "44"),
    ("전북", "45"),
    ("전라북도", "45"),
    ("전남", "46"),
    ("전라남도", "46"),
    ("목포", "46"),
    ("여수", "46"),
    ("순천", "46"),
    ("나주", "46"),
    ("경북", "47"),
    ("경상북도", "47"),
    ("경남", "48"),
    ("경상남도", "48"),
    ("제주", "50"),
)

# keyword -> (latitude, longitude, 시·도 코드)
_LANDMARKS: dict[str, tuple[float, float, str]] = {
    "조선대": (35.1440, 126.9330, "29"),
    "전남대": (35.1760, 126.9070, "29"),
    "광주역": (35.1654, 126.9094, "29"),
    "송정역": (35.1378, 126.7930, "29"),
    "유스퀘어": (35.1602, 126.8790, "29"),
    "충장로": (35.1478, 126.9172, "29"),
    "상무지구": (35.1530, 126.8490, "29"),
    "광주동부경찰서": (35.1465, 126.9239, "29"),
    "광주서부경찰서": (35.1520, 126.8890, "29"),
    "광주남부경찰서": (35.1330, 126.9020, "29"),
    "광주북부경찰서": (35.1740, 126.9120, "29"),
    "광주광산경찰서": (35.1393, 126.7937, "29"),
}

# Beyond this distance a pair with known coordinates is not a plausible match.
MAX_CANDIDATE_DISTANCE_KM = 5.0


def region_from_text(*texts: str | None) -> str:
    """Best-effort 시·도 code from free text; empty string when unknown.

    Explicit region names win; landmarks are only a fallback so that a generic
    suffix can never override the city (e.g. "제주동부경찰서" is not 광주).
    """
    for text in texts:
        if not text:
            continue
        compact = text.replace(" ", "")
        # The earliest mention wins ("경기도광주" is 경기, not 광주); ties go to the longer name.
        hits = [
            (compact.index(keyword), -len(keyword), code)
            for keyword, code in _REGION_KEYWORDS
            if keyword in compact
        ]
        if hits:
            return min(hits)[2]
    for text in texts:
        if not text:
            continue
        compact = text.replace(" ", "")
        for keyword, (_, _, code) in _LANDMARKS.items():
            if keyword in compact:
                return code
    return ""


def coordinates_from_text(*texts: str | None) -> tuple[float, float] | None:
    for text in texts:
        if not text:
            continue
        compact = text.replace(" ", "")
        # Prefer the longest (most specific) landmark keyword.
        for keyword in sorted(_LANDMARKS, key=len, reverse=True):
            if keyword in compact:
                lat, lon, _ = _LANDMARKS[keyword]
                return lat, lon
    return None


def distance_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * 6371.0 * math.asin(math.sqrt(h))
