from app.ai.normalizer import build_normalized_text
from app.ai.scorer import text_score


def test_custom_category_is_included_in_normalized_text() -> None:
    normalized = build_normalized_text("ETC", "접이식 의자", ["BLUE"], None, "캠핑용품", "민트색")

    assert "[카테고리] 캠핑용품" in normalized
    assert "[색상] 파랑" in normalized
    assert "민트색" in normalized


def test_text_score_uses_embedding_cosine_similarity_when_available() -> None:
    assert text_score("a", "b", [1.0, 0.0], [1.0, 0.0]) == 1.0
    assert text_score("a", "b", [1.0, 0.0], [0.0, 1.0]) == 0.0
