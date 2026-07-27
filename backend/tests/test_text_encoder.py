import numpy as np
import pytest

from app.ai.text_encoder import _MODEL_DIR, encode_text, encode_texts

pytestmark = pytest.mark.skipif(
    not (_MODEL_DIR / "model_quantized.onnx").exists(),
    reason="ONNX embedding model not present (baked into the Docker image at build time)",
)


def test_encode_text_returns_normalized_384_dim_vector() -> None:
    vector = encode_text("검은색 지갑을 잃어버렸어요")
    assert len(vector) == 384
    assert np.linalg.norm(vector) == pytest.approx(1.0, abs=1e-4)


def test_encode_texts_similar_meaning_scores_higher_than_unrelated() -> None:
    vectors = encode_texts(
        [
            "검은색 지갑을 잃어버렸어요",
            "까만 지갑을 잃어버렸습니다",
            "아이폰 16 프로 분실했습니다",
        ]
    )
    similar_pair = float(np.dot(vectors[0], vectors[1]))
    unrelated_pair = float(np.dot(vectors[0], vectors[2]))
    assert similar_pair > unrelated_pair


def test_encode_texts_empty_list_returns_empty_array() -> None:
    assert encode_texts([]).shape == (0, 0)
