from app.ai.normalizer import build_normalized_text


def test_custom_category_is_included_in_normalized_text() -> None:
    normalized = build_normalized_text(
        "ETC", "접이식 의자", ["BLUE"], None, "캠핑용품", "민트색"
    )

    assert "[카테고리] 캠핑용품" in normalized
    assert "[색상] 파랑" in normalized
    assert "민트색" in normalized
