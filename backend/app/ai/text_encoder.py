"""ONNX Runtime text embedding encoder for lost-and-found matching.

Uses a pre-exported, int8-quantized ONNX build of
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 instead of the
full torch/transformers stack: loading the fp32 model through torch pushed
the process past Railway's container memory limit and triggered repeated
OOM kills. The ONNX model has the same architecture and output dimension
(384), so existing stored embeddings remain compatible.
"""

from __future__ import annotations

from pathlib import Path
from threading import Lock

import numpy as np

_MODEL_DIR = Path(__file__).parent / "models" / "text-embed"

_session = None
_tokenizer = None
_lock = Lock()


def _load():
    global _session, _tokenizer
    if _session is None:
        with _lock:
            if _session is None:
                import onnxruntime as ort
                from tokenizers import Tokenizer

                tokenizer = Tokenizer.from_file(str(_MODEL_DIR / "tokenizer.json"))
                tokenizer.enable_padding(pad_id=0, pad_token="<pad>")
                tokenizer.enable_truncation(max_length=256)
                session = ort.InferenceSession(
                    str(_MODEL_DIR / "model_quantized.onnx"),
                    providers=["CPUExecutionProvider"],
                )
                _tokenizer, _session = tokenizer, session
    return _session, _tokenizer


def encode_texts(texts: list[str]) -> np.ndarray:
    """Return L2-normalized float32 vectors suitable for FAISS Inner Product."""
    if not texts:
        return np.empty((0, 0), dtype=np.float32)

    session, tokenizer = _load()
    encodings = tokenizer.encode_batch(list(texts))
    input_ids = np.array([e.ids for e in encodings], dtype=np.int64)
    attention_mask = np.array([e.attention_mask for e in encodings], dtype=np.int64)

    feed = {"input_ids": input_ids, "attention_mask": attention_mask}
    if "token_type_ids" in {i.name for i in session.get_inputs()}:
        feed["token_type_ids"] = np.zeros_like(input_ids)

    token_embeddings = session.run(None, feed)[0]

    mask = attention_mask[..., None].astype(np.float32)
    summed = np.sum(token_embeddings * mask, axis=1)
    counts = np.clip(mask.sum(axis=1), 1e-9, None)
    mean_pooled = summed / counts

    norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
    return (mean_pooled / np.clip(norms, 1e-12, None)).astype(np.float32)


def encode_text(text: str) -> list[float]:
    """Embed one normalized-text value for database storage."""
    return encode_texts([text])[0].tolist()
