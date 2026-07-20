"""Matching score calculator per spec §8.2-§8.5.

Note: text similarity uses difflib.SequenceMatcher over the normalized_text
sentences as a lightweight MVP stand-in for the real multilingual
Sentence-Transformer embedding (TEXT_MODEL_NAME / app/ai/text_encoder.py).
Swapping in the real model later does not change this module's contract:
every *_score function still returns a value in [0, 1] or None when the
inputs required for that dimension are missing.
"""

import difflib
from datetime import date

WEIGHTS: dict[str, float] = {
    "text": 0.35,
    "image": 0.25,
    "category": 0.15,
    "color": 0.10,
    "location": 0.10,
    "date": 0.05,
}


def text_score(lost_normalized_text: str, found_normalized_text: str) -> float:
    return difflib.SequenceMatcher(None, lost_normalized_text, found_normalized_text).ratio()


def category_score(lost_category: str, found_category: str) -> float | None:
    if not lost_category or not found_category:
        return None
    return 1.0 if lost_category == found_category else 0.0


def color_score(lost_colors: list[str], found_colors: list[str]) -> float | None:
    if not lost_colors or not found_colors:
        return None
    lost_set, found_set = set(lost_colors), set(found_colors)
    union = lost_set | found_set
    if not union:
        return None
    return len(lost_set & found_set) / len(union)


def location_score(lost_region_code: str, found_region_code: str) -> float | None:
    if not lost_region_code or not found_region_code:
        return None
    return 1.0 if lost_region_code == found_region_code else 0.20


def date_score(lost_date: date, found_date: date) -> float | None:
    diff_days = (found_date - lost_date).days
    if diff_days < 0:
        diff_days = 0
    if diff_days <= 1:
        return 1.00
    if diff_days <= 7:
        return 0.90
    if diff_days <= 30:
        return 0.70
    if diff_days <= 90:
        return 0.40
    if diff_days <= 180:
        return 0.20
    return None


def compute_final_score(scores: dict[str, float | None]) -> float:
    available = {key: value for key, value in scores.items() if value is not None}
    weight_sum = sum(WEIGHTS[key] for key in available)
    if weight_sum == 0:
        return 0.0
    weighted_sum = sum(value * WEIGHTS[key] for key, value in available.items())
    return round(min(max(weighted_sum / weight_sum, 0.0), 1.0), 4)


def score_label(final_score: float) -> str:
    if final_score >= 0.78:
        return "HIGH"
    if final_score >= 0.65:
        return "MEDIUM"
    return "LOW"


_REASON_RULES: list[tuple[str, float, str]] = [
    ("text", 0.75, "물품명과 상세 특징이 유사합니다."),
    ("image", 0.80, "등록한 사진과 외형이 유사합니다."),
    ("category", 1.0, "물품 종류가 일치합니다."),
    ("color", 0.80, "색상이 일치합니다."),
    ("location", 0.75, "분실 장소와 가까운 지역에서 습득되었습니다."),
    ("date", 0.90, "분실 시점과 가까운 날짜에 습득되었습니다."),
]


def build_reasons(scores: dict[str, float | None]) -> list[str]:
    candidates: list[tuple[float, str]] = []
    for key, threshold, message in _REASON_RULES:
        value = scores.get(key)
        if value is not None and value >= threshold:
            candidates.append((value, message))
    candidates.sort(key=lambda item: item[0], reverse=True)
    return [message for _, message in candidates[:3]]
