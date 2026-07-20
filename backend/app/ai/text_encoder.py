"""Hugging Face text embedding encoder for lost-and-found matching."""

from __future__ import annotations

from threading import Lock

import numpy as np

from app.core.config import get_settings

_encoder = None
_encoder_lock = Lock()


def get_text_encoder():
    """Load the configured SentenceTransformer once per process."""
    global _encoder
    if _encoder is None:
        with _encoder_lock:
            if _encoder is None:
                from sentence_transformers import SentenceTransformer

                _encoder = SentenceTransformer(get_settings().text_model_name)
    return _encoder


def encode_texts(texts: list[str]) -> np.ndarray:
    """Return L2-normalized float32 vectors suitable for FAISS Inner Product."""
    if not texts:
        return np.empty((0, 0), dtype=np.float32)

    vectors = get_text_encoder().encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype=np.float32)


def encode_text(text: str) -> list[float]:
    """Embed one normalized-text value for database storage."""
    return encode_texts([text])[0].tolist()
